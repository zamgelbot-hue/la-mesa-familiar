// 📍 Ruta del archivo: components/games/memorama/MemoramaGame.tsx

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  GamePageLayout,
  GameResultOverlay,
} from "@/components/games/core";
import { createClient } from "@/lib/supabase/client";

import MemoramaBoard from "./MemoramaBoard";
import MemoramaHeader from "./MemoramaHeader.tsx";
import MemoramaScorePanel from "./MemoramaScorePanel.tsx";
import MemoramaStatusPanel from "./MemoramaStatusPanel.tsx";

import type { MemoramaGameState } from "./types";

import {
  DEFAULT_MEMORAMA_VARIANT,
  MEMORAMA_RESOLVE_MS,
  MEMORAMA_SET_LABELS,
  MEMORAMA_SETS,
  MEMORAMA_STORE_LOCKED_SETS,
  MEMORAMA_TURN_SECONDS,
  areAllPairsMatched,
  createInitialMemoramaState,
  getCardById,
  getTurnTimes,
  getWinnerFromScores,
  normalizeMemoramaVariant,
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
  const resolveTimerRef = useRef<number | null>(null);
  const lastSoundKeyRef = useRef("");

  const [room, setRoom] = useState<RoomRow | null>(null);
  const [players, setPlayers] = useState<RoomPlayerRow[]>([]);
  const [gameState, setGameState] = useState<MemoramaGameState>(
    createInitialMemoramaState(),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());

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
    return [...players].sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    );
  }, [players]);

  const currentPlayer = useMemo(() => {
    return (
      sortedPlayers.find((p) => p.player_name === currentPlayerName) ?? null
    );
  }, [sortedPlayers, currentPlayerName]);

  const currentPlayerKey = currentPlayer ? getPlayerKey(currentPlayer) : null;
  const isHost = !!currentPlayer?.is_host;

  const isMyTurn =
    !!currentPlayerKey && gameState.currentTurnKey === currentPlayerKey;

  const turnSecondsLeft = useMemo(() => {
    if (gameState.phase !== "playing" || !gameState.turnEndsAt) return 0;

    const diff = new Date(gameState.turnEndsAt).getTime() - nowMs;
    return Math.max(0, Math.ceil(diff / 1000));
  }, [gameState.phase, gameState.turnEndsAt, nowMs]);

  const extractMemoramaState = (
    settings: Record<string, any> | null | undefined,
  ): MemoramaGameState => {
    const saved = settings?.memorama;

    const configuredVariant = normalizeMemoramaVariant(
      settings?.memorama_variant ?? saved?.variant ?? DEFAULT_MEMORAMA_VARIANT,
    );

    if (!saved || saved.phase === undefined) {
      return createInitialMemoramaState(configuredVariant);
    }

    return {
      ...createInitialMemoramaState(configuredVariant),
      ...saved,
      variant: normalizeMemoramaVariant(saved.variant ?? configuredVariant),
      cards: saved.cards ?? [],
      selectedCardIds: saved.selectedCardIds ?? saved.flippedCardIds ?? [],
      matchedCardIds: saved.matchedCardIds ?? [],
      matchedPairOwners: saved.matchedPairOwners ?? {},
      scores: saved.scores ?? {},
      isResolving: saved.isResolving ?? false,
      lastResult: saved.lastResult ?? null,
      turnStartedAt: saved.turnStartedAt ?? null,
      turnEndsAt: saved.turnEndsAt ?? null,
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
        memorama_variant: nextState.variant,
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
      .select(
        "id, room_code, user_id, player_name, is_host, is_guest, is_ready, created_at",
      )
      .eq("room_code", roomCode)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error cargando jugadores:", error);
      return;
    }

    setPlayers((data ?? []) as RoomPlayerRow[]);
  }, [roomCode, supabase]);

  const getNextPlayer = useCallback(
    (currentTurnKey: string | null) => {
      if (sortedPlayers.length === 0) return null;

      const currentIndex = sortedPlayers.findIndex(
        (player) => getPlayerKey(player) === currentTurnKey,
      );

      if (currentIndex < 0) return sortedPlayers[0];

      return (
        sortedPlayers[(currentIndex + 1) % sortedPlayers.length] ??
        sortedPlayers[0]
      );
    },
    [sortedPlayers],
  );

  const playToneSequence = (
    notes: number[],
    type: OscillatorType = "triangle",
    volume = 0.12,
    duration = 0.12,
  ) => {
    try {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;

      const audioContext = new AudioContextClass();

      notes.forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const startAt = audioContext.currentTime + index * 0.09;

        oscillator.type = type;
        oscillator.frequency.value = frequency;

        gain.gain.setValueAtTime(0.0001, startAt);
        gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.start(startAt);
        oscillator.stop(startAt + duration + 0.04);
      });
    } catch (error) {
      console.error("No se pudo reproducir sonido de Memorama:", error);
    }
  };

  const playFlipSound = () => playToneSequence([392, 523.25], "sine", 0.08, 0.1);

  const playMatchSound = () =>
    playToneSequence([523.25, 659.25, 783.99], "triangle", 0.14, 0.16);

  const playMissSound = () =>
    playToneSequence([220, 164.81], "sawtooth", 0.08, 0.12);

  const playTimeoutSound = () =>
    playToneSequence([196, 146.83], "square", 0.06, 0.1);

  const playWinSound = () =>
    playToneSequence(
      [523.25, 659.25, 783.99, 1046.5],
      "triangle",
      0.18,
      0.22,
    );

  const startGame = async () => {
    if (sortedPlayers.length < 2) {
      alert("Memorama necesita 2 jugadores.");
      return;
    }

    const configuredVariant = normalizeMemoramaVariant(
      room?.room_settings?.memorama_variant ?? DEFAULT_MEMORAMA_VARIANT,
    );

    const firstPlayer =
      sortedPlayers[Math.floor(Math.random() * sortedPlayers.length)];

    const firstKey = getPlayerKey(firstPlayer);
    const turnTimes = getTurnTimes();

    await updateMemoramaState(() => {
      const scores = sortedPlayers.reduce<MemoramaGameState["scores"]>(
        (acc, player) => {
          const key = getPlayerKey(player);

          acc[key] = {
            playerKey: key,
            playerName: player.player_name,
            pairs: 0,
          };

          return acc;
        },
        {},
      );

      return {
        ...createInitialMemoramaState(configuredVariant),
        phase: "playing",
        currentTurnKey: firstKey,
        currentTurnName: firstPlayer.player_name,
        scores,
        ...turnTimes,
      };
    });
  };

  const resolveSelectedCards = useCallback(async () => {
    await updateMemoramaState((current) => {
      if (current.phase !== "playing") return current;
      if (!current.isResolving) return current;
      if (current.selectedCardIds.length !== 2) return current;

      const firstCard = getCardById(current.cards, current.selectedCardIds[0]);
      const secondCard = getCardById(current.cards, current.selectedCardIds[1]);

      if (!firstCard || !secondCard || !current.currentTurnKey) {
        return {
          ...current,
          selectedCardIds: [],
          isResolving: false,
          lastResult: null,
          ...getTurnTimes(),
        };
      }

      const isMatch = firstCard.pairId === secondCard.pairId;

      if (isMatch) {
        const nextMatchedCardIds = [
          ...current.matchedCardIds,
          firstCard.id,
          secondCard.id,
        ];

        const currentScore = current.scores[current.currentTurnKey] ?? {
          playerKey: current.currentTurnKey,
          playerName: current.currentTurnName ?? "Jugador",
          pairs: 0,
        };

        const nextScores = {
          ...current.scores,
          [current.currentTurnKey]: {
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
          selectedCardIds: [],
          matchedCardIds: nextMatchedCardIds,
          matchedPairOwners: {
            ...current.matchedPairOwners,
            [firstCard.pairId]: current.currentTurnKey,
          },
          scores: nextScores,
          isResolving: false,
          lastResult: "match",
          winnerKey: winner.winnerKey,
          winnerName: winner.winnerName,
          turnStartedAt: finished ? null : getTurnTimes().turnStartedAt,
          turnEndsAt: finished ? null : getTurnTimes().turnEndsAt,
        };
      }

      const nextPlayer = getNextPlayer(current.currentTurnKey);
      const nextPlayerKey = nextPlayer
        ? getPlayerKey(nextPlayer)
        : current.currentTurnKey;

      return {
        ...current,
        selectedCardIds: [],
        isResolving: false,
        lastResult: "miss",
        currentTurnKey: nextPlayerKey,
        currentTurnName: nextPlayer?.player_name ?? current.currentTurnName,
        ...getTurnTimes(),
      };
    });
  }, [getNextPlayer, updateMemoramaState]);

  const handleTimeoutTurn = useCallback(async () => {
    await updateMemoramaState((current) => {
      if (current.phase !== "playing") return current;
      if (current.isResolving) return current;
      if (!current.turnEndsAt) return current;

      const hasExpired = Date.now() >= new Date(current.turnEndsAt).getTime();

      if (!hasExpired) return current;

      const nextPlayer = getNextPlayer(current.currentTurnKey);
      const nextPlayerKey = nextPlayer
        ? getPlayerKey(nextPlayer)
        : current.currentTurnKey;

      return {
        ...current,
        selectedCardIds: [],
        isResolving: false,
        lastResult: "timeout",
        currentTurnKey: nextPlayerKey,
        currentTurnName: nextPlayer?.player_name ?? current.currentTurnName,
        ...getTurnTimes(),
      };
    });
  }, [getNextPlayer, updateMemoramaState]);

  const handleCardClick = async (cardId: string) => {
    if (!currentPlayer || !currentPlayerKey) return;
    if (gameState.phase !== "playing") return;

    if (!isMyTurn) {
      alert("Todavía no es tu turno.");
      return;
    }

    if (saving || gameState.isResolving) return;

    playFlipSound();

    await updateMemoramaState((current) => {
      if (current.phase !== "playing") return current;
      if (current.currentTurnKey !== currentPlayerKey) return current;
      if (current.isResolving) return current;
      if (current.selectedCardIds.length >= 2) return current;

      const selectedCard = getCardById(current.cards, cardId);

      if (!selectedCard) return current;
      if (current.matchedCardIds.includes(selectedCard.id)) return current;
      if (current.selectedCardIds.includes(selectedCard.id)) return current;

      const nextSelectedCardIds = [...current.selectedCardIds, selectedCard.id];

      return {
        ...current,
        selectedCardIds: nextSelectedCardIds,
        isResolving: nextSelectedCardIds.length === 2,
        lastResult: null,
        turnEndsAt:
          nextSelectedCardIds.length === 2 ? null : current.turnEndsAt,
      };
    });
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

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 250);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (gameState.phase !== "playing") return;
    if (!gameState.isResolving) return;
    if (gameState.selectedCardIds.length !== 2) return;

    if (resolveTimerRef.current) {
      window.clearTimeout(resolveTimerRef.current);
    }

    resolveTimerRef.current = window.setTimeout(() => {
      void resolveSelectedCards();
    }, MEMORAMA_RESOLVE_MS);

    return () => {
      if (resolveTimerRef.current) {
        window.clearTimeout(resolveTimerRef.current);
        resolveTimerRef.current = null;
      }
    };
  }, [
    gameState.phase,
    gameState.isResolving,
    gameState.selectedCardIds,
    resolveSelectedCards,
  ]);

  useEffect(() => {
    if (gameState.phase !== "playing") return;
    if (gameState.isResolving) return;
    if (!gameState.turnEndsAt) return;
    if (turnSecondsLeft > 0) return;

    void handleTimeoutTurn();
  }, [
    gameState.phase,
    gameState.isResolving,
    gameState.turnEndsAt,
    turnSecondsLeft,
    handleTimeoutTurn,
  ]);

  useEffect(() => {
    const soundKey = `${gameState.updatedAt}-${gameState.lastResult}-${gameState.phase}`;

    if (soundKey === lastSoundKeyRef.current) return;

    lastSoundKeyRef.current = soundKey;

    if (gameState.phase === "finished") {
      playWinSound();
      return;
    }

    if (gameState.lastResult === "match") playMatchSound();
    if (gameState.lastResult === "miss") playMissSound();
    if (gameState.lastResult === "timeout") playTimeoutSound();
  }, [gameState.updatedAt, gameState.lastResult, gameState.phase]);

  if (loading) {
    return (
      <GamePageLayout className="bg-black">
        <div className="rounded-[32px] border border-white/10 bg-zinc-950 p-8 text-center">
          <p className="text-2xl font-black">Cargando Memorama...</p>
        </div>
      </GamePageLayout>
    );
  }

  const variantLabel = MEMORAMA_SET_LABELS[gameState.variant.set] ?? "Clásico";
  const variantPreview = MEMORAMA_SETS[gameState.variant.set]?.slice(0, 6) ?? [];
  const isPremiumSet = MEMORAMA_STORE_LOCKED_SETS.includes(
    gameState.variant.set,
  );

    const isGameFinished = gameState.phase === "finished";
  const isDraw = gameState.winnerName === "Empate";
  const isWinner =
    !!currentPlayerKey && gameState.winnerKey === currentPlayerKey;

  const resultTone = isDraw ? "draw" : isWinner ? "win" : "lose";

  const resultTitle = isDraw
    ? "¡Empate!"
    : isWinner
      ? "¡Ganaste!"
      : "Partida terminada";

  const resultSubtitle = isDraw
    ? "Memorama terminó sin ganador único."
    : isWinner
      ? "Encontraste más parejas y ganaste la partida."
      : `${gameState.winnerName ?? "Otro jugador"} ganó esta partida.`;

  return (
    <GamePageLayout className="bg-black">
      <MemoramaHeader
        variantLabel={variantLabel}
        pairs={gameState.variant.pairs}
        isPremiumSet={isPremiumSet}
        variantPreview={variantPreview}
        isHost={isHost}
        onBackToSala={handleBackToSala}
        onCloseRoom={handleCloseRoom}
      />

      <section className="grid gap-5 xl:grid-cols-[340px_1fr]">
        <aside className="space-y-5">
          <MemoramaScorePanel
            players={sortedPlayers}
            scores={gameState.scores}
            currentTurnKey={gameState.currentTurnKey}
            currentPlayerKey={currentPlayerKey}
            getPlayerKey={getPlayerKey}
          />

          <MemoramaStatusPanel
            gameState={gameState}
            isHost={isHost}
            isMyTurn={isMyTurn}
            saving={saving}
            playersCount={sortedPlayers.length}
            turnSecondsLeft={turnSecondsLeft}
            turnSecondsLimit={MEMORAMA_TURN_SECONDS}
            onStartGame={startGame}
            onRematch={handleRematch}
          />
        </aside>

                <MemoramaBoard
          gameState={gameState}
          saving={saving}
          isMyTurn={isMyTurn}
          currentPlayerKey={currentPlayerKey}
          onCardClick={(cardId) => void handleCardClick(cardId)}
        />
      </section>

            <GameResultOverlay
        show={isGameFinished}
        tone={resultTone}
        title={resultTitle}
        subtitle={resultSubtitle}
        winnerName={gameState.winnerName}
        resultText={
          isDraw
            ? "Ambos jugadores terminaron con el mismo marcador."
            : `${gameState.winnerName ?? "El ganador"} ganó Memorama.`
        }
        primaryActionLabel="Volver a sala"
        secondaryActionLabel={isHost ? "Revancha" : undefined}
        onPrimaryAction={handleBackToSala}
        onSecondaryAction={isHost ? handleRematch : undefined}
      />
    </GamePageLayout>
  );
}