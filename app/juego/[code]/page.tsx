"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Choice = "piedra" | "papel" | "tijera" | null;

type RoomPlayer = {
  id: string;
  room_code: string;
  player_name: string;
  is_host: boolean;
  is_ready: boolean;
  created_at: string;
};

type GameState = {
  round: number;
  playerChoices: Record<string, Choice>;
  scores: Record<string, number>;
  roundWinner: string | null;
  resultText: string | null;
  champion: string | null;
  matchOver: boolean;
  rematchVotes: string[];
  canAdvanceRound: boolean;
};

const DEFAULT_STATE: GameState = {
  round: 1,
  playerChoices: {},
  scores: {},
  roundWinner: null,
  resultText: null,
  champion: null,
  matchOver: false,
  rematchVotes: [],
  canAdvanceRound: false,
};

export default function JuegoPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const code = String(params.code ?? "").toUpperCase();

  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [gameState, setGameState] = useState<GameState>(DEFAULT_STATE);
  const [currentPlayerName, setCurrentPlayerName] = useState("");
  const [roomStatus, setRoomStatus] = useState("playing");
  const [loading, setLoading] = useState(true);

  const autoAdvanceRef = useRef<NodeJS.Timeout | null>(null);
  const resolvingRoundRef = useRef(false);

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

  const detectStoredPlayerName = useCallback((roomCode: string) => {
    if (typeof window === "undefined") return "";

    const keys = [
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

    for (const key of keys) {
      const value = localStorage.getItem(key);
      if (value && value.trim()) return value.trim();
    }

    return "";
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

      if (playerList.length === 0) return "";

      // Fallback temporal para no bloquear el juego
      return playerList[0].player_name;
    },
    [code, detectStoredPlayerName]
  );

  const isHost = useMemo(() => {
    return hostPlayer?.player_name === currentPlayerName;
  }, [hostPlayer, currentPlayerName]);

  const opponentName = useMemo(() => {
    return (
      sortedPlayers.find((p) => p.player_name !== currentPlayerName)?.player_name ??
      ""
    );
  }, [sortedPlayers, currentPlayerName]);

  const myChoice = gameState.playerChoices?.[currentPlayerName] ?? null;
  const opponentChoice = gameState.playerChoices?.[opponentName] ?? null;

  const buildFreshState = useCallback((playerList: RoomPlayer[]): GameState => {
    const playerChoices: Record<string, Choice> = {};
    const scores: Record<string, number> = {};

    for (const player of playerList) {
      playerChoices[player.player_name] = null;
      scores[player.player_name] = 0;
    }

    return {
      round: 1,
      playerChoices,
      scores,
      roundWinner: null,
      resultText: null,
      champion: null,
      matchOver: false,
      rematchVotes: [],
      canAdvanceRound: false,
    };
  }, []);

  const fetchPlayers = useCallback(async () => {
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

    const resolvedName = resolveCurrentPlayerName(list);
    setCurrentPlayerName(resolvedName);

    return list;
  }, [supabase, code, resolveCurrentPlayerName]);

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

        // Si otro cliente la creó justo al mismo tiempo, solo volvemos a leer
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
          return;
        }

        return;
      }

      setGameState(fresh);
    },
    [supabase, code, buildFreshState]
  );

  const refreshGameState = useCallback(async () => {
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
  }, [supabase, code]);

  const updateGameState = useCallback(
    async (updater: (prev: GameState) => GameState) => {
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
    },
    [supabase, code]
  );

  const writeGameState = useCallback(
    async (nextState: GameState) => {
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
    },
    [supabase, code]
  );

  const getWinnerChoice = (a: Exclude<Choice, null>, b: Exclude<Choice, null>) => {
    if (a === b) return "empate";

    if (
      (a === "piedra" && b === "tijera") ||
      (a === "tijera" && b === "papel") ||
      (a === "papel" && b === "piedra")
    ) {
      return "a";
    }

    return "b";
  };

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
      let champion: string | null = null;
      let matchOver = false;
      let canAdvanceRound = true;

      const result = getWinnerChoice(choice1, choice2);

      if (result === "a") {
        roundWinner = player1;
        scores[player1] = (scores[player1] ?? 0) + 1;
        resultText = `${player1} gana la ronda`;
      } else if (result === "b") {
        roundWinner = player2;
        scores[player2] = (scores[player2] ?? 0) + 1;
        resultText = `${player2} gana la ronda`;
      } else {
        resultText = "Empate";
      }

      if ((scores[player1] ?? 0) >= 2) {
        champion = player1;
        matchOver = true;
        canAdvanceRound = false;
        resultText = `${player1} es el campeón`;
      } else if ((scores[player2] ?? 0) >= 2) {
        champion = player2;
        matchOver = true;
        canAdvanceRound = false;
        resultText = `${player2} es el campeón`;
      }

      return {
        ...prev,
        scores,
        roundWinner,
        resultText,
        champion,
        matchOver,
        canAdvanceRound,
      };
    });

    resolvingRoundRef.current = false;
  }, [isHost, bothPlayersPresent, gameState, sortedPlayers, updateGameState]);

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

    await writeGameState(fresh);

    router.push(`/sala/${code}`);
  }, [buildFreshState, sortedPlayers, supabase, code, writeGameState, router]);

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
        if (mounted) setLoading(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-xl font-semibold">Cargando partida...</p>
          <p className="mt-2 text-white/60">Preparando el juego...</p>
        </div>
      </div>
    );
  }

  const rematchVotesCount = gameState.rematchVotes?.length ?? 0;

  return (
    <main className="min-h-screen bg-neutral-950 text-white p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
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
                {currentPlayerName || "No detectado"}
              </span>
            </p>
          </div>

          <div className="flex flex-col gap-3 md:items-end">
            <div className="rounded-2xl bg-white/5 px-4 py-3 text-center">
              <p className="text-sm text-white/60">Modo</p>
              <p className="text-xl font-bold text-yellow-400">Mejor de 3</p>
              <p className="text-sm text-white/60">Gana quien llegue a 2 rondas</p>
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

        {!bothPlayersPresent && (
          <div className="mb-6 rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-5">
            <p className="text-lg font-semibold text-yellow-300">Esperando al segundo jugador...</p>
          </div>
        )}

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          {sortedPlayers.map((player) => {
            const score = gameState.scores?.[player.player_name] ?? 0;
            const selected = gameState.playerChoices?.[player.player_name] ?? null;
            const isCurrent = player.player_name === currentPlayerName;

            return (
              <div
                key={player.id}
                className={`rounded-3xl border p-5 ${
                  isCurrent
                    ? "border-emerald-400/40 bg-emerald-500/10"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-xl font-bold">
                      {player.player_name} {player.is_host ? "👑" : ""}
                    </p>
                    <p className="text-sm text-white/60">{isCurrent ? "Tú" : "Rival"}</p>
                  </div>

                  <div className="rounded-2xl bg-black/30 px-4 py-2 text-center">
                    <p className="text-xs uppercase tracking-widest text-white/50">Marcador</p>
                    <p className="text-2xl font-bold text-yellow-400">{score}</p>
                  </div>
                </div>

                <div className="rounded-2xl bg-black/20 px-4 py-3">
                  <p className="text-sm text-white/60">Jugada actual</p>
                  <p className="text-lg font-semibold capitalize">
                    {selected ? selected : "Aún no elige"}
                  </p>
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
              </div>

              <div className="rounded-2xl bg-black/20 px-4 py-3">
                <p className="text-sm text-white/60">
                  {gameState.resultText
                    ? gameState.resultText
                    : myChoice
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
              <h2 className="text-4xl font-extrabold text-yellow-400">
                👑 {gameState.champion}
              </h2>
              <p className="mt-3 text-lg text-white/80">
                La partida terminó. Ya tenemos campeón del mejor de 3.
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
              Votos de revancha: {rematchVotesCount}/{Math.max(sortedPlayers.length, 2)}
            </p>
          </div>
        )}

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <h3 className="mb-3 text-xl font-bold">Resumen en tiempo real</h3>
          <div className="space-y-2 text-white/75">
            <p>
              Tu jugada:{" "}
              <span className="font-semibold capitalize text-white">
                {myChoice ?? "Aún no eliges"}
              </span>
            </p>
            <p>
              Jugada rival:{" "}
              <span className="font-semibold capitalize text-white">
                {opponentChoice ?? "Esperando..."}
              </span>
            </p>
            <p>
              Resultado:{" "}
              <span className="font-semibold text-white">
                {gameState.resultText ?? "Sin resultado todavía"}
              </span>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
