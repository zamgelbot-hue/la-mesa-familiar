"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { applyHeadToHeadMatchRewards } from "@/lib/gameRewards";
import RoomChat from "@/components/RoomChat";

type GatoGameProps = {
  roomCode: string;
  roomVariant?: string | null;
  roomSettings?: Record<string, any> | null;
};

type RoomPlayer = {
  id: string;
  room_code: string;
  player_name: string;
  is_host: boolean;
  is_ready: boolean;
  created_at: string;
  user_id: string | null;
  is_guest: boolean;
};

type CellValue = "X" | "O" | null;

type GatoState = {
  game_slug: "gato";
  match_id: string;
  board: CellValue[];
  current_turn: string | null;
  symbols: Record<string, "X" | "O">;
  winner: string | null;
  winner_symbol: "X" | "O" | null;
  winning_line: number[];
  is_draw: boolean;
  match_over: boolean;
  result_text: string | null;
  rewards_applied: boolean;
  rematch_votes: string[];
};

const DEFAULT_STATE: GatoState = {
  game_slug: "gato",
  match_id: "",
  board: Array(9).fill(null),
  current_turn: null,
  symbols: {},
  winner: null,
  winner_symbol: null,
  winning_line: [],
  is_draw: false,
  match_over: false,
  result_text: null,
  rewards_applied: false,
  rematch_votes: [],
};

const WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const getPlayerStorageKey = (roomCode: string) => `lmf:player:${roomCode}`;

function createMatchId() {
  return `gato_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildFreshState(players: RoomPlayer[]): GatoState {
  const sorted = [...players].sort((a, b) => {
    if (a.is_host && !b.is_host) return -1;
    if (!a.is_host && b.is_host) return 1;
    return a.created_at.localeCompare(b.created_at);
  });

  const p1 = sorted[0]?.player_name ?? null;
  const p2 = sorted[1]?.player_name ?? null;

  return {
    ...DEFAULT_STATE,
    match_id: createMatchId(),
    board: Array(9).fill(null),
    current_turn: p1,
    symbols: {
      ...(p1 ? { [p1]: "X" as const } : {}),
      ...(p2 ? { [p2]: "O" as const } : {}),
    },
  };
}

function checkWinner(board: CellValue[]) {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;

    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return {
        symbol: board[a],
        line,
      };
    }
  }

  return null;
}

export default function GatoGame({ roomCode }: GatoGameProps) {
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const code = String(roomCode ?? "").toUpperCase();

  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [gameState, setGameState] = useState<GatoState>(DEFAULT_STATE);
  const [currentPlayerName, setCurrentPlayerName] = useState("");
  const [roomStatus, setRoomStatus] = useState("playing");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const awardingRef = useRef(false);

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      if (a.is_host && !b.is_host) return -1;
      if (!a.is_host && b.is_host) return 1;
      return a.created_at.localeCompare(b.created_at);
    });
  }, [players]);

  const currentPlayer = useMemo(() => {
    return sortedPlayers.find((p) => p.player_name === currentPlayerName) ?? null;
  }, [sortedPlayers, currentPlayerName]);

  const isHost = !!currentPlayer?.is_host;
  const bothPlayersPresent = sortedPlayers.length >= 2;
  const mySymbol = currentPlayerName ? gameState.symbols?.[currentPlayerName] : null;
  const isMyTurn = gameState.current_turn === currentPlayerName;
  const opponent = sortedPlayers.find((p) => p.player_name !== currentPlayerName) ?? null;

  const detectStoredPlayerName = useCallback((roomCode: string) => {
    if (typeof window === "undefined") return "";

    const canonicalKey = getPlayerStorageKey(roomCode);

    const localCanonical = localStorage.getItem(canonicalKey);
    if (localCanonical) {
      try {
        const parsed = JSON.parse(localCanonical);
        if (parsed?.playerName && typeof parsed.playerName === "string") {
          return parsed.playerName.trim();
        }
      } catch {}
    }

    const sessionCanonical = sessionStorage.getItem(canonicalKey);
    if (sessionCanonical) {
      try {
        const parsed = JSON.parse(sessionCanonical);
        if (parsed?.playerName && typeof parsed.playerName === "string") {
          return parsed.playerName.trim();
        }
      } catch {}
    }

    const legacyKeys = [
      `la-mesa-player-name-${roomCode}`,
      `mesa-player-name-${roomCode}`,
      `player_name_${roomCode}`,
      `playerName_${roomCode}`,
      `room_player_name_${roomCode}`,
      `roomPlayerName_${roomCode}`,
      "player_name",
      "playerName",
      "nombreJugador",
    ];

    for (const key of legacyKeys) {
      const value = localStorage.getItem(key);
      if (value?.trim()) return value.trim();
    }

    for (const key of legacyKeys) {
      const value = sessionStorage.getItem(key);
      if (value?.trim()) return value.trim();
    }

    return "";
  }, []);

  const persistPlayerName = useCallback((roomCode: string, playerName: string) => {
    if (typeof window === "undefined") return;

    const value = playerName.trim();
    if (!value) return;

    const payload = JSON.stringify({
      roomCode,
      playerName: value,
      savedAt: new Date().toISOString(),
    });

    localStorage.setItem(getPlayerStorageKey(roomCode), payload);
    sessionStorage.setItem(getPlayerStorageKey(roomCode), payload);
  }, []);

  const fetchPlayers = useCallback(async () => {
    const { data, error } = await supabase
      .from("room_players")
      .select("*")
      .eq("room_code", code)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error cargando jugadores de gato:", error);
      return [];
    }

    const list = (data ?? []) as RoomPlayer[];
    setPlayers(list);

    const storedName = detectStoredPlayerName(code);
    if (storedName && list.some((p) => p.player_name === storedName)) {
      setCurrentPlayerName(storedName);
    }

    return list;
  }, [supabase, code, detectStoredPlayerName]);

  const fetchRoom = useCallback(async () => {
    const { data, error } = await supabase
      .from("rooms")
      .select("status")
      .eq("code", code)
      .maybeSingle();

    if (error) {
      console.error("Error cargando room:", error);
      return;
    }

    if (data?.status) {
      setRoomStatus(data.status);
    }
  }, [supabase, code]);

  const refreshGameState = useCallback(async () => {
    const { data, error } = await supabase
      .from("game_state")
      .select("state")
      .eq("room_code", code)
      .maybeSingle();

    if (error) {
      console.error("Error refrescando gato game_state:", error);
      return;
    }

    if (!data?.state) return;

    const incoming = data.state as Partial<GatoState>;

    if (incoming.game_slug !== "gato") return;

    setGameState({
      ...DEFAULT_STATE,
      ...incoming,
      board: Array.isArray(incoming.board) ? incoming.board : Array(9).fill(null),
      symbols: incoming.symbols ?? {},
      winning_line: incoming.winning_line ?? [],
      rematch_votes: incoming.rematch_votes ?? [],
    });
  }, [supabase, code]);

  const writeGameState = useCallback(
    async (nextState: GatoState) => {
      const { error } = await supabase
        .from("game_state")
        .update({
          state: nextState,
          updated_at: new Date().toISOString(),
        })
        .eq("room_code", code);

      if (error) {
        console.error("Error guardando gato game_state:", error);
        return false;
      }

      setGameState(nextState);
      return true;
    },
    [supabase, code]
  );

  const ensureGameStateRow = useCallback(
    async (playerList: RoomPlayer[]) => {
      const { data, error } = await supabase
        .from("game_state")
        .select("id, state")
        .eq("room_code", code)
        .maybeSingle();

      if (error) {
        console.error("Error consultando game_state:", error);
        return;
      }

      const existing = data?.state as Partial<GatoState> | undefined;

      if (data && existing?.game_slug === "gato") {
        setGameState({
          ...DEFAULT_STATE,
          ...existing,
          board: Array.isArray(existing.board) ? existing.board : Array(9).fill(null),
          symbols: existing.symbols ?? {},
          winning_line: existing.winning_line ?? [],
          rematch_votes: existing.rematch_votes ?? [],
        });
        return;
      }

      const fresh = buildFreshState(playerList);

      if (data) {
        await supabase
          .from("game_state")
          .update({
            state: fresh,
            updated_at: new Date().toISOString(),
          })
          .eq("room_code", code);

        setGameState(fresh);
        return;
      }

      const { error: insertError } = await supabase.from("game_state").insert({
        room_code: code,
        state: fresh,
        updated_at: new Date().toISOString(),
      });

      if (insertError) {
        console.error("Error creando game_state para gato:", insertError);
        await refreshGameState();
        return;
      }

      setGameState(fresh);
    },
    [supabase, code, refreshGameState]
  );

  const updateGameState = useCallback(
    async (updater: (prev: GatoState) => GatoState) => {
      const { data, error } = await supabase
        .from("game_state")
        .select("state")
        .eq("room_code", code)
        .maybeSingle();

      if (error) {
        console.error("Error leyendo gato state:", error);
        return;
      }

      const prevRaw = data?.state as Partial<GatoState> | undefined;

      const prev: GatoState = {
        ...DEFAULT_STATE,
        ...(prevRaw?.game_slug === "gato" ? prevRaw : {}),
        board: Array.isArray(prevRaw?.board) ? prevRaw.board : Array(9).fill(null),
        symbols: prevRaw?.symbols ?? {},
        winning_line: prevRaw?.winning_line ?? [],
        rematch_votes: prevRaw?.rematch_votes ?? [],
      };

      const next = updater(prev);

      await writeGameState(next);
    },
    [supabase, code, writeGameState]
  );

  const awardRewardsIfNeeded = useCallback(
    async (state: GatoState) => {
      if (!isHost) return;
      if (!state.match_over) return;
      if (state.is_draw) return;
      if (!state.winner) return;
      if (state.rewards_applied) return;
      if (awardingRef.current) return;

      const winner = sortedPlayers.find((p) => p.player_name === state.winner);
      const loser = sortedPlayers.find((p) => p.player_name !== state.winner);

      if (!winner || !loser) return;

      try {
        awardingRef.current = true;

        await applyHeadToHeadMatchRewards({
          supabase,
          winnerUserId: winner.user_id,
          loserUserId: loser.user_id,
          gameType: "gato",
        });

        await updateGameState((prev) => ({
          ...prev,
          rewards_applied: true,
        }));
      } catch (error) {
        console.error("Error dando rewards de gato:", error);
      } finally {
        awardingRef.current = false;
      }
    },
    [isHost, sortedPlayers, supabase, updateGameState]
  );

  const handleCellClick = async (index: number) => {
    setMessage("");

    if (!bothPlayersPresent) {
      setMessage("Esperando al segundo jugador.");
      return;
    }

    if (!currentPlayerName || !currentPlayer) {
      setMessage("Selecciona tu jugador primero.");
      return;
    }

    if (gameState.match_over) {
      setMessage("La partida ya terminó.");
      return;
    }

    if (!isMyTurn) {
      setMessage("Todavía no es tu turno.");
      return;
    }

    if (gameState.board[index]) {
      setMessage("Esa casilla ya está ocupada.");
      return;
    }

    await updateGameState((prev) => {
      if (prev.match_over) return prev;
      if (prev.current_turn !== currentPlayerName) return prev;
      if (prev.board[index]) return prev;

      const symbol = prev.symbols[currentPlayerName];
      if (!symbol) return prev;

      const nextBoard = [...prev.board];
      nextBoard[index] = symbol;

      const winnerResult = checkWinner(nextBoard);

      if (winnerResult?.symbol) {
        return {
          ...prev,
          board: nextBoard,
          winner: currentPlayerName,
          winner_symbol: winnerResult.symbol,
          winning_line: winnerResult.line,
          is_draw: false,
          match_over: true,
          result_text: `${currentPlayerName} ganó la partida`,
        };
      }

      const draw = nextBoard.every(Boolean);

      if (draw) {
        return {
          ...prev,
          board: nextBoard,
          current_turn: null,
          winner: null,
          winner_symbol: null,
          winning_line: [],
          is_draw: true,
          match_over: true,
          result_text: "Empate",
        };
      }

      const nextTurn =
        sortedPlayers.find((p) => p.player_name !== currentPlayerName)?.player_name ??
        null;

      return {
        ...prev,
        board: nextBoard,
        current_turn: nextTurn,
      };
    });
  };

  const goBackToRoom = useCallback(async () => {
    const fresh = buildFreshState(sortedPlayers);

    await supabase
      .from("rooms")
      .update({
        status: "waiting",
        started_at: null,
      })
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

    router.push(`/sala/${code}`);
  }, [sortedPlayers, supabase, code, writeGameState, router]);

  const handleRematch = async () => {
    if (!currentPlayerName) return;

    await updateGameState((prev) => {
      const votes = Array.from(new Set([...(prev.rematch_votes ?? []), currentPlayerName]));

      const allAccepted =
        sortedPlayers.length >= 2 &&
        sortedPlayers.every((player) => votes.includes(player.player_name));

      if (allAccepted) {
        return buildFreshState(sortedPlayers);
      }

      return {
        ...prev,
        rematch_votes: votes,
      };
    });
  };

  const handleSelectIdentity = (playerName: string) => {
    persistPlayerName(code, playerName);
    setCurrentPlayerName(playerName);
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setLoading(true);

      try {
        const playerList = await fetchPlayers();
        await fetchRoom();
        await ensureGameStateRow(playerList);
      } finally {
        if (mounted) setLoading(false);
      }
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
        }
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
        }
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
              router.push(`/sala/${code}`);
            }
          } else {
            await fetchRoom();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, code, fetchPlayers, refreshGameState, fetchRoom, router]);

  useEffect(() => {
    void awardRewardsIfNeeded(gameState);
  }, [gameState, awardRewardsIfNeeded]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black p-6 text-white">
        <div className="rounded-[32px] border border-orange-500/15 bg-zinc-950/90 p-10 text-center">
          <p className="text-2xl font-bold">Cargando El Gato...</p>
          <p className="mt-2 text-white/60">Preparando tablero 3x3.</p>
        </div>
      </main>
    );
  }

  const needsIdentitySelection =
    sortedPlayers.length > 0 &&
    (!currentPlayerName ||
      !sortedPlayers.some((player) => player.player_name === currentPlayerName));

  return (
    <main className="min-h-screen bg-black p-4 text-white md:p-8">
      <div className="pointer-events-none fixed inset-0 opacity-40">
        <div className="absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[320px] w-[320px] rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <section className="mb-6 rounded-[32px] border border-orange-500/15 bg-zinc-950/90 p-6 shadow-[0_0_40px_rgba(249,115,22,0.06)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-300/80">
                La Mesa Familiar
              </p>
              <h1 className="mt-2 text-4xl font-extrabold">El Gato</h1>
              <p className="mt-2 text-white/65">
                Sala: <span className="font-bold text-orange-300">{code}</span>
              </p>
              <p className="text-white/65">
                Estado: <span className="font-bold text-white">{roomStatus}</span>
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={goBackToRoom}
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-bold text-white transition hover:bg-white/10"
              >
                Volver a sala
              </button>

              <button
                type="button"
                onClick={goBackToRoom}
                className="rounded-2xl bg-red-500 px-5 py-3 font-bold text-white transition hover:bg-red-400"
              >
                Terminar partida
              </button>
            </div>
          </div>
        </section>

        {needsIdentitySelection && (
          <section className="mb-6 rounded-[28px] border border-cyan-400/25 bg-cyan-500/10 p-5">
            <p className="text-lg font-bold text-cyan-200">
              Este navegador todavía no sabe qué jugador eres
            </p>
            <p className="mt-1 text-white/65">
              Selecciona tu jugador para poder jugar.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {sortedPlayers.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => handleSelectIdentity(player.player_name)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left transition hover:bg-white/10"
                >
                  <p className="text-lg font-bold">
                    {player.player_name} {player.is_host ? "👑" : ""}
                  </p>
                  <p className="text-sm text-white/55">
                    Usar esta identidad en este navegador
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        {!bothPlayersPresent && (
          <section className="mb-6 rounded-[28px] border border-yellow-500/20 bg-yellow-500/10 p-5">
            <p className="text-lg font-bold text-yellow-300">
              Esperando al segundo jugador...
            </p>
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[32px] border border-white/10 bg-zinc-950/90 p-5">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-orange-300/80">
              Jugadores
            </p>

            <div className="space-y-4">
              {sortedPlayers.map((player) => {
                const symbol = gameState.symbols?.[player.player_name] ?? "?";
                const active = gameState.current_turn === player.player_name;
                const winner = gameState.winner === player.player_name;
                const isMe = player.player_name === currentPlayerName;

                return (
                  <div
                    key={player.id}
                    className={`rounded-3xl border p-5 transition ${
                      winner
                        ? "border-yellow-400/40 bg-yellow-500/10 shadow-[0_0_28px_rgba(250,204,21,0.12)]"
                        : active
                        ? "border-orange-400/40 bg-orange-500/10 shadow-[0_0_28px_rgba(249,115,22,0.12)]"
                        : isMe
                        ? "border-emerald-400/35 bg-emerald-500/10"
                        : "border-white/10 bg-white/[0.03]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xl font-bold">
                          {player.player_name} {player.is_host ? "👑" : ""}
                        </p>
                        <p className="mt-1 text-sm text-white/55">
                          {isMe ? "Tú" : "Rival"} · Ficha {symbol}
                        </p>
                      </div>

                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black/40 text-3xl font-black text-orange-300">
                        {symbol}
                      </div>
                    </div>

                    {active && !gameState.match_over && (
                      <p className="mt-3 rounded-2xl border border-orange-500/20 bg-orange-500/10 px-3 py-2 text-sm font-bold text-orange-200">
                        Turno actual
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-5 rounded-3xl border border-white/10 bg-black/30 p-4">
              <p className="text-sm text-white/55">Tu jugador</p>
              <p className="mt-1 text-lg font-bold text-emerald-300">
                {currentPlayerName || "No seleccionado"}
              </p>
              <p className="mt-3 text-sm text-white/55">Tu ficha</p>
              <p className="mt-1 text-3xl font-black text-orange-300">
                {mySymbol ?? "-"}
              </p>
            </div>
          </section>

          <section className="rounded-[32px] border border-orange-500/15 bg-zinc-950/90 p-5 shadow-[0_0_40px_rgba(249,115,22,0.05)]">
            <div className="mb-5 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-300/80">
                Tablero 3x3
              </p>

              <h2 className="mt-2 text-3xl font-extrabold">
                {gameState.match_over
                  ? gameState.result_text
                  : isMyTurn
                  ? "Tu turno"
                  : gameState.current_turn
                  ? `Turno de ${gameState.current_turn}`
                  : "Preparando turno"}
              </h2>

              {message && (
                <p className="mt-3 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-2 text-yellow-200">
                  {message}
                </p>
              )}
            </div>

            <div className="mx-auto grid max-w-md grid-cols-3 gap-3">
              {gameState.board.map((cell, index) => {
                const isWinningCell = gameState.winning_line.includes(index);

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleCellClick(index)}
                    disabled={
                      !bothPlayersPresent ||
                      needsIdentitySelection ||
                      !isMyTurn ||
                      !!cell ||
                      gameState.match_over
                    }
                    className={`aspect-square rounded-3xl border text-6xl font-black transition md:text-7xl ${
                      isWinningCell
                        ? "border-yellow-400 bg-yellow-500/15 text-yellow-300 shadow-[0_0_28px_rgba(250,204,21,0.18)]"
                        : cell === "X"
                        ? "border-orange-500/35 bg-orange-500/10 text-orange-300"
                        : cell === "O"
                        ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-200"
                        : "border-white/10 bg-white/[0.04] text-white hover:border-orange-500/35 hover:bg-orange-500/10"
                    } disabled:cursor-not-allowed disabled:opacity-80`}
                  >
                    {cell}
                  </button>
                );
              })}
            </div>

            {gameState.match_over && (
              <div className="mt-6 rounded-[28px] border border-yellow-400/25 bg-yellow-500/10 p-5 text-center">
                <p className="text-sm uppercase tracking-[0.24em] text-yellow-300">
                  Resultado
                </p>

                <h3 className="mt-2 text-3xl font-extrabold text-white">
                  {gameState.is_draw ? "🤝 Empate" : `👑 ${gameState.winner}`}
                </h3>

                <p className="mt-2 text-white/70">
                  {gameState.is_draw
                    ? "Se llenó el tablero sin ganador."
                    : `Ganó con ${gameState.winner_symbol}.`}
                </p>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <button
                    type="button"
                    onClick={handleRematch}
                    className="rounded-2xl bg-emerald-500 px-6 py-3 font-bold text-black transition hover:bg-emerald-400"
                  >
                    Revancha
                  </button>

                  <button
                    type="button"
                    onClick={goBackToRoom}
                    className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 font-bold text-white transition hover:bg-white/10"
                  >
                    Volver a sala
                  </button>
                </div>

                <p className="mt-4 text-sm text-white/55">
                  Votos de revancha: {gameState.rematch_votes?.length ?? 0}/
                  {Math.max(sortedPlayers.length, 2)}
                </p>
              </div>
            )}
          </section>
        </div>
      </div>

      <RoomChat
        roomCode={code}
        context="game"
        title="Chat de partida"
        currentPlayerName={currentPlayerName}
        currentUserId={currentPlayer?.user_id ?? null}
        isGuest={currentPlayer?.is_guest ?? true}
      />
    </main>
  );
}
