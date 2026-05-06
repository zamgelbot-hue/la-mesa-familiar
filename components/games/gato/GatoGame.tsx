// 📍 Ruta del archivo: components/games/gato/GatoGame.tsx

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import RoomChat from "@/components/RoomChat";
import GameResultOverlay from "@/components/games/core/GameResultOverlay";
import { returnToRoom } from "@/lib/games/gameNavigation";
import {
  fetchGatoGameState,
  fetchGatoPlayers,
  fetchGatoRoomStatus,
  updateGatoRoomStatus,
  upsertGatoGameState,
} from "./gatoQueries";
import {
  DEFAULT_STATE,
  buildFreshState,
  checkGatoWinner,
  getModeConfig,
  getPlayerStorageKey,
  normalizeGatoState,
  playGatoSound,
  sortGatoPlayers,
  type GatoGameProps,
  type GatoState,
  type RoomPlayer,
} from "./utils";
import {
  GATO_BOT_NAME,
  getBestGatoBotMove,
  withGatoBotPlayer,
} from "./gatoBot";
import { awardGatoMatchRewardsIfNeeded } from "./gatoRewards";
import GatoHeader from "./GatoHeader";
import GatoPlayerCard from "./GatoPlayerCard";
import GatoBoard from "./GatoBoard";
import GatoTurnPanel from "./GatoTurnPanel";
import GatoResultSummary from "./GatoResultSummary";

function detectStoredPlayerName(roomCode: string) {
  if (typeof window === "undefined") return "";

  const canonicalKey = getPlayerStorageKey(roomCode);
  const raw =
    localStorage.getItem(canonicalKey) || sessionStorage.getItem(canonicalKey);

  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.playerName) return String(parsed.playerName).trim();
    } catch {}
  }

  return "";
}

function persistPlayerName(roomCode: string, playerName: string) {
  if (typeof window === "undefined") return;

  const payload = JSON.stringify({
    roomCode,
    playerName,
    savedAt: new Date().toISOString(),
  });

  localStorage.setItem(getPlayerStorageKey(roomCode), payload);
  sessionStorage.setItem(getPlayerStorageKey(roomCode), payload);
}

export default function GatoGame({
  roomCode,
  roomVariant,
  roomSettings,
}: GatoGameProps) {
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const code = String(roomCode ?? "").toUpperCase();
  const isVsBot = roomSettings?.vs_bot === true || roomVariant === "bot_clasico";

  const { boardSize, winLength, bonusWinLength, modeLabel } = useMemo(
    () => getModeConfig(roomVariant, roomSettings),
    [roomVariant, roomSettings],
  );

  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [gameState, setGameState] = useState<GatoState>(DEFAULT_STATE);
  const [currentPlayerName, setCurrentPlayerName] = useState("");
  const [roomStatus, setRoomStatus] = useState("playing");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const awardingRef = useRef(false);
  const lastEndSoundKeyRef = useRef("");
  const botMoveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sortedRealPlayers = useMemo(() => sortGatoPlayers(players), [players]);

  const sortedPlayers = useMemo(() => {
    return withGatoBotPlayer(sortedRealPlayers, code, isVsBot);
  }, [sortedRealPlayers, code, isVsBot]);

  const currentPlayer = useMemo(() => {
    return (
      sortedRealPlayers.find((player) => player.player_name === currentPlayerName) ??
      null
    );
  }, [sortedRealPlayers, currentPlayerName]);

  const isHost = !!currentPlayer?.is_host;
  const bothPlayersPresent = isVsBot
    ? sortedRealPlayers.length >= 1
    : sortedPlayers.length >= 2;

  const mySymbol = currentPlayerName ? gameState.symbols?.[currentPlayerName] : null;
  const isMyTurn = gameState.current_turn === currentPlayerName;

  const needsIdentitySelection =
    sortedRealPlayers.length > 0 &&
    (!currentPlayerName ||
      !sortedRealPlayers.some(
        (player) => player.player_name === currentPlayerName,
      ));

  const fetchPlayers = useCallback(async () => {
    const list = await fetchGatoPlayers({
      supabase,
      roomCode: code,
    });

    setPlayers(list);

    const storedName = detectStoredPlayerName(code);
    if (storedName && list.some((player) => player.player_name === storedName)) {
      setCurrentPlayerName(storedName);
    }

    return list;
  }, [supabase, code]);

  const fetchRoom = useCallback(async () => {
    const status = await fetchGatoRoomStatus({
      supabase,
      roomCode: code,
    });

    setRoomStatus(status);
    return status;
  }, [supabase, code]);

  const writeGameState = useCallback(
    async (nextState: GatoState) => {
      const saved = await upsertGatoGameState({
        supabase,
        roomCode: code,
        state: nextState,
      });

      if (saved) {
        setGameState(nextState);
      }

      return saved;
    },
    [supabase, code],
  );

  const refreshGameState = useCallback(async () => {
    const incoming = await fetchGatoGameState({
      supabase,
      roomCode: code,
    });

    if (!incoming) return;
    if (incoming.game_slug !== "gato") return;

    setGameState(
      normalizeGatoState({
        incoming,
        boardSize,
        winLength,
        bonusWinLength,
      }),
    );
  }, [supabase, code, boardSize, winLength, bonusWinLength]);

  const ensureGameStateRow = useCallback(
    async (playerList: RoomPlayer[]) => {
      const gamePlayers = withGatoBotPlayer(playerList, code, isVsBot);
      const existing = await fetchGatoGameState({
        supabase,
        roomCode: code,
      });

      const hasBotInState =
        existing?.symbols &&
        Object.prototype.hasOwnProperty.call(existing.symbols, GATO_BOT_NAME);

      if (
        existing?.game_slug === "gato" &&
        existing.board_size === boardSize &&
        existing.win_length === winLength &&
        (!isVsBot || hasBotInState)
      ) {
        setGameState(
          normalizeGatoState({
            incoming: existing,
            boardSize,
            winLength,
            bonusWinLength,
          }),
        );
        return;
      }

      const fresh = buildFreshState(
        gamePlayers,
        boardSize,
        winLength,
        bonusWinLength,
      );

      await writeGameState(fresh);
    },
    [
      supabase,
      code,
      isVsBot,
      boardSize,
      winLength,
      bonusWinLength,
      writeGameState,
    ],
  );

  const updateGameState = useCallback(
    async (updater: (prev: GatoState) => GatoState) => {
      const incoming = await fetchGatoGameState({
        supabase,
        roomCode: code,
      });

      const previous = normalizeGatoState({
        incoming,
        boardSize,
        winLength,
        bonusWinLength,
      });

      const next = updater(previous);
      await writeGameState(next);
    },
    [supabase, code, boardSize, winLength, bonusWinLength, writeGameState],
  );

  const awardRewardsIfNeeded = useCallback(
    async (state: GatoState) => {
      if (!isHost) return;
      if (!state.match_over) return;
      if (state.rewards_applied) return;
      if (awardingRef.current) return;

      try {
        awardingRef.current = true;

        const applied = await awardGatoMatchRewardsIfNeeded({
          supabase,
          state,
          players: sortedPlayers,
          realPlayers: sortedRealPlayers,
          isVsBot,
        });

        if (applied) {
          await updateGameState((prev) => ({
            ...prev,
            rewards_applied: true,
          }));
        }
      } finally {
        awardingRef.current = false;
      }
    },
    [
      isHost,
      supabase,
      sortedPlayers,
      sortedRealPlayers,
      isVsBot,
      updateGameState,
    ],
  );

  const handleCellClick = async (index: number) => {
    setMessage("");

    if (!bothPlayersPresent) {
      playGatoSound("error");
      setMessage("Esperando al segundo jugador.");
      return;
    }

    if (!currentPlayerName || !currentPlayer) {
      playGatoSound("error");
      setMessage("Selecciona tu jugador primero.");
      return;
    }

    if (gameState.match_over) {
      playGatoSound("error");
      setMessage("La partida ya terminó.");
      return;
    }

    if (!isMyTurn) {
      playGatoSound("error");
      setMessage(
        gameState.current_turn === GATO_BOT_NAME
          ? "Es turno del bot."
          : "Todavía no es tu turno.",
      );
      return;
    }

    if (gameState.board[index]) {
      playGatoSound("error");
      setMessage("Esa casilla ya está ocupada.");
      return;
    }

    playGatoSound("tap");

    await updateGameState((prev) => {
      if (prev.match_over) return prev;
      if (prev.current_turn !== currentPlayerName) return prev;
      if (prev.board[index]) return prev;

      const symbol = prev.symbols[currentPlayerName];
      if (!symbol) return prev;

      const nextBoard = [...prev.board];
      nextBoard[index] = symbol;

      const winnerResult = checkGatoWinner(
        nextBoard,
        prev.board_size,
        prev.win_length,
        prev.bonus_win_length,
      );

      if (winnerResult?.symbol) {
        return {
          ...prev,
          board: nextBoard,
          winner: currentPlayerName,
          winner_symbol: winnerResult.symbol,
          winning_line: winnerResult.line,
          is_draw: false,
          match_over: true,
          is_bonus_win: winnerResult.isBonus,
          result_text: winnerResult.isBonus
            ? `🔥 ${currentPlayerName} hizo victoria perfecta`
            : `${currentPlayerName} ganó la partida`,
        };
      }

      const draw = nextBoard.every(Boolean);

      if (draw) {
        return {
          ...prev,
          board: nextBoard,
          current_turn: null,
          is_draw: true,
          match_over: true,
          result_text: "Empate",
        };
      }

      const nextTurn =
        sortedPlayers.find((player) => player.player_name !== currentPlayerName)
          ?.player_name ?? null;

      return {
        ...prev,
        board: nextBoard,
        current_turn: nextTurn,
      };
    });
  };

  const goBackToRoom = useCallback(async () => {
    const fresh = buildFreshState(
      sortedPlayers,
      boardSize,
      winLength,
      bonusWinLength,
    );

    await updateGatoRoomStatus({
      supabase,
      roomCode: code,
      status: "waiting",
    });

    await supabase
      .from("rooms")
      .update({ started_at: null })
      .eq("code", code);

    await supabase
      .from("room_players")
      .update({ is_ready: false })
      .eq("room_code", code);

    await supabase
      .from("room_messages")
      .delete()
      .eq("room_code", code)
      .eq("context", "game");

    await writeGameState(fresh);

    returnToRoom({
      router,
      roomCode: code,
    });
  }, [
    sortedPlayers,
    boardSize,
    winLength,
    bonusWinLength,
    supabase,
    code,
    writeGameState,
    router,
  ]);

  const handleRematch = async () => {
    if (!currentPlayerName) return;

    if (isVsBot) {
      await updateGameState(() =>
        buildFreshState(sortedPlayers, boardSize, winLength, bonusWinLength),
      );
      return;
    }

    await updateGameState((prev) => {
      const votes = Array.from(
        new Set([...(prev.rematch_votes ?? []), currentPlayerName]),
      );

      const allAccepted =
        sortedPlayers.length >= 2 &&
        sortedPlayers.every((player) => votes.includes(player.player_name));

      if (allAccepted) {
        return buildFreshState(
          sortedPlayers,
          boardSize,
          winLength,
          bonusWinLength,
        );
      }

      return { ...prev, rematch_votes: votes };
    });
  };

  const handleSelectIdentity = (playerName: string) => {
    persistPlayerName(code, playerName);
    setCurrentPlayerName(playerName);
    playGatoSound("tap");
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setLoading(true);

      const playerList = await fetchPlayers();
      await fetchRoom();
      await ensureGameStateRow(playerList);

      if (mounted) setLoading(false);
    };

    if (code) void init();

    return () => {
      mounted = false;
    };
  }, [code, fetchPlayers, fetchRoom, ensureGameStateRow]);

  useEffect(() => {
    if (!code) return;

    const channel = supabase
      .channel(`gato-game-${code}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_players",
          filter: `room_code=eq.${code}`,
        },
        async () => {
          await fetchPlayers();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_state",
          filter: `room_code=eq.${code}`,
        },
        async () => {
          await refreshGameState();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rooms",
          filter: `code=eq.${code}`,
        },
        async (payload) => {
          const nextStatus = (payload.new as { status?: string } | null)?.status;

          if (nextStatus) {
            setRoomStatus(nextStatus);

            if (nextStatus === "waiting") {
              returnToRoom({
                router,
                roomCode: code,
                replace: true,
              });
            }
          } else {
            await fetchRoom();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, code, fetchPlayers, refreshGameState, fetchRoom, router]);

  useEffect(() => {
    if (!isVsBot) return;
    if (!isHost) return;
    if (gameState.match_over) return;
    if (gameState.current_turn !== GATO_BOT_NAME) return;

    if (botMoveRef.current) {
      clearTimeout(botMoveRef.current);
    }

    botMoveRef.current = setTimeout(async () => {
      await updateGameState((prev) => {
        if (prev.match_over) return prev;
        if (prev.current_turn !== GATO_BOT_NAME) return prev;

        const moveIndex = getBestGatoBotMove({
          board: prev.board,
          boardSize: prev.board_size,
          winLength: prev.win_length,
        });

        if (moveIndex === null) return prev;

        const symbol = prev.symbols[GATO_BOT_NAME];
        if (!symbol) return prev;

        const nextBoard = [...prev.board];
        nextBoard[moveIndex] = symbol;

        const winnerResult = checkGatoWinner(
          nextBoard,
          prev.board_size,
          prev.win_length,
          prev.bonus_win_length,
        );

        if (winnerResult?.symbol) {
          return {
            ...prev,
            board: nextBoard,
            winner: GATO_BOT_NAME,
            winner_symbol: winnerResult.symbol,
            winning_line: winnerResult.line,
            is_draw: false,
            match_over: true,
            is_bonus_win: false,
            result_text: `${GATO_BOT_NAME} ganó la partida`,
          };
        }

        const draw = nextBoard.every(Boolean);

        if (draw) {
          return {
            ...prev,
            board: nextBoard,
            current_turn: null,
            is_draw: true,
            match_over: true,
            result_text: "Empate",
          };
        }

        const nextTurn = sortedRealPlayers[0]?.player_name ?? currentPlayerName ?? null;

        return {
          ...prev,
          board: nextBoard,
          current_turn: nextTurn,
        };
      });
    }, 650);

    return () => {
      if (botMoveRef.current) {
        clearTimeout(botMoveRef.current);
      }
    };
  }, [
    isVsBot,
    isHost,
    gameState.match_over,
    gameState.current_turn,
    updateGameState,
    sortedRealPlayers,
    currentPlayerName,
  ]);

  useEffect(() => {
    void awardRewardsIfNeeded(gameState);
  }, [gameState, awardRewardsIfNeeded]);

  useEffect(() => {
    if (!gameState.match_over) return;

    const soundKey = `${gameState.match_id}:${
      gameState.is_draw ? "draw" : gameState.is_bonus_win ? "bonus" : "win"
    }`;

    if (lastEndSoundKeyRef.current === soundKey) return;
    lastEndSoundKeyRef.current = soundKey;

    if (gameState.is_draw) {
      playGatoSound("draw");
      return;
    }

    if (gameState.is_bonus_win) {
      playGatoSound("bonus");
      return;
    }

    playGatoSound("win");
  }, [
    gameState.match_over,
    gameState.match_id,
    gameState.is_draw,
    gameState.is_bonus_win,
  ]);

  useEffect(() => {
    return () => {
      if (botMoveRef.current) {
        clearTimeout(botMoveRef.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black p-6 text-white">
        <div className="rounded-[32px] border border-orange-500/15 bg-zinc-950/90 p-10 text-center">
          <p className="text-2xl font-bold">Cargando El Gato...</p>
          <p className="mt-2 text-white/60">Preparando tablero.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black p-4 text-white md:p-8">
      <div className="pointer-events-none fixed inset-0 opacity-40">
        <div className="absolute left-1/2 top-0 h-[440px] w-[440px] -translate-x-1/2 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[340px] w-[340px] rounded-full bg-yellow-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl space-y-6">
        <GatoHeader
          roomCode={code}
          roomStatus={roomStatus}
          currentPlayerName={currentPlayerName}
          modeLabel={modeLabel}
          isVsBot={isVsBot}
          onBackToRoom={goBackToRoom}
        />

        {needsIdentitySelection && (
          <section className="rounded-[28px] border border-cyan-400/25 bg-cyan-500/10 p-5">
            <p className="text-lg font-bold text-cyan-200">
              Selecciona qué jugador eres
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {sortedRealPlayers.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => handleSelectIdentity(player.player_name)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left transition hover:bg-white/10"
                >
                  <p className="text-lg font-bold">
                    {player.player_name} {player.is_host ? "👑" : ""}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        {message && (
          <p className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-center font-bold text-yellow-200">
            {message}
          </p>
        )}

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.25fr_0.85fr]">
          <section className="space-y-4 rounded-[32px] border border-white/10 bg-zinc-950/90 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-300/80">
              Jugadores
            </p>

            {sortedPlayers.map((player) => (
              <GatoPlayerCard
                key={player.id}
                player={player}
                currentPlayerName={currentPlayerName}
                symbol={gameState.symbols?.[player.player_name] ?? null}
                isCurrentTurn={gameState.current_turn === player.player_name}
                isWinner={gameState.winner === player.player_name}
              />
            ))}
          </section>

          <section className="rounded-[32px] border border-orange-500/15 bg-zinc-950/90 p-5 shadow-[0_0_40px_rgba(249,115,22,0.05)]">
            <div className="mb-5 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-300/80">
                Tablero {gameState.board_size}x{gameState.board_size}
              </p>

              <h2 className="mt-2 text-3xl font-extrabold">
                {gameState.match_over
                  ? gameState.result_text
                  : isMyTurn
                    ? "Tu turno"
                    : gameState.current_turn === GATO_BOT_NAME
                      ? "El bot está pensando..."
                      : gameState.current_turn
                        ? `Turno de ${gameState.current_turn}`
                        : "Preparando turno"}
              </h2>

              <p className="mt-2 text-sm text-white/55">
                Gana conectando {gameState.win_length}
                {gameState.bonus_win_length
                  ? ` · Bonus conectando ${gameState.bonus_win_length}`
                  : ""}
              </p>
            </div>

            <GatoBoard
              board={gameState.board}
              boardSize={gameState.board_size}
              winningLine={gameState.winning_line}
              disabled={
                !bothPlayersPresent ||
                needsIdentitySelection ||
                !isMyTurn ||
                gameState.match_over
              }
              onCellClick={handleCellClick}
            />
          </section>

          <aside className="space-y-6">
            <GatoTurnPanel
              state={gameState}
              currentPlayerName={currentPlayerName}
              isVsBot={isVsBot}
            />

            <GatoResultSummary state={gameState} players={sortedPlayers} />
          </aside>
        </div>
      </div>

      <GameResultOverlay
        show={gameState.match_over}
        tone={
          gameState.is_draw
            ? "draw"
            : gameState.winner === currentPlayerName
              ? "win"
              : gameState.winner === GATO_BOT_NAME
                ? "lose"
                : "neutral"
        }
        title={
          gameState.is_draw
            ? "Empate"
            : gameState.is_bonus_win
              ? "¡Victoria perfecta!"
              : gameState.winner === currentPlayerName
                ? "¡Ganaste!"
                : gameState.winner === GATO_BOT_NAME
                  ? "Ganó el bot"
                  : "Partida terminada"
        }
        subtitle={
          gameState.is_draw
            ? "El tablero se llenó sin completar una línea ganadora."
            : isVsBot && gameState.winner === GATO_BOT_NAME
              ? "El Bot Familiar ganó esta vez. Intenta la revancha."
              : isVsBot
                ? "Ganaste contra el bot."
                : gameState.is_bonus_win
                  ? "Conectó 7 en línea y ganó bonus extra."
                  : `Ganó conectando ${gameState.win_length} en línea con ${gameState.winner_symbol}.`
        }
        winnerName={gameState.is_draw ? null : gameState.winner}
        resultText={gameState.result_text ?? undefined}
        pointsText={
          isVsBot && gameState.winner === currentPlayerName
            ? "Recibiste 1 punto si el cooldown ya terminó."
            : gameState.is_bonus_win
              ? "Victoria bonus: +7 puntos base."
              : undefined
        }
        primaryActionLabel="Volver a sala"
        secondaryActionLabel="Revancha"
        onPrimaryAction={goBackToRoom}
        onSecondaryAction={handleRematch}
      />

      <RoomChat
        roomCode={code}
        context="game"
        currentPlayerName={currentPlayerName}
        currentUserId={currentPlayer?.user_id ?? null}
        isGuest={currentPlayer?.is_guest ?? true}
      />
    </main>
  );
}