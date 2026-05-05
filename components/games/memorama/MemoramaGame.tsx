// 📍 Ruta del archivo: components/games/memorama/MemoramaGame.tsx

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { MemoramaGameState } from "./types";
import {
  areAllPairsMatched,
  createInitialMemoramaState,
  getCardById,
  getWinnerFromScores,
  isCardVisible,
} from "./utils";

type MemoramaGameProps = {
  roomCode: string;
};

type RoomRow = {
  code: string;
  status: string;
  game_slug: string | null;
  game_variant: string | null;
  room_settings: Record<string, any> | null;
};

type RoomPlayerRow = {
  id: string;
  room_code: string;
  user_id: string | null;
  player_name: string;
  is_host: boolean;
  is_guest: boolean;
  is_ready: boolean;
  created_at: string;
};

const getPlayerKey = (player: RoomPlayerRow) => {
  return player.user_id ?? player.id;
};

export default function MemoramaGame({ roomCode }: MemoramaGameProps) {
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [room, setRoom] = useState<RoomRow | null>(null);
  const [players, setPlayers] = useState<RoomPlayerRow[]>([]);
  const [gameState, setGameState] = useState<MemoramaGameState>(
    createInitialMemoramaState(),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const currentPlayerName = useMemo(() => {
    if (typeof window === "undefined") return "";

    const canonical = localStorage.getItem(`lmf:player:${roomCode}`);

    if (canonical) {
      try {
        const parsed = JSON.parse(canonical);
        if (parsed?.playerName) return String(parsed.playerName);
      } catch {}
    }

    return (
      localStorage.getItem(`la-mesa-player-name-${roomCode}`) ||
      localStorage.getItem(`mesa-player-name-${roomCode}`) ||
      localStorage.getItem("playerName") ||
      ""
    );
  }, [roomCode]);

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => a.created_at.localeCompare(b.created_at));
  }, [players]);

  const currentPlayer = useMemo(() => {
    return sortedPlayers.find((p) => p.player_name === currentPlayerName) ?? null;
  }, [sortedPlayers, currentPlayerName]);

  const currentPlayerKey = currentPlayer ? getPlayerKey(currentPlayer) : null;
  const isHost = !!currentPlayer?.is_host;

  const isMyTurn =
    !!currentPlayerKey && gameState.currentTurnKey === currentPlayerKey;

  const extractMemoramaState = (
    settings: Record<string, any> | null | undefined,
  ): MemoramaGameState => {
    const saved = settings?.memorama;

    if (!saved) {
      return createInitialMemoramaState();
    }

    return {
      ...createInitialMemoramaState(),
      ...saved,
      cards: saved.cards ?? [],
      flippedCardIds: saved.flippedCardIds ?? [],
      matchedCardIds: saved.matchedCardIds ?? [],
      scores: saved.scores ?? {},
    };
  };

  const updateMemoramaState = useCallback(
    async (updater: (current: MemoramaGameState) => MemoramaGameState) => {
      if (!room) return;

      setSaving(true);

      const currentSettings = room.room_settings ?? {};
      const currentState = extractMemoramaState(currentSettings);
      const nextState = updater(currentState);

      const nextSettings = {
        ...currentSettings,
        memorama: {
          ...nextState,
          updatedAt: new Date().toISOString(),
        },
      };

      const { error } = await supabase
        .from("rooms")
        .update({ room_settings: nextSettings })
        .eq("code", roomCode);

      if (error) {
        console.error("Error actualizando Memorama:", error);
        alert("No se pudo actualizar la partida.");
      } else {
        setGameState(nextSettings.memorama);
        setRoom((prev) =>
          prev ? { ...prev, room_settings: nextSettings } : prev,
        );
      }

      setSaving(false);
    },
    [room, roomCode, supabase],
  );

  const loadRoom = useCallback(async () => {
    const { data, error } = await supabase
      .from("rooms")
      .select("code, status, game_slug, game_variant, room_settings")
      .eq("code", roomCode)
      .maybeSingle();

    if (error) {
      console.error("Error cargando sala:", error);
      return;
    }

    if (!data) return;

    if (data.status === "closed") {
      router.replace("/");
      return;
    }

    if (data.status === "waiting") {
      router.replace(`/sala/${roomCode}`);
      return;
    }

    setRoom(data as RoomRow);
    setGameState(extractMemoramaState(data.room_settings));
  }, [roomCode, router, supabase]);

  const loadPlayers = useCallback(async () => {
    const { data, error } = await supabase
      .from("room_players")
      .select("id, room_code, user_id, player_name, is_host, is_guest, is_ready, created_at")
      .eq("room_code", roomCode)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error cargando jugadores:", error);
      return;
    }

    setPlayers((data ?? []) as RoomPlayerRow[]);
  }, [roomCode, supabase]);

  const startGame = async () => {
    if (sortedPlayers.length < 2) {
      alert("Memorama necesita 2 jugadores.");
      return;
    }

    const firstPlayer = sortedPlayers[Math.floor(Math.random() * sortedPlayers.length)];
    const firstKey = getPlayerKey(firstPlayer);

    await updateMemoramaState((current) => {
      const scores = sortedPlayers.reduce<MemoramaGameState["scores"]>(
        (acc, player) => {
          const key = getPlayerKey(player);

          acc[key] = {
            playerKey: key,
            playerName: player.player_name,
            pairs: current.scores[key]?.pairs ?? 0,
          };

          return acc;
        },
        {},
      );

      return {
        ...createInitialMemoramaState(),
        phase: "playing",
        currentTurnKey: firstKey,
        currentTurnName: firstPlayer.player_name,
        scores,
      };
    });
  };

  const handleCardClick = async (cardId: string) => {
    if (!currentPlayer || !currentPlayerKey) return;
    if (gameState.phase !== "playing") return;

    if (!isMyTurn) {
      alert("Todavía no es tu turno.");
      return;
    }

    if (saving) return;

    const card = getCardById(gameState.cards, cardId);

    if (!card) return;
    if (gameState.matchedCardIds.includes(card.id)) return;
    if (gameState.flippedCardIds.includes(card.id)) return;
    if (gameState.flippedCardIds.length >= 2) return;

    await updateMemoramaState((current) => {
      const selectedCard = getCardById(current.cards, cardId);
      if (!selectedCard) return current;

      if (current.matchedCardIds.includes(selectedCard.id)) return current;
      if (current.flippedCardIds.includes(selectedCard.id)) return current;
      if (current.flippedCardIds.length >= 2) return current;

      const nextFlipped = [...current.flippedCardIds, selectedCard.id];

      if (nextFlipped.length < 2) {
        return {
          ...current,
          flippedCardIds: nextFlipped,
          lastMatch: null,
        };
      }

      const firstCard = getCardById(current.cards, nextFlipped[0]);
      const secondCard = getCardById(current.cards, nextFlipped[1]);

      if (!firstCard || !secondCard) return current;

      const isMatch = firstCard.pairId === secondCard.pairId;

      if (isMatch) {
        const nextMatchedCardIds = [
          ...current.matchedCardIds,
          firstCard.id,
          secondCard.id,
        ];

        const currentScore = current.scores[currentPlayerKey] ?? {
          playerKey: currentPlayerKey,
          playerName: currentPlayer.player_name,
          pairs: 0,
        };

        const nextScores = {
          ...current.scores,
          [currentPlayerKey]: {
            ...currentScore,
            pairs: currentScore.pairs + 1,
          },
        };

        const finished = areAllPairsMatched(current.cards, nextMatchedCardIds);
        const winner = finished
          ? getWinnerFromScores(nextScores)
          : { winnerKey: null, winnerName: null };

        return {
          ...current,
          phase: finished ? "finished" : current.phase,
          flippedCardIds: [],
          matchedCardIds: nextMatchedCardIds,
          scores: nextScores,
          lastMatch: true,
          winnerKey: winner.winnerKey,
          winnerName: winner.winnerName,
        };
      }

      const nextPlayer =
        sortedPlayers.find((player) => getPlayerKey(player) !== currentPlayerKey) ??
        sortedPlayers[0];

      const nextPlayerKey = nextPlayer ? getPlayerKey(nextPlayer) : currentPlayerKey;

      return {
        ...current,
        flippedCardIds: nextFlipped,
        lastMatch: false,
        currentTurnKey: nextPlayerKey,
        currentTurnName: nextPlayer?.player_name ?? current.currentTurnName,
      };
    });

    const latestState = extractMemoramaState(room?.room_settings);

    setTimeout(() => {
      void updateMemoramaState((current) => {
        if (current.phase !== "playing") return current;
        if (current.flippedCardIds.length !== 2) return current;
        if (current.lastMatch !== false) return current;

        return {
          ...current,
          flippedCardIds: [],
        };
      });
    }, 900);
  };

  const handleRematch = async () => {
    await startGame();
  };

  const handleBackToSala = async () => {
    const ok = window.confirm("¿Quieres volver a sala? Todos regresarán a la sala.");
    if (!ok) return;

    const { error } = await supabase
      .from("rooms")
      .update({ status: "waiting" })
      .eq("code", roomCode);

    if (error) {
      console.error("Error volviendo a sala:", error);
      alert("No se pudo volver a sala.");
      return;
    }

    router.replace(`/sala/${roomCode}`);
  };

  const handleCloseRoom = async () => {
    if (!isHost) return;

    const ok = window.confirm("¿Seguro que quieres terminar la sala?");
    if (!ok) return;

    const { error } = await supabase
      .from("rooms")
      .update({ status: "closed" })
      .eq("code", roomCode);

    if (error) {
      console.error("Error cerrando sala:", error);
      alert("No se pudo cerrar la sala.");
      return;
    }

    await supabase.from("room_players").delete().eq("room_code", roomCode);
    router.replace("/");
  };

  useEffect(() => {
    const boot = async () => {
      setLoading(true);
      await Promise.all([loadRoom(), loadPlayers()]);
      setLoading(false);
    };

    void boot();
  }, [loadRoom, loadPlayers]);

  useEffect(() => {
    const channel = supabase
      .channel(`memorama-${roomCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rooms",
          filter: `code=eq.${roomCode}`,
        },
        async () => {
          await loadRoom();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_players",
          filter: `room_code=eq.${roomCode}`,
        },
        async () => {
          await loadPlayers();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, roomCode, loadRoom, loadPlayers]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto max-w-5xl rounded-[32px] border border-white/10 bg-zinc-950 p-8 text-center">
          <p className="text-2xl font-black">Cargando Memorama...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white md:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="rounded-[32px] border border-orange-500/20 bg-zinc-950/95 p-6 shadow-[0_0_40px_rgba(249,115,22,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-300/80">
                La Mesa Familiar
              </p>

              <h1 className="mt-2 text-3xl font-black md:text-4xl">
                🧠 Memorama
              </h1>

              <p className="mt-2 text-sm text-white/60">
                Encuentra parejas, gana puntos y mantén el turno si aciertas.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleBackToSala}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white hover:bg-white/10"
              >
                Volver a sala
              </button>

              {isHost && (
                <button
                  type="button"
                  onClick={handleCloseRoom}
                  className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200 hover:bg-red-500/20"
                >
                  Terminar sala
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[340px_1fr]">
          <aside className="space-y-5">
            <div className="rounded-[28px] border border-white/10 bg-zinc-950/90 p-5">
              <h2 className="text-xl font-black">🏆 Marcador</h2>

              <div className="mt-4 space-y-3">
                {sortedPlayers.map((player) => {
                  const key = getPlayerKey(player);
                  const score = gameState.scores[key]?.pairs ?? 0;

                  return (
                    <div
                      key={player.id}
                      className={
                        gameState.currentTurnKey === key
                          ? "rounded-2xl border border-orange-400 bg-orange-500/15 p-4 shadow-[0_0_22px_rgba(249,115,22,0.14)]"
                          : "rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                      }
                    >
                      <p className="font-black">
                        {player.player_name} {key === currentPlayerKey ? "(Tú)" : ""}
                      </p>

                      <p className="mt-1 text-sm font-bold text-white/60">
                        Parejas:{" "}
                        <span className="text-orange-300">{score}</span>
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-zinc-950/90 p-5">
              <h2 className="text-xl font-black">🎮 Estado</h2>

              {gameState.phase === "waiting" && (
                <div className="mt-4 space-y-3">
                  <p className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-100">
                    Listo para iniciar Memorama.
                  </p>

                  {isHost ? (
                    <button
                      type="button"
                      onClick={startGame}
                      disabled={saving || sortedPlayers.length < 2}
                      className="w-full rounded-2xl bg-orange-500 px-4 py-3 font-black text-black hover:bg-orange-400 disabled:opacity-50"
                    >
                      Iniciar partida
                    </button>
                  ) : (
                    <p className="text-sm text-white/50">
                      Esperando que el host inicie la partida.
                    </p>
                  )}
                </div>
              )}

              {gameState.phase === "playing" && (
                <div
                  className={
                    isMyTurn
                      ? "mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4"
                      : "mt-4 rounded-2xl border border-purple-500/20 bg-purple-500/10 p-4"
                  }
                >
                  <p className="text-sm font-bold text-white/60">Turno actual</p>
                  <p className="mt-1 text-2xl font-black">
                    {gameState.currentTurnName ?? "Jugador"}
                  </p>

                  <p className="mt-2 text-sm text-white/60">
                    {isMyTurn
                      ? "Voltea 2 cartas. Si aciertas, sigues jugando."
                      : "Espera tu turno."}
                  </p>
                </div>
              )}

              {gameState.phase === "finished" && (
                <div className="mt-4 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4">
                  <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-300">
                    Partida terminada
                  </p>

                  <p className="mt-2 text-3xl font-black">
                    {gameState.winnerName === "Empate"
                      ? "🤝 Empate"
                      : `🏆 ${gameState.winnerName}`}
                  </p>

                  {isHost && (
                    <button
                      type="button"
                      onClick={handleRematch}
                      className="mt-4 w-full rounded-2xl bg-orange-500 px-4 py-3 font-black text-black hover:bg-orange-400"
                    >
                      Revancha
                    </button>
                  )}
                </div>
              )}
            </div>
          </aside>

          <section className="rounded-[32px] border border-white/10 bg-zinc-950/90 p-4 md:p-6">
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-4 md:grid-cols-4">
              {gameState.cards.map((card) => {
                const visible = isCardVisible(
                  card,
                  gameState.flippedCardIds,
                  gameState.matchedCardIds,
                );

                const matched = gameState.matchedCardIds.includes(card.id);

                return (
                  <button
                    key={card.id}
                    type="button"
                    disabled={
                      saving ||
                      gameState.phase !== "playing" ||
                      !isMyTurn ||
                      visible
                    }
                    onClick={() => void handleCardClick(card.id)}
                    className={
                      matched
                        ? "aspect-square rounded-3xl border border-emerald-400/40 bg-emerald-500/20 text-5xl shadow-[0_0_28px_rgba(16,185,129,0.18)]"
                        : visible
                          ? "aspect-square rounded-3xl border border-orange-400/50 bg-orange-500/20 text-5xl shadow-[0_0_28px_rgba(249,115,22,0.18)]"
                          : "aspect-square rounded-3xl border border-white/10 bg-white/[0.04] text-4xl hover:scale-[1.03] hover:border-orange-400/50 hover:bg-orange-500/10 disabled:hover:scale-100"
                    }
                  >
                    <span className="flex h-full w-full items-center justify-center">
                      {visible ? card.emoji : "❔"}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
