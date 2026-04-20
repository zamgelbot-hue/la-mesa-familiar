"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getAvatarByKey, getFrameByKey } from "@/lib/profileCosmetics";
import RoomChat from "@/components/RoomChat";
import type { Choice, GameState, PPTGameProps, ProfileMap, RoomPlayer } from "./pptTypes";
import {
  DEFAULT_STATE,
  buildFreshState,
  getModeConfig,
  getPlayerStorageKey,
  getRoundOutcome,
  playPPTSfx,
} from "./pptUtils";

export default function PPTGame({
  roomCode,
  roomVariant,
  roomSettings,
}: PPTGameProps) {
  const router = useRouter();
  const supabase = createClient();

  const code = String(roomCode ?? "").toUpperCase();

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
  }>({
    visible: false,
    title: "",
    subtitle: "",
  });

  const autoAdvanceRef = useRef<NodeJS.Timeout | null>(null);
  const resolvingRoundRef = useRef(false);
  const lastResolvedKeyRef = useRef("");
  const lastChampionRef = useRef<string | null>(null);

  const { bestOf, roundsToWin, modeLabel, variantLabel } = useMemo(
    () => getModeConfig(roomVariant, roomSettings),
    [roomVariant, roomSettings]
  );

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      if (a.is_host && !b.is_host) return -1;
      if (!a.is_host && b.is_host) return 1;
      return a.created_at.localeCompare(b.created_at);
    });
  }, [players]);

  const bothPlayersPresent = sortedPlayers.length >= 2;

  const hostPlayer = useMemo(() => {
    return sortedPlayers.find((p) => p.is_host) ?? null;
  }, [sortedPlayers]);

  const currentPlayer = useMemo(() => {
    return sortedPlayers.find((p) => p.player_name === currentPlayerName) ?? null;
  }, [sortedPlayers, currentPlayerName]);

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
      if (value && value.trim()) return value.trim();
    }

    for (const key of legacyKeys) {
      const value = sessionStorage.getItem(key);
      if (value && value.trim()) return value.trim();
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
      localStorage.setItem(key, value);
      sessionStorage.setItem(key, value);
    }
  }, []);

  const resolveCurrentPlayerName = useCallback(
    (playerList: RoomPlayer[]) => {
      const storedName = detectStoredPlayerName(code);

      if (
        storedName &&
        playerList.some((player) => player.player_name === storedName)
      ) {
        return storedName;
      }

      return "";
    },
    [code, detectStoredPlayerName]
  );

  const isHost = useMemo(() => {
    return hostPlayer?.player_name === currentPlayerName;
  }, [hostPlayer, currentPlayerName]);

  const opponentName = useMemo(() => {
    return sortedPlayers.find((p) => p.player_name !== currentPlayerName)?.player_name ?? "";
  }, [sortedPlayers, currentPlayerName]);

  const myChoice = gameState.playerChoices?.[currentPlayerName] ?? null;
  const opponentChoice = gameState.playerChoices?.[opponentName] ?? null;

  const bothChoicesSubmitted = useMemo(() => {
    if (sortedPlayers.length < 2) return false;

    const p1 = sortedPlayers[0]?.player_name;
    const p2 = sortedPlayers[1]?.player_name;

    if (!p1 || !p2) return false;

    return Boolean(gameState.playerChoices?.[p1] && gameState.playerChoices?.[p2]);
  }, [sortedPlayers, gameState.playerChoices]);

  const shouldRevealChoices =
    bothChoicesSubmitted || !!gameState.roundWinner || !!gameState.matchOver;

  const fetchProfilesForPlayers = useCallback(
    async (playerList: RoomPlayer[]) => {
      try {
        const userIds = Array.from(
          new Set(playerList.map((p) => p.user_id).filter(Boolean))
        ) as string[];

        if (userIds.length === 0) {
          setProfilesMap({});
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_key, frame_key, points, games_played, games_won, games_lost")
          .in("id", userIds);

        if (error) {
          console.error("Error cargando perfiles del juego:", error);
          setProfilesMap({});
          return;
        }

        const nextMap: ProfileMap = {};
        for (const profile of data ?? []) {
          nextMap[profile.id] = {
            display_name: profile.display_name,
            avatar_key: profile.avatar_key,
            frame_key: profile.frame_key,
            points: profile.points,
            games_played: profile.games_played,
            games_won: profile.games_won,
            games_lost: profile.games_lost,
          };
        }

        setProfilesMap(nextMap);
      } catch (error) {
        console.error("Error inesperado cargando perfiles del juego:", error);
        setProfilesMap({});
      }
    },
    [supabase]
  );

  const fetchPlayers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("room_players")
        .select("*")
        .eq("room_code", code)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error cargando jugadores:", error);
        return [];
      }

      const list = (data ?? []) as RoomPlayer[];
      setPlayers(list);
      await fetchProfilesForPlayers(list);

      const resolvedName = resolveCurrentPlayerName(list);
      setCurrentPlayerName(resolvedName);

      return list;
    } catch (error) {
      console.error("Error inesperado cargando jugadores:", error);
      return [];
    }
  }, [supabase, code, resolveCurrentPlayerName, fetchProfilesForPlayers]);

  const fetchRoom = useCallback(async () => {
    try {
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
    } catch (error) {
      console.error("Error inesperado cargando room:", error);
    }
  }, [supabase, code]);

  const ensureGameStateRow = useCallback(
    async (playerList: RoomPlayer[]) => {
      try {
        const { data, error } = await supabase
          .from("game_state")
          .select("id, state")
          .eq("room_code", code)
          .maybeSingle();

        if (error) {
          console.error("Error consultando game_state:", error);
          return;
        }

        if (data) {
          const merged: GameState = {
            ...DEFAULT_STATE,
            ...(data.state as Partial<GameState>),
          };
          setGameState(merged);
          return;
        }

        const fresh = buildFreshState(playerList);

        const { error: insertError } = await supabase.from("game_state").insert({
          room_code: code,
          state: fresh,
          updated_at: new Date().toISOString(),
        });

        if (insertError) {
          console.error("Error creando game_state:", insertError);

          const { data: retryData, error: retryError } = await supabase
            .from("game_state")
            .select("id, state")
            .eq("room_code", code)
            .maybeSingle();

          if (retryError) {
            console.error("Error releyendo game_state tras conflicto:", retryError);
            return;
          }

          if (retryData?.state) {
            const mergedRetry: GameState = {
              ...DEFAULT_STATE,
              ...(retryData.state as Partial<GameState>),
            };
            setGameState(mergedRetry);
          }
          return;
        }

        setGameState(fresh);
      } catch (error) {
        console.error("Error inesperado asegurando game_state:", error);
      }
    },
    [supabase, code]
  );

  const refreshGameState = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("game_state")
        .select("state")
        .eq("room_code", code)
        .maybeSingle();

      if (error) {
        console.error("Error refrescando game_state:", error);
        return;
      }

      if (!data?.state) return;

      const merged: GameState = {
        ...DEFAULT_STATE,
        ...(data.state as Partial<GameState>),
      };

      setGameState(merged);
    } catch (error) {
      console.error("Error inesperado refrescando game_state:", error);
    }
  }, [supabase, code]);

  const updateGameState = useCallback(
    async (updater: (prev: GameState) => GameState) => {
      try {
        const { data, error } = await supabase
          .from("game_state")
          .select("state")
          .eq("room_code", code)
          .maybeSingle();

        if (error) {
          console.error("Error leyendo state antes de actualizar:", error);
          return;
        }

        const prev: GameState = {
          ...DEFAULT_STATE,
          ...((data?.state as Partial<GameState>) ?? {}),
        };

        const next = updater(prev);

        const { error: updateError } = await supabase
          .from("game_state")
          .update({
            state: next,
            updated_at: new Date().toISOString(),
          })
          .eq("room_code", code);

        if (updateError) {
          console.error("Error actualizando state:", updateError);
          return;
        }

        setGameState(next);
      } catch (error) {
        console.error("Error inesperado actualizando game_state:", error);
      }
    },
    [supabase, code]
  );

  const writeGameState = useCallback(
    async (nextState: GameState) => {
      try {
        const { error } = await supabase
          .from("game_state")
          .update({
            state: nextState,
            updated_at: new Date().toISOString(),
          })
          .eq("room_code", code);

        if (error) {
          console.error("Error guardando game_state:", error);
          return false;
        }

        setGameState(nextState);
        return true;
      } catch (error) {
        console.error("Error inesperado guardando game_state:", error);
        return false;
      }
    },
    [supabase, code]
  );

  const awardPoints = useCallback(
    async (championName: string | null) => {
      try {
        if (!championName) return;
        if (sortedPlayers.length < 2) return;

        const winner = sortedPlayers.find(
          (player) => player.player_name === championName
        );
        const loser = sortedPlayers.find(
          (player) => player.player_name !== championName
        );

        if (winner?.user_id) {
          const { data: winnerProfile, error: winnerFetchError } = await supabase
            .from("profiles")
            .select(
              "points, games_played, games_won, total_points_earned, current_win_streak, best_win_streak"
            )
            .eq("id", winner.user_id)
            .single();

          if (winnerFetchError || !winnerProfile) {
            console.error("Error leyendo perfil del ganador:", winnerFetchError);
          } else {
            const newCurrentStreak = (winnerProfile.current_win_streak ?? 0) + 1;
            const newBestStreak = Math.max(
              winnerProfile.best_win_streak ?? 0,
              newCurrentStreak
            );

            const { error: winnerUpdateError } = await supabase
              .from("profiles")
              .update({
                points: (winnerProfile.points ?? 0) + 5,
                games_played: (winnerProfile.games_played ?? 0) + 1,
                games_won: (winnerProfile.games_won ?? 0) + 1,
                total_points_earned: (winnerProfile.total_points_earned ?? 0) + 5,
                current_win_streak: newCurrentStreak,
                best_win_streak: newBestStreak,
              })
              .eq("id", winner.user_id);

            if (winnerUpdateError) {
              console.error("Error actualizando ganador:", winnerUpdateError);
            }
          }
        }

        if (loser?.user_id) {
          const { data: loserProfile, error: loserFetchError } = await supabase
            .from("profiles")
            .select(
              "points, games_played, games_lost, total_points_earned, current_win_streak"
            )
            .eq("id", loser.user_id)
            .single();

          if (loserFetchError || !loserProfile) {
            console.error("Error leyendo perfil del perdedor:", loserFetchError);
          } else {
            const { error: loserUpdateError } = await supabase
              .from("profiles")
              .update({
                points: (loserProfile.points ?? 0) + 2,
                games_played: (loserProfile.games_played ?? 0) + 1,
                games_lost: (loserProfile.games_lost ?? 0) + 1,
                total_points_earned: (loserProfile.total_points_earned ?? 0) + 2,
                current_win_streak: 0,
              })
              .eq("id", loser.user_id);

            if (loserUpdateError) {
              console.error("Error actualizando perdedor:", loserUpdateError);
            }
          }
        }

        await fetchProfilesForPlayers(sortedPlayers);
      } catch (error) {
        console.error("Error general dando puntos/stats:", error);
      }
    },
    [sortedPlayers, supabase, fetchProfilesForPlayers]
  );

  const clearGameChat = useCallback(async () => {
    try {
      const { error } = await supabase
        .from("room_messages")
        .delete()
        .eq("room_code", code)
        .eq("context", "game");

      if (error) {
        console.error("Error limpiando chat de partida:", error);
      }
    } catch (error) {
      console.error("Error inesperado limpiando chat de partida:", error);
    }
  }, [supabase, code]);

  const resolveRoundIfNeeded = useCallback(async () => {
    if (!isHost) return;
    if (!bothPlayersPresent) return;
    if (gameState.matchOver) return;
    if (gameState.roundWinner) return;
    if (resolvingRoundRef.current) return;

    const p1 = sortedPlayers[0]?.player_name;
    const p2 = sortedPlayers[1]?.player_name;

    if (!p1 || !p2) return;

    const c1 = gameState.playerChoices?.[p1];
    const c2 = gameState.playerChoices?.[p2];

    if (!c1 || !c2) return;

    resolvingRoundRef.current = true;

    let awardedChampion: string | null = null;

    await updateGameState((prev) => {
      const player1 = sortedPlayers[0]?.player_name;
      const player2 = sortedPlayers[1]?.player_name;

      if (!player1 || !player2) return prev;

      const choice1 = prev.playerChoices?.[player1];
      const choice2 = prev.playerChoices?.[player2];

      if (!choice1 || !choice2) return prev;
      if (prev.roundWinner || prev.matchOver) return prev;

      const scores = { ...(prev.scores ?? {}) };

      let roundWinner: string | null = null;
      let resultText = "Empate";
      let resultDetail = "Ambos eligieron lo mismo.";
      let champion: string | null = null;
      let matchOver = false;
      let canAdvanceRound = true;

      const outcome = getRoundOutcome(choice1, choice2);

      if (outcome.winnerSide === "a") {
        roundWinner = player1;
        scores[player1] = (scores[player1] ?? 0) + 1;
        resultText = `${player1} gana la ronda`;
        resultDetail = outcome.detailText;
      } else if (outcome.winnerSide === "b") {
        roundWinner = player2;
        scores[player2] = (scores[player2] ?? 0) + 1;
        resultText = `${player2} gana la ronda`;
        resultDetail = outcome.detailText;
      } else {
        resultText = "Empate";
        resultDetail = outcome.detailText;
      }

      if ((scores[player1] ?? 0) >= roundsToWin) {
        champion = player1;
        awardedChampion = player1;
        matchOver = true;
        canAdvanceRound = false;
        resultText = `${player1} es el campeón`;
        resultDetail = `${player1} gana la partida en formato ${variantLabel.toLowerCase()}`;
      } else if ((scores[player2] ?? 0) >= roundsToWin) {
        champion = player2;
        awardedChampion = player2;
        matchOver = true;
        canAdvanceRound = false;
        resultText = `${player2} es el campeón`;
        resultDetail = `${player2} gana la partida en formato ${variantLabel.toLowerCase()}`;
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

    if (awardedChampion) {
      await awardPoints(awardedChampion);
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
    if (gameState.matchOver) return;
    if (gameState.roundWinner) return;
    if (gameState.playerChoices?.[currentPlayerName]) return;

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

  const goBackToRoom = useCallback(async () => {
    const fresh = buildFreshState(sortedPlayers);

    const { error: roomError } = await supabase
      .from("rooms")
      .update({
        status: "waiting",
        started_at: null,
      })
      .eq("code", code);

    if (roomError) {
      console.error("Error actualizando room:", roomError);
      return;
    }

    const { error: playersError } = await supabase
      .from("room_players")
      .update({ is_ready: false })
      .eq("room_code", code);

    if (playersError) {
      console.error("Error reseteando ready:", playersError);
      return;
    }

    await clearGameChat();
    await writeGameState(fresh);
    router.push(`/sala/${code}`);
  }, [sortedPlayers, supabase, code, clearGameChat, writeGameState, router]);

  const handleRematch = async () => {
    if (!currentPlayerName) return;

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

  const handleTerminateMatch = async () => {
    await goBackToRoom();
  };

  const handleSelectIdentity = (playerName: string) => {
    persistPlayerName(code, playerName);
    setCurrentPlayerName(playerName);
  };

  const getVisibleChoiceLabel = (selected: Choice, isCurrent: boolean) => {
    if (!selected) return "Aún no elige";

    if (shouldRevealChoices) {
      return selected;
    }

    if (isCurrent) {
      return "Elección bloqueada";
    }

    return "Esperando...";
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setLoading(true);

      try {
        const playerList = await fetchPlayers();
        await fetchRoom();
        await ensureGameStateRow(playerList);
      } catch (error) {
        console.error("Error inicializando juego:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    if (code) {
      init();
    }

    return () => {
      mounted = false;
    };
  }, [code, fetchPlayers, fetchRoom, ensureGameStateRow]);

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
    resolveRoundIfNeeded();
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
      if (autoAdvanceRef.current) {
        clearTimeout(autoAdvanceRef.current);
      }
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
      lastChampionRef.current = gameState.champion;
      return;
    }

    if (gameState.resultText === "Empate") {
      setRoundPopup({
        visible: true,
        title: "Empate",
        subtitle: gameState.resultDetail ?? "Ambos eligieron lo mismo.",
      });
      playPPTSfx("empate");
    } else {
      const detail = gameState.resultDetail ?? "";
      setRoundPopup({
        visible: true,
        title: gameState.resultText,
        subtitle: detail,
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
        <div className="text-center">
          <p className="text-xl font-semibold">Cargando partida...</p>
          <p className="mt-2 text-white/60">Preparando el juego...</p>
        </div>
      </div>
    );
  }

  const needsIdentitySelection =
    sortedPlayers.length > 0 &&
    (!currentPlayerName ||
      !sortedPlayers.some((player) => player.player_name === currentPlayerName));

  const renderGameAvatar = (
    avatar: { emoji?: string; image?: string; label?: string },
    frame: { className?: string; image?: string; label?: string }
  ) => {
    return (
      <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-black">
        {frame.image ? (
          <img
            src={frame.image}
            alt={frame.label ?? "Frame"}
            className="absolute inset-0 h-full w-full object-contain"
          />
        ) : (
          <div
            className={`absolute inset-0 rounded-full border-4 ${frame.className ?? ""}`}
          />
        )}

        {avatar.image ? (
          <img
            src={avatar.image}
            alt={avatar.label ?? "Avatar"}
            className="relative z-10 h-10 w-10 object-contain"
          />
        ) : (
          <span className="relative z-10 text-2xl">{avatar.emoji}</span>
        )}
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-neutral-950 p-4 text-white md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-white/60">La Mesa Familiar</p>
            <h1 className="text-3xl font-bold">Piedra, Papel o Tijera</h1>
            <p className="mt-1 text-white/70">
              Sala: <span className="font-semibold text-white">{code}</span>
            </p>
            <p className="text-white/70">
              Estado: <span className="font-semibold text-white">{roomStatus}</span>
            </p>
            <p className="text-white/70">
              Jugador actual:{" "}
              <span className="font-semibold text-emerald-400">
                {currentPlayerName || "No seleccionado"}
              </span>
            </p>
          </div>

          <div className="flex flex-col gap-3 md:items-end">
            <div className="rounded-2xl bg-white/5 px-4 py-3 text-center">
              <p className="text-sm text-white/60">Modo</p>
              <p className="text-xl font-bold text-yellow-400">{modeLabel}</p>
              <p className="text-sm text-white/60">
                Gana quien llegue a {roundsToWin} ronda{roundsToWin !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={goBackToRoom}
                className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 font-semibold transition hover:bg-white/15"
              >
                Volver a sala
              </button>

              <button
                onClick={handleTerminateMatch}
                className="rounded-2xl bg-red-500/90 px-4 py-2 font-semibold text-white transition hover:bg-red-500"
              >
                Terminar partida
              </button>
            </div>
          </div>
        </div>

        {needsIdentitySelection && (
          <div className="mb-6 rounded-3xl border border-cyan-400/25 bg-cyan-500/10 p-5">
            <p className="text-lg font-semibold text-cyan-300">
              Este navegador todavía no sabe qué jugador eres
            </p>
            <p className="mt-1 text-white/70">
              Selecciona tu jugador una sola vez en este navegador.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {sortedPlayers.map((player) => (
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
          </div>
        )}

        {!bothPlayersPresent && (
          <div className="mb-6 rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-5">
            <p className="text-lg font-semibold text-yellow-300">Esperando al segundo jugador...</p>
          </div>
        )}

        {roundPopup.visible && !gameState.matchOver && (
          <div className="mb-6 rounded-3xl border border-orange-400/30 bg-orange-500/10 p-5 text-center shadow-[0_0_25px_rgba(249,115,22,0.10)]">
            <p className="text-sm uppercase tracking-[0.3em] text-orange-300">Resultado de ronda</p>
            <h2 className="mt-2 text-2xl font-extrabold text-white">{roundPopup.title}</h2>
            <p className="mt-2 text-white/75">{roundPopup.subtitle}</p>
          </div>
        )}

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          {sortedPlayers.map((player) => {
            const score = gameState.scores?.[player.player_name] ?? 0;
            const selected = gameState.playerChoices?.[player.player_name] ?? null;
            const isCurrent = player.player_name === currentPlayerName;
            const visibleChoice = getVisibleChoiceLabel(selected, isCurrent);

            const profile = player.user_id ? profilesMap[player.user_id] : null;
            const avatar = getAvatarByKey(
              player.is_guest ? "avatar_guest" : profile?.avatar_key ?? "avatar_sun"
            );
            const frame = getFrameByKey(
              player.is_guest ? "frame_guest" : profile?.frame_key ?? "frame_orange"
            );

            return (
              <div
                key={player.id}
                className={`rounded-3xl border p-5 ${
                  isCurrent
                    ? "border-emerald-400/40 bg-emerald-500/10"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <div className="mb-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {renderGameAvatar(avatar, frame)}

                    <div>
                      <p className="text-xl font-bold">
                        {player.player_name} {player.is_host ? "👑" : ""}
                      </p>
                      <p className="text-sm text-white/60">{isCurrent ? "Tú" : "Rival"}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-black/30 px-4 py-2 text-center">
                    <p className="text-xs uppercase tracking-widest text-white/50">Marcador</p>
                    <p className="text-2xl font-bold text-yellow-400">{score}</p>
                  </div>
                </div>

                <div className="rounded-2xl bg-black/20 px-4 py-3">
                  <p className="text-sm text-white/60">Jugada actual</p>
                  <p className="text-lg font-semibold capitalize">{visibleChoice}</p>
                </div>
              </div>
            );
          })}
        </div>

        {!gameState.matchOver && (
          <div className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-white/60">Ronda actual</p>
                <h2 className="text-2xl font-bold">Ronda {gameState.round}</h2>
                <p className="mt-1 text-sm text-white/60">
                  Formato activo: {variantLabel}
                </p>
              </div>

              <div className="rounded-2xl bg-black/20 px-4 py-3">
                <p className="text-sm text-white/60">
                  {needsIdentitySelection
                    ? "Primero selecciona tu jugador"
                    : gameState.resultText
                    ? gameState.resultText
                    : myChoice && !shouldRevealChoices
                    ? "Esperando al otro jugador..."
                    : "Haz tu elección"}
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <button
                onClick={() => handleChoice("piedra")}
                disabled={
                  !bothPlayersPresent ||
                  !currentPlayerName ||
                  needsIdentitySelection ||
                  !!myChoice ||
                  !!gameState.roundWinner
                }
                className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-lg font-semibold transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ✊ Piedra
              </button>

              <button
                onClick={() => handleChoice("papel")}
                disabled={
                  !bothPlayersPresent ||
                  !currentPlayerName ||
                  needsIdentitySelection ||
                  !!myChoice ||
                  !!gameState.roundWinner
                }
                className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-lg font-semibold transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ✋ Papel
              </button>

              <button
                onClick={() => handleChoice("tijera")}
                disabled={
                  !bothPlayersPresent ||
                  !currentPlayerName ||
                  needsIdentitySelection ||
                  !!myChoice ||
                  !!gameState.roundWinner
                }
                className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-lg font-semibold transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ✌️ Tijera
              </button>
            </div>
          </div>
        )}

        {gameState.matchOver && (
          <div className="mb-6 rounded-3xl border border-yellow-400/30 bg-yellow-500/10 p-6">
            <div className="text-center">
              <p className="mb-2 text-sm uppercase tracking-[0.3em] text-yellow-300">Campeón</p>
              <h2 className="text-4xl font-extrabold text-yellow-400">👑 {gameState.champion}</h2>
              <p className="mt-3 text-lg text-white/80">
                La partida terminó. Ya tenemos campeón del {modeLabel.toLowerCase()}.
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {sortedPlayers.map((player) => (
                <div
                  key={player.id}
                  className={`rounded-2xl border p-4 ${
                    player.player_name === gameState.champion
                      ? "border-yellow-400/40 bg-yellow-500/10"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <p className="text-lg font-bold">{player.player_name}</p>
                  <p className="text-white/70">
                    Rondas ganadas:{" "}
                    <span className="font-bold text-white">
                      {gameState.scores?.[player.player_name] ?? 0}
                    </span>
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-3 md:flex-row md:justify-center">
              <button
                onClick={handleRematch}
                className="rounded-2xl bg-emerald-500 px-6 py-3 font-bold text-black transition hover:bg-emerald-400"
              >
                Revancha
              </button>

              <button
                onClick={goBackToRoom}
                className="rounded-2xl border border-white/15 bg-white/10 px-6 py-3 font-bold transition hover:bg-white/15"
              >
                Volver a sala
              </button>
            </div>

            <p className="mt-4 text-center text-sm text-white/60">
              Votos de revancha: {gameState.rematchVotes?.length ?? 0}/{Math.max(sortedPlayers.length, 2)}
            </p>
          </div>
        )}

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <h3 className="mb-3 text-xl font-bold">Resumen en tiempo real</h3>
          <div className="space-y-2 text-white/75">
            <p>
              Tu jugada:{" "}
              <span className="font-semibold capitalize text-white">
                {!myChoice ? "Aún no eliges" : shouldRevealChoices ? myChoice : "Elección bloqueada"}
              </span>
            </p>
            <p>
              Jugada rival:{" "}
              <span className="font-semibold capitalize text-white">
                {!opponentChoice ? "Esperando..." : shouldRevealChoices ? opponentChoice : "Esperando..."}
              </span>
            </p>
            <p>
              Resultado:{" "}
              <span className="font-semibold text-white">
                {gameState.resultText ?? "Sin resultado todavía"}
              </span>
            </p>
            {gameState.resultDetail && (
              <p>
                Detalle:{" "}
                <span className="font-semibold text-white">{gameState.resultDetail}</span>
              </p>
            )}
          </div>
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
