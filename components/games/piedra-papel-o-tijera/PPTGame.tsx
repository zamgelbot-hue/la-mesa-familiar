// 📍 Ruta del archivo: components/games/piedra-papel-o-tijera/PPTGame.tsx

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { applyHeadToHeadMatchRewards } from "@/lib/gameRewards";
import RoomChat from "@/components/RoomChat";
import {
  GamePageLayout,
  GameResultOverlay,
} from "@/components/games/core";
import PPTChoiceButtons from "./PPTChoiceButtons";
import PPTHeader from "./PPTHeader";
import PPTLiveSummary from "./PPTLiveSummary";
import PPTPlayerCard from "./PPTPlayerCard";
import { BOT_PLAYER_NAME, getRandomBotChoice, withBotPlayer } from "./pptBot";
import { applyBotWinReward } from "./pptRewards";
import {
  fetchPPTGameState,
  fetchPPTPlayers,
  fetchPPTProfilesMap,
  fetchPPTRoomStatus,
  upsertPPTGameState,
} from "./pptQueries";
import { detectStoredPlayerName, persistPlayerName } from "./pptStorage";
import type { Choice, GameState, PPTGameProps, ProfileMap, RoomPlayer } from "./pptTypes";
import { DEFAULT_STATE, buildFreshState, getModeConfig, getRoundOutcome, playPPTSfx } from "./pptUtils";

export default function PPTGame({
  roomCode,
  roomVariant,
  roomSettings,
}: PPTGameProps) {
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const code = String(roomCode ?? "").toUpperCase();
  const isVsBot = roomSettings?.vs_bot === true || roomVariant === "bot_bo3";

  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [profilesMap, setProfilesMap] = useState<ProfileMap>({});
  const [gameState, setGameState] = useState<GameState>(DEFAULT_STATE);
  const [currentPlayerName, setCurrentPlayerName] = useState("");
  const [roomStatus, setRoomStatus] = useState("playing");
  const [loading, setLoading] = useState(true);

  const [roundPopup, setRoundPopup] = useState<{
    visible: boolean;
    title: string;
    subtitle: string;
    accent: "orange" | "yellow" | "emerald";
  }>({
    visible: false,
    title: "",
    subtitle: "",
    accent: "orange",
  });

  const autoAdvanceRef = useRef<NodeJS.Timeout | null>(null);
  const botMoveRef = useRef<NodeJS.Timeout | null>(null);
  const resolvingRoundRef = useRef(false);
  const lastResolvedKeyRef = useRef("");

  const { roundsToWin, modeLabel, variantLabel } = useMemo(
    () => getModeConfig(roomVariant, roomSettings),
    [roomVariant, roomSettings],
  );

  const modeDescription = useMemo(() => {
    if (isVsBot) return "Contra bot familiar";
    return `Gana quien llegue a ${roundsToWin} ronda${roundsToWin !== 1 ? "s" : ""}`;
  }, [isVsBot, roundsToWin]);

  const sortedRealPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      if (a.is_host && !b.is_host) return -1;
      if (!a.is_host && b.is_host) return 1;
      return a.created_at.localeCompare(b.created_at);
    });
  }, [players]);

  const sortedPlayers = useMemo(() => {
    return withBotPlayer(sortedRealPlayers, code, isVsBot);
  }, [sortedRealPlayers, code, isVsBot]);

  const hostPlayer = useMemo(() => {
    return sortedRealPlayers.find((player) => player.is_host) ?? null;
  }, [sortedRealPlayers]);

  const currentPlayer = useMemo(() => {
    return sortedRealPlayers.find((player) => player.player_name === currentPlayerName) ?? null;
  }, [sortedRealPlayers, currentPlayerName]);

  const isHost = hostPlayer?.player_name === currentPlayerName;

  const bothPlayersPresent = isVsBot
    ? sortedRealPlayers.length >= 1
    : sortedPlayers.length >= 2;

  const opponentName = useMemo(() => {
    if (isVsBot) return BOT_PLAYER_NAME;
    return sortedPlayers.find((player) => player.player_name !== currentPlayerName)?.player_name ?? "";
  }, [isVsBot, sortedPlayers, currentPlayerName]);

  const myChoice = gameState.playerChoices?.[currentPlayerName] ?? null;
  const bothChoicesSubmitted = useMemo(() => {
    if (sortedPlayers.length < 2) return false;

    const playerOne = sortedPlayers[0]?.player_name;
    const playerTwo = sortedPlayers[1]?.player_name;

    if (!playerOne || !playerTwo) return false;

    return Boolean(gameState.playerChoices?.[playerOne] && gameState.playerChoices?.[playerTwo]);
  }, [sortedPlayers, gameState.playerChoices]);

  const shouldRevealChoices =
    bothChoicesSubmitted || !!gameState.roundWinner || gameState.matchOver;

  const needsIdentitySelection =
    sortedRealPlayers.length > 0 &&
    (!currentPlayerName ||
      !sortedRealPlayers.some((player) => player.player_name === currentPlayerName));

  const loadPlayers = useCallback(async () => {
    const list = await fetchPPTPlayers({ supabase, roomCode: code });
    setPlayers(list);

    const nextProfilesMap = await fetchPPTProfilesMap({ supabase, players: list });
    setProfilesMap(nextProfilesMap);

    const storedName = detectStoredPlayerName(code);
    const nextPlayerName = list.some((player) => player.player_name === storedName)
      ? storedName
      : "";

    setCurrentPlayerName(nextPlayerName);
    return list;
  }, [supabase, code]);

  const loadRoomStatus = useCallback(async () => {
    const status = await fetchPPTRoomStatus({ supabase, roomCode: code });
    setRoomStatus(status);
    return status;
  }, [supabase, code]);

  const loadGameState = useCallback(async () => {
    const state = await fetchPPTGameState({ supabase, roomCode: code });

    if (!state) return null;

    const merged: GameState = {
      ...DEFAULT_STATE,
      ...state,
    };

    setGameState(merged);
    return merged;
  }, [supabase, code]);

  const ensureGameState = useCallback(
    async (playerList: RoomPlayer[]) => {
      const gamePlayers = withBotPlayer(playerList, code, isVsBot);
      const existingState = await fetchPPTGameState({ supabase, roomCode: code });

      const hasBotInState =
        existingState?.playerChoices &&
        Object.prototype.hasOwnProperty.call(existingState.playerChoices, BOT_PLAYER_NAME);

      if (existingState && (!isVsBot || hasBotInState)) {
        const merged: GameState = {
          ...DEFAULT_STATE,
          ...existingState,
        };

        setGameState(merged);
        return merged;
      }

      const freshState = buildFreshState(gamePlayers);

      await upsertPPTGameState({
        supabase,
        roomCode: code,
        state: freshState,
      });

      setGameState(freshState);
      return freshState;
    },
    [supabase, code, isVsBot],
  );

  const updateGameState = useCallback(
    async (updater: (prev: GameState) => GameState) => {
      const freshState = await fetchPPTGameState({ supabase, roomCode: code });
      const previousState: GameState = {
        ...DEFAULT_STATE,
        ...((freshState as Partial<GameState> | null) ?? {}),
      };

      const nextState = updater(previousState);

      await upsertPPTGameState({
        supabase,
        roomCode: code,
        state: nextState,
      });

      setGameState(nextState);
      return nextState;
    },
    [supabase, code],
  );

  const refreshProfiles = useCallback(async () => {
    const nextProfilesMap = await fetchPPTProfilesMap({
      supabase,
      players: sortedRealPlayers,
    });

    setProfilesMap(nextProfilesMap);
  }, [supabase, sortedRealPlayers]);

  const awardPoints = useCallback(
    async (championName: string | null) => {
      if (!championName) return;

      if (isVsBot) {
        const humanPlayer = sortedRealPlayers.find(
          (player) => player.player_name === championName,
        );

        if (!humanPlayer) return;

        await applyBotWinReward({
          supabase,
          userId: humanPlayer.user_id,
        });

        await refreshProfiles();
        return;
      }

      if (sortedRealPlayers.length < 2) return;

      const winner = sortedRealPlayers.find(
        (player) => player.player_name === championName,
      );

      const loser = sortedRealPlayers.find(
        (player) => player.player_name !== championName,
      );

      await applyHeadToHeadMatchRewards({
        supabase,
        winnerUserId: winner?.user_id,
        loserUserId: loser?.user_id,
        gameType: "ppt_human",
      });

      await refreshProfiles();
    },
    [isVsBot, sortedRealPlayers, supabase, refreshProfiles],
  );

  const clearGameChat = useCallback(async () => {
    const { error } = await supabase
      .from("room_messages")
      .delete()
      .eq("room_code", code)
      .eq("context", "game");

    if (error) {
      console.error("Error limpiando chat de partida:", error);
    }
  }, [supabase, code]);

  const resolveRoundIfNeeded = useCallback(async () => {
    if (!isHost) return;
    if (!bothPlayersPresent) return;
    if (gameState.matchOver) return;
    if (gameState.roundWinner) return;
    if (resolvingRoundRef.current) return;

    const playerOne = sortedPlayers[0]?.player_name;
    const playerTwo = sortedPlayers[1]?.player_name;

    if (!playerOne || !playerTwo) return;

    const choiceOne = gameState.playerChoices?.[playerOne];
    const choiceTwo = gameState.playerChoices?.[playerTwo];

    if (!choiceOne || !choiceTwo) return;

    resolvingRoundRef.current = true;
    let championToReward: string | null = null;

    await updateGameState((prev) => {
      const prevChoiceOne = prev.playerChoices?.[playerOne];
      const prevChoiceTwo = prev.playerChoices?.[playerTwo];

      if (!prevChoiceOne || !prevChoiceTwo) return prev;
      if (prev.roundWinner || prev.matchOver) return prev;

      const scores = { ...(prev.scores ?? {}) };
      const outcome = getRoundOutcome(prevChoiceOne, prevChoiceTwo);

      let roundWinner: string | null = null;
      let resultText = "Empate";
      let resultDetail = outcome.detailText;
      let champion: string | null = null;
      let matchOver = false;
      let canAdvanceRound = true;

      if (outcome.winnerSide === "a") {
        roundWinner = playerOne;
        scores[playerOne] = (scores[playerOne] ?? 0) + 1;
        resultText = `${playerOne} gana la ronda`;
      } else if (outcome.winnerSide === "b") {
        roundWinner = playerTwo;
        scores[playerTwo] = (scores[playerTwo] ?? 0) + 1;
        resultText = `${playerTwo} gana la ronda`;
      }

      if ((scores[playerOne] ?? 0) >= roundsToWin) {
        champion = playerOne;
        championToReward = playerOne;
        matchOver = true;
        canAdvanceRound = false;
        resultText = `${playerOne} es el campeón`;
        resultDetail = `${playerOne} gana la partida en formato ${variantLabel.toLowerCase()}`;
      } else if ((scores[playerTwo] ?? 0) >= roundsToWin) {
        champion = playerTwo;
        championToReward = playerTwo;
        matchOver = true;
        canAdvanceRound = false;
        resultText = `${playerTwo} es el campeón`;
        resultDetail = `${playerTwo} gana la partida en formato ${variantLabel.toLowerCase()}`;
      }

      return {
        ...prev,
        scores,
        roundWinner,
        resultText,
        resultDetail,
        champion,
        matchOver,
        canAdvanceRound,
      };
    });

    if (championToReward) {
      await awardPoints(championToReward);
    }

    resolvingRoundRef.current = false;
  }, [
    isHost,
    bothPlayersPresent,
    gameState.matchOver,
    gameState.roundWinner,
    gameState.playerChoices,
    sortedPlayers,
    updateGameState,
    awardPoints,
    roundsToWin,
    variantLabel,
  ]);

  const handleChoice = async (choice: Exclude<Choice, null>) => {
    if (!currentPlayerName) return;
    if (!bothPlayersPresent) return;
    if (needsIdentitySelection) return;
    if (gameState.matchOver) return;
    if (gameState.roundWinner) return;
    if (gameState.playerChoices?.[currentPlayerName]) return;

    playPPTSfx(choice);

    await updateGameState((prev) => {
      if (prev.matchOver || prev.roundWinner) return prev;
      if (prev.playerChoices?.[currentPlayerName]) return prev;

      return {
        ...prev,
        playerChoices: {
          ...(prev.playerChoices ?? {}),
          [currentPlayerName]: choice,
        },
      };
    });
  };

  const handleBackToRoom = useCallback(async () => {
    const freshState = buildFreshState(sortedPlayers);

    const { error: roomError } = await supabase
      .from("rooms")
      .update({
        status: "waiting",
        started_at: null,
        last_activity_at: new Date().toISOString(),
      })
      .eq("code", code);

    if (roomError) {
      console.error("Error actualizando room PPT:", roomError);
    }

    const { error: playersError } = await supabase
      .from("room_players")
      .update({ is_ready: false })
      .eq("room_code", code);

    if (playersError) {
      console.error("Error reseteando ready PPT:", playersError);
    }

    await clearGameChat();

    await upsertPPTGameState({
      supabase,
      roomCode: code,
      state: freshState,
    });

    router.push(`/sala/${code}`);
  }, [sortedPlayers, supabase, code, clearGameChat, router]);

  const handleRematch = async () => {
    if (!currentPlayerName) return;

    if (isVsBot) {
      const freshState = buildFreshState(sortedPlayers);

      await upsertPPTGameState({
        supabase,
        roomCode: code,
        state: freshState,
      });

      setGameState(freshState);
      return;
    }

    await updateGameState((prev) => {
      const votes = Array.from(new Set([...(prev.rematchVotes ?? []), currentPlayerName]));

      const allAccepted =
        sortedPlayers.length >= 2 &&
        sortedPlayers.every((player) => votes.includes(player.player_name));

      if (allAccepted) {
        return buildFreshState(sortedPlayers);
      }

      return {
        ...prev,
        rematchVotes: votes,
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
        const playerList = await loadPlayers();
        await loadRoomStatus();
        await ensureGameState(playerList);
      } catch (error) {
        console.error("Error inicializando PPT:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    if (code) {
      void init();
    }

    return () => {
      mounted = false;
    };
  }, [code, loadPlayers, loadRoomStatus, ensureGameState]);

  useEffect(() => {
    if (!code) return;

    const channel = supabase
      .channel(`game-room-${code}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_players",
          filter: `room_code=eq.${code}`,
        },
        async () => {
          await loadPlayers();
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
          await loadGameState();
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
        async (payload: any) => {
          const nextStatus = (payload.new as { status?: string } | null)?.status;

          if (nextStatus) {
            setRoomStatus(nextStatus);

            if (nextStatus === "waiting") {
              router.push(`/sala/${code}`);
            }

            return;
          }

          await loadRoomStatus();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, code, loadPlayers, loadGameState, loadRoomStatus, router]);

  useEffect(() => {
    if (!isVsBot) return;
    if (!currentPlayerName) return;
    if (!isHost) return;
    if (gameState.matchOver) return;
    if (gameState.roundWinner) return;

    const humanChoice = gameState.playerChoices?.[currentPlayerName];
    const botChoice = gameState.playerChoices?.[BOT_PLAYER_NAME];

    if (!humanChoice || botChoice) return;

    if (botMoveRef.current) {
      clearTimeout(botMoveRef.current);
    }

    botMoveRef.current = setTimeout(async () => {
      await updateGameState((prev) => {
        if (prev.matchOver || prev.roundWinner) return prev;
        if (!prev.playerChoices?.[currentPlayerName]) return prev;
        if (prev.playerChoices?.[BOT_PLAYER_NAME]) return prev;

        return {
          ...prev,
          playerChoices: {
            ...(prev.playerChoices ?? {}),
            [BOT_PLAYER_NAME]: getRandomBotChoice(),
          },
        };
      });
    }, 700);

    return () => {
      if (botMoveRef.current) {
        clearTimeout(botMoveRef.current);
      }
    };
  }, [
    isVsBot,
    currentPlayerName,
    isHost,
    gameState.matchOver,
    gameState.roundWinner,
    gameState.playerChoices,
    updateGameState,
  ]);

  useEffect(() => {
    void resolveRoundIfNeeded();
  }, [resolveRoundIfNeeded]);

  useEffect(() => {
    if (!isHost) return;
    if (!gameState.canAdvanceRound) return;
    if (gameState.matchOver) return;

    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
    }

    autoAdvanceRef.current = setTimeout(async () => {
      await updateGameState((prev) => {
        if (!prev.canAdvanceRound || prev.matchOver) return prev;

        const clearedChoices: Record<string, Choice> = {};

        for (const name of Object.keys(prev.playerChoices ?? {})) {
          clearedChoices[name] = null;
        }

        return {
          ...prev,
          round: prev.round + 1,
          playerChoices: clearedChoices,
          roundWinner: null,
          resultText: null,
          resultDetail: null,
          canAdvanceRound: false,
          rematchVotes: [],
        };
      });
    }, 2200);

    return () => {
      if (autoAdvanceRef.current) {
        clearTimeout(autoAdvanceRef.current);
      }
    };
  }, [isHost, gameState.canAdvanceRound, gameState.matchOver, updateGameState]);

  useEffect(() => {
    return () => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
      if (botMoveRef.current) clearTimeout(botMoveRef.current);
    };
  }, []);

  useEffect(() => {
    const key = [
      gameState.round,
      gameState.roundWinner ?? "none",
      gameState.resultDetail ?? "none",
      gameState.matchOver ? "over" : "live",
    ].join("|");

    if (!gameState.resultText || key === lastResolvedKeyRef.current) return;

    lastResolvedKeyRef.current = key;

    if (gameState.matchOver && gameState.champion) {
      playPPTSfx("victoria");
      return;
    }

    if (gameState.resultText === "Empate") {
      setRoundPopup({
        visible: true,
        title: "Empate",
        subtitle: gameState.resultDetail ?? "Ambos eligieron lo mismo.",
        accent: "yellow",
      });
      playPPTSfx("empate");
    } else {
      const detail = gameState.resultDetail ?? "";

      setRoundPopup({
        visible: true,
        title: gameState.resultText,
        subtitle: detail,
        accent: "orange",
      });

      if (detail.toLowerCase().includes("piedra")) {
        playPPTSfx("piedra");
      } else if (detail.toLowerCase().includes("papel")) {
        playPPTSfx("papel");
      } else if (detail.toLowerCase().includes("tijera")) {
        playPPTSfx("tijera");
      }
    }

    const timer = window.setTimeout(() => {
      setRoundPopup((prev) => ({ ...prev, visible: false }));
    }, 1600);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    gameState.round,
    gameState.roundWinner,
    gameState.resultText,
    gameState.resultDetail,
    gameState.matchOver,
    gameState.champion,
  ]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 p-6 text-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <p className="text-xl font-semibold">Cargando partida...</p>
          <p className="mt-2 text-white/60">Preparando el juego...</p>
        </motion.div>
      </div>
    );
  }

  const choiceButtonsDisabled =
    !bothPlayersPresent ||
    !currentPlayerName ||
    needsIdentitySelection ||
    !!myChoice ||
    !!gameState.roundWinner ||
    gameState.matchOver;

  return (
  <GamePageLayout>
    <PPTHeader
      code={code}
      roomStatus={roomStatus}
      currentPlayerName={currentPlayerName}
      modeLabel={isVsBot ? "Vs Bot" : modeLabel}
      modeDescription={modeDescription}
      isVsBot={isVsBot}
      onBackToRoom={handleBackToRoom}
    />

    <AnimatePresence>
          {needsIdentitySelection && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-3xl border border-cyan-400/25 bg-cyan-500/10 p-5"
            >
              <p className="text-lg font-semibold text-cyan-300">
                Este navegador todavía no sabe qué jugador eres
              </p>
              <p className="mt-1 text-white/70">
                Selecciona tu jugador una sola vez en este navegador.
              </p>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {sortedRealPlayers.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => handleSelectIdentity(player.player_name)}
                    className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4 text-left transition hover:bg-white/15"
                  >
                    <p className="text-lg font-bold">
                      {player.player_name} {player.is_host ? "👑" : ""}
                    </p>
                    <p className="text-sm text-white/60">
                      Usar esta identidad en este navegador
                    </p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!bothPlayersPresent && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-5"
            >
              <p className="text-lg font-semibold text-yellow-300">
                Esperando al segundo jugador...
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {roundPopup.visible && !gameState.matchOver && (
            <motion.div
              initial={{ opacity: 0, y: -24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -18, scale: 0.96 }}
              transition={{ duration: 0.22 }}
              className={`overflow-hidden rounded-3xl border p-5 text-center shadow-[0_0_28px_rgba(249,115,22,0.12)] ${
                roundPopup.accent === "yellow"
                  ? "border-yellow-400/30 bg-yellow-500/10"
                  : roundPopup.accent === "emerald"
                    ? "border-emerald-400/30 bg-emerald-500/10"
                    : "border-orange-400/30 bg-orange-500/10"
              }`}
            >
              <p className="text-sm uppercase tracking-[0.3em] text-orange-200">
                Resultado de ronda
              </p>
              <h2 className="mt-2 text-2xl font-extrabold text-white">
                {roundPopup.title}
              </h2>
              <p className="mt-2 text-white/75">{roundPopup.subtitle}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid gap-4 md:grid-cols-2">
          {sortedPlayers.map((player) => (
            <PPTPlayerCard
              key={player.id}
              player={player}
              currentPlayerName={currentPlayerName}
              profileMap={profilesMap}
              score={gameState.scores?.[player.player_name] ?? 0}
              currentChoice={gameState.playerChoices?.[player.player_name] ?? null}
              shouldRevealChoices={shouldRevealChoices}
              isChampion={gameState.champion === player.player_name}
            />
          ))}
        </div>

        {!gameState.matchOver && (
          <motion.div
            layout
            className="rounded-3xl border border-white/10 bg-white/5 p-5"
          >
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-white/60">
                  Ronda actual
                </p>
                <h2 className="text-2xl font-bold">Ronda {gameState.round}</h2>
                <p className="mt-1 text-sm text-white/60">
                  Formato activo: {isVsBot ? "Vs Bot" : variantLabel}
                </p>
              </div>

              <div className="rounded-2xl bg-black/20 px-4 py-3">
                <p className="text-sm text-white/60">
                  {needsIdentitySelection
                    ? "Primero selecciona tu jugador"
                    : gameState.resultText
                      ? gameState.resultText
                      : myChoice && !shouldRevealChoices
                        ? isVsBot
                          ? "El bot está pensando..."
                          : "Esperando al otro jugador..."
                        : "Haz tu elección"}
                </p>
              </div>
            </div>

            <PPTChoiceButtons
              disabled={choiceButtonsDisabled}
              selectedChoice={myChoice}
              onSelectChoice={handleChoice}
            />

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {sortedPlayers.map((player) => {
                const score = gameState.scores?.[player.player_name] ?? 0;
                const dots = Array.from({ length: roundsToWin });

                return (
                  <div
                    key={`progress-${player.player_name}`}
                    className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-white">
                        {player.player_name}
                      </span>
                      <div className="flex items-center gap-2">
                        {dots.map((_, index) => (
                          <span
                            key={index}
                            className={`h-2.5 w-2.5 rounded-full ${
                              index < score ? "bg-yellow-400" : "bg-white/15"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        <GameResultOverlay
          show={gameState.matchOver}
          tone={
            gameState.champion === currentPlayerName
              ? "win"
              : gameState.champion === BOT_PLAYER_NAME
                ? "lose"
                : "neutral"
          }
          title={
            gameState.champion === currentPlayerName
              ? "¡Ganaste!"
              : gameState.champion === BOT_PLAYER_NAME
                ? "Ganó el bot"
                : "Partida terminada"
          }
          subtitle={
            isVsBot
              ? gameState.champion === BOT_PLAYER_NAME
                ? "El Bot Familiar ganó esta vez. Intenta la revancha."
                : "Ganaste contra el bot."
              : `La partida terminó. Ya tenemos campeón del ${modeLabel.toLowerCase()}.`
          }
          winnerName={gameState.champion}
          resultText={`Marcador final: ${sortedPlayers
            .map(
              (player) =>
                `${player.player_name}: ${gameState.scores?.[player.player_name] ?? 0}`,
            )
            .join(" · ")}`}
          pointsText={
            isVsBot && gameState.champion === currentPlayerName
              ? "Recibiste 1 punto por vencer al bot."
              : undefined
          }
          primaryActionLabel="Volver a sala"
          secondaryActionLabel="Revancha"
          onPrimaryAction={handleBackToRoom}
          onSecondaryAction={handleRematch}
        />

        <PPTLiveSummary
          players={sortedPlayers}
          gameState={gameState}
          modeLabel={isVsBot ? "Vs Bot" : modeLabel}
          shouldRevealChoices={shouldRevealChoices}
        />

      <RoomChat
        roomCode={code}
        context="game"
        currentPlayerName={currentPlayerName}
        currentUserId={currentPlayer?.user_id ?? null}
        isGuest={currentPlayer?.is_guest ?? true}
      />
    </GamePageLayout>
  );
}