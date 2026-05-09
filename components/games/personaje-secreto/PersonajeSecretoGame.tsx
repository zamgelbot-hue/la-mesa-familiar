// 📍 Ruta del archivo: components/games/personaje-secreto/PersonajeSecretoGame.tsx

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { applySingleWinnerMatchRewards } from "@/lib/gameRewards";
import type { PsAnswer, PsGameState, PsGuess, PsQuestion } from "./psTypes";
import {
  createInitialPsGameState,
  getPsGuessResult,
  getPsPlayerKey,
  getPsSuggestedQuestions,
  getRandomFirstTurn,
} from "./psUtils";
import {
  PersonajeActionPanel,
  PersonajeHeader,
  PersonajeHistoryPanel,
  PersonajePendingPanel,
  PersonajeResultPanel,
  PersonajeSecretPicker,
  PersonajeSecretSummary,
  PersonajeStatusPanel,
  PersonajeTurnBanner,
} from "./index";

type PersonajeSecretoGameProps = {
  roomCode: string;
  roomVariant?: string | null;
  roomSettings?: Record<string, unknown> | null;
};

type RoomRow = {
  code: string;
  status: string;
  game_slug: string | null;
  game_variant: string | null;
  room_settings: Record<string, unknown> | null;
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

function getLocalPlayerName(roomCode: string) {
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
}

function getCategoryLabel(roomVariant?: string | null) {
  const labels: Record<string, string> = {
    videojuegos: "Videojuegos",
    peliculas: "Películas",
    deportes: "Deportes",
    anime: "Anime",
    musica: "Música",
    libre: "Libre",
  };

  return labels[roomVariant ?? ""] ?? "Libre";
}

function extractPsState(
  settings: Record<string, unknown> | null | undefined,
): PsGameState {
  const saved = settings?.personaje_secreto as Partial<PsGameState> | undefined;

  if (!saved) return createInitialPsGameState();

  return {
    ...createInitialPsGameState(),
    ...saved,
    secrets: saved.secrets ?? {},
    questions: saved.questions ?? [],
    guesses: saved.guesses ?? [],
    rewards_applied: saved.rewards_applied ?? false,
  };
}

export default function PersonajeSecretoGame({
  roomCode,
  roomVariant,
}: PersonajeSecretoGameProps) {
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const winSoundPlayedRef = useRef(false);
  const lastQuestionCountRef = useRef(0);
  const lastAnsweredCountRef = useRef(0);
  const lastGuessCountRef = useRef(0);
  const lastTurnKeyRef = useRef<string | null>(null);

  const [room, setRoom] = useState<RoomRow | null>(null);
  const [players, setPlayers] = useState<RoomPlayerRow[]>([]);
  const [secretInput, setSecretInput] = useState("");
  const [questionInput, setQuestionInput] = useState("");
  const [guessInput, setGuessInput] = useState("");
  const [gameState, setGameState] = useState<PsGameState>(
    createInitialPsGameState(),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const currentPlayerName = useMemo(() => {
    return getLocalPlayerName(roomCode);
  }, [roomCode]);

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    );
  }, [players]);

  const currentPlayer = useMemo(() => {
    return (
      sortedPlayers.find((player) => player.player_name === currentPlayerName) ??
      null
    );
  }, [sortedPlayers, currentPlayerName]);

  const currentPlayerKey = currentPlayer ? getPsPlayerKey(currentPlayer) : null;
  const isHost = !!currentPlayer?.is_host;

  const opponent = useMemo(() => {
    if (!currentPlayerKey) return null;

    return (
      sortedPlayers.find(
        (player) => getPsPlayerKey(player) !== currentPlayerKey,
      ) ?? null
    );
  }, [sortedPlayers, currentPlayerKey]);

  const opponentKey = opponent ? getPsPlayerKey(opponent) : null;
  const mySecret = currentPlayerKey ? gameState.secrets[currentPlayerKey] : null;

  const allPicked =
    sortedPlayers.length >= 2 &&
    sortedPlayers.every((player) => !!gameState.secrets[getPsPlayerKey(player)]);

  const isMyTurn =
    !!currentPlayerKey && gameState.currentTurnKey === currentPlayerKey;

  const pendingQuestionsForMe = useMemo(() => {
    if (!currentPlayerKey) return [];

    return gameState.questions.filter(
      (question) => question.toKey === currentPlayerKey && !question.answer,
    );
  }, [gameState.questions, currentPlayerKey]);

  const pendingGuessesForMe = useMemo(() => {
    if (!currentPlayerKey) return [];

    return gameState.guesses.filter(
      (guess) =>
        guess.targetKey === currentPlayerKey &&
        guess.result === "needs_confirmation",
    );
  }, [gameState.guesses, currentPlayerKey]);

  const suggestedQuestions = useMemo(() => {
    return getPsSuggestedQuestions(roomVariant);
  }, [roomVariant]);

  const categoryLabel = useMemo(() => {
    return getCategoryLabel(roomVariant);
  }, [roomVariant]);

  const updatePsState = useCallback(
    async (updater: (current: PsGameState) => PsGameState) => {
      if (!room) return;

      setSaving(true);

      const currentSettings = room.room_settings ?? {};
      const currentState = extractPsState(currentSettings);
      const nextState = updater(currentState);

      const nextSettings = {
        ...currentSettings,
        personaje_secreto: nextState,
      };

      const { error } = await supabase
        .from("rooms")
        .update({ room_settings: nextSettings })
        .eq("code", roomCode);

      if (error) {
        console.error("Error actualizando Personaje Secreto:", error);
        alert("No se pudo actualizar la partida.");
      } else {
        setGameState(nextState);
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
    setGameState(extractPsState(data.room_settings));
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

  const playToneSequence = (
    notes: number[],
    type: OscillatorType = "triangle",
    volume = 0.16,
    duration = 0.18,
  ) => {
    try {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;

      const audioContext = new AudioContextClass();

      notes.forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const startAt = audioContext.currentTime + index * 0.11;

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
      console.error("No se pudo reproducir sonido:", error);
    }
  };

  const playWinSound = () => {
    playToneSequence([523.25, 659.25, 783.99, 1046.5], "triangle", 0.22, 0.28);
  };

  const playAskSound = () => {
    playToneSequence([440, 587.33], "sine", 0.12, 0.16);
  };

  const playAnswerSound = () => {
    playToneSequence([659.25, 523.25], "triangle", 0.12, 0.16);
  };

  const playWrongSound = () => {
    playToneSequence([220, 196], "sawtooth", 0.09, 0.18);
  };

  const playConfirmSound = () => {
    playToneSequence([392, 493.88, 587.33], "square", 0.08, 0.14);
  };

  const playTurnSound = () => {
    playToneSequence([329.63, 392], "sine", 0.1, 0.14);
  };

  const playRematchSound = () => {
    playToneSequence([392, 523.25, 392], "triangle", 0.13, 0.16);
  };

  const getOpponentTurn = () => {
    if (!opponent || !opponentKey) return null;

    return {
      key: opponentKey,
      name: opponent.player_name,
    };
  };

  const confirmSecret = async () => {
    if (!currentPlayer || !currentPlayerKey) return;

    const cleanSecret = secretInput.trim();

    if (cleanSecret.length < 3) {
      alert("Escribe un personaje con mínimo 3 letras.");
      return;
    }

    await updatePsState((current) => {
      const next: PsGameState = {
        ...current,
        secrets: {
          ...current.secrets,
          [currentPlayerKey]: {
            playerKey: currentPlayerKey,
            playerName: currentPlayer.player_name,
            secret: cleanSecret,
            pickedAt: new Date().toISOString(),
          },
        },
      };

      const playerKeys = sortedPlayers.map((player) => getPsPlayerKey(player));

      const readyToPlay =
        playerKeys.length >= 2 &&
        playerKeys.every((key) => !!next.secrets[key]);

      if (readyToPlay && next.phase === "picking") {
        const first = getRandomFirstTurn(sortedPlayers);
        const firstKey = first ? getPsPlayerKey(first) : playerKeys[0];

        next.phase = "playing";
        next.currentTurnKey = firstKey;
        next.currentTurnName =
          sortedPlayers.find((player) => getPsPlayerKey(player) === firstKey)
            ?.player_name ?? null;
        next.turnNumber = 1;
      }

      return next;
    });

    setSecretInput("");
  };

  const askQuestion = async () => {
    if (!currentPlayer || !currentPlayerKey || !opponent || !opponentKey) {
      return;
    }

    if (!isMyTurn) {
      alert("Todavía no es tu turno.");
      return;
    }

    const cleanQuestion = questionInput.trim();

    if (cleanQuestion.length < 4) {
      alert("Escribe una pregunta válida.");
      return;
    }

    const question: PsQuestion = {
      id: crypto.randomUUID(),
      fromKey: currentPlayerKey,
      fromName: currentPlayer.player_name,
      toKey: opponentKey,
      toName: opponent.player_name,
      question: cleanQuestion,
      answer: null,
      answeredAt: null,
      createdAt: new Date().toISOString(),
    };

    await updatePsState((current) => ({
      ...current,
      questions: [question, ...(current.questions ?? [])].slice(0, 60),
    }));

    setQuestionInput("");
  };

  const answerQuestion = async (questionId: string, answer: PsAnswer) => {
    if (!currentPlayer || !currentPlayerKey) return;

    await updatePsState((current) => ({
      ...current,
      currentTurnKey: currentPlayerKey,
      currentTurnName: currentPlayer.player_name,
      turnNumber: (current.turnNumber ?? 0) + 1,
      questions: (current.questions ?? []).map((question) =>
        question.id === questionId
          ? {
              ...question,
              answer,
              answeredAt: new Date().toISOString(),
            }
          : question,
      ),
    }));
  };

  const submitGuess = async () => {
    if (!currentPlayer || !currentPlayerKey || !opponent || !opponentKey) {
      return;
    }

    if (!isMyTurn) {
      alert("Todavía no es tu turno.");
      return;
    }

    const cleanGuess = guessInput.trim();

    if (cleanGuess.length < 2) {
      alert("Escribe una respuesta válida.");
      return;
    }

    const opponentSecret = gameState.secrets[opponentKey]?.secret;

    if (!opponentSecret) {
      alert("Tu rival todavía no ha elegido personaje.");
      return;
    }

    const result = getPsGuessResult(cleanGuess, opponentSecret);
    const nextTurn = getOpponentTurn();

    await updatePsState((current) => {
      const nextGuess: PsGuess = {
        id: crypto.randomUUID(),
        playerKey: currentPlayerKey,
        playerName: currentPlayer.player_name,
        targetKey: opponentKey,
        targetName: opponent.player_name,
        guess: cleanGuess,
        result,
        createdAt: new Date().toISOString(),
        resolvedAt:
          result === "needs_confirmation" ? null : new Date().toISOString(),
      };

      return {
        ...current,
        phase: result === "correct" ? "finished" : current.phase,
        winnerKey: result === "correct" ? currentPlayerKey : current.winnerKey,
        winnerName:
          result === "correct" ? currentPlayer.player_name : current.winnerName,
        currentTurnKey:
          result === "correct" || result === "needs_confirmation"
            ? current.currentTurnKey
            : nextTurn?.key ?? current.currentTurnKey,
        currentTurnName:
          result === "correct" || result === "needs_confirmation"
            ? current.currentTurnName
            : nextTurn?.name ?? current.currentTurnName,
        turnNumber:
          result === "wrong"
            ? (current.turnNumber ?? 0) + 1
            : current.turnNumber,
        guesses: [nextGuess, ...(current.guesses ?? [])].slice(0, 20),
      };
    });

    setGuessInput("");
  };

  const resolveGuessConfirmation = async (
    guessId: string,
    result: "correct" | "wrong",
  ) => {
    if (!currentPlayer || !currentPlayerKey) return;

    const accepted = result === "correct";

    await updatePsState((current) => {
      const guess = current.guesses.find((item) => item.id === guessId);
      if (!guess) return current;

      return {
        ...current,
        phase: accepted ? "finished" : current.phase,
        winnerKey: accepted ? guess.playerKey : current.winnerKey,
        winnerName: accepted ? guess.playerName : current.winnerName,
        currentTurnKey: accepted ? current.currentTurnKey : currentPlayerKey,
        currentTurnName: accepted
          ? current.currentTurnName
          : currentPlayer.player_name,
        turnNumber: accepted
          ? current.turnNumber
          : (current.turnNumber ?? 0) + 1,
        guesses: current.guesses.map((item) =>
          item.id === guessId
            ? {
                ...item,
                result,
                resolvedAt: new Date().toISOString(),
              }
            : item,
        ),
      };
    });
  };

  const handleRematch = async () => {
    playRematchSound();

    if (!room) return;

    const currentSettings = room.room_settings ?? {};
    const nextSettings = {
      ...currentSettings,
      personaje_secreto: createInitialPsGameState(),
    };

    const { error } = await supabase
      .from("rooms")
      .update({
        status: "playing",
        room_settings: nextSettings,
      })
      .eq("code", roomCode);

    if (error) {
      console.error("Error iniciando revancha:", error);
      alert("No se pudo iniciar la revancha.");
      return;
    }

    setSecretInput("");
    setQuestionInput("");
    setGuessInput("");
    setGameState(createInitialPsGameState());
    setRoom((prev) =>
      prev ? { ...prev, status: "playing", room_settings: nextSettings } : prev,
    );
  };

  const handleBackToSala = async () => {
    const ok = window.confirm(
      "¿Quieres volver a sala? Todos los jugadores regresarán a la sala.",
    );

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
      .channel(`personaje-secreto-${roomCode}`)
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
    async function applyMatchRewards() {
      if (!room || !isHost) return;
      if (gameState.phase !== "finished" || !gameState.winnerKey) return;
      if (gameState.rewards_applied) return;

      const winner = sortedPlayers.find(
        (player) => getPsPlayerKey(player) === gameState.winnerKey,
      );

      await applySingleWinnerMatchRewards({
        supabase,
        winnerUserId: winner?.user_id,
        participantUserIds: sortedPlayers.map((player) => player.user_id),
        gameType: "personaje-secreto",
      });

      await updatePsState((current) => ({
        ...current,
        rewards_applied: true,
      }));
    }

    void applyMatchRewards();
  }, [
    gameState.phase,
    gameState.winnerKey,
    gameState.rewards_applied,
    isHost,
    room,
    sortedPlayers,
    supabase,
    updatePsState,
  ]);

  useEffect(() => {
    if (gameState.phase === "finished" && gameState.winnerKey) {
      if (!winSoundPlayedRef.current) {
        winSoundPlayedRef.current = true;
        playWinSound();
      }
    }

    if (gameState.phase !== "finished") {
      winSoundPlayedRef.current = false;
    }
  }, [gameState.phase, gameState.winnerKey]);

  useEffect(() => {
    const questionCount = gameState.questions.length;
    const answeredCount = gameState.questions.filter((q) => q.answer).length;
    const guessCount = gameState.guesses.length;

    if (
      lastQuestionCountRef.current > 0 &&
      questionCount > lastQuestionCountRef.current
    ) {
      playAskSound();
    }

    if (
      lastAnsweredCountRef.current > 0 &&
      answeredCount > lastAnsweredCountRef.current
    ) {
      playAnswerSound();
    }

    if (
      lastGuessCountRef.current > 0 &&
      guessCount > lastGuessCountRef.current
    ) {
      const latestGuess = gameState.guesses[0];

      if (latestGuess?.result === "wrong") {
        playWrongSound();
      }

      if (latestGuess?.result === "needs_confirmation") {
        playConfirmSound();
      }
    }

    if (
      lastTurnKeyRef.current &&
      gameState.currentTurnKey &&
      lastTurnKeyRef.current !== gameState.currentTurnKey &&
      gameState.phase === "playing"
    ) {
      playTurnSound();
    }

    lastQuestionCountRef.current = questionCount;
    lastAnsweredCountRef.current = answeredCount;
    lastGuessCountRef.current = guessCount;
    lastTurnKeyRef.current = gameState.currentTurnKey;
  }, [
    gameState.questions,
    gameState.guesses,
    gameState.currentTurnKey,
    gameState.phase,
  ]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto max-w-5xl rounded-[32px] border border-white/10 bg-zinc-950 p-8 text-center">
          <p className="text-2xl font-black">Cargando Personaje Secreto...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white md:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <PersonajeHeader
          categoryLabel={categoryLabel}
          isHost={isHost}
          onBackToSala={handleBackToSala}
          onCloseRoom={handleCloseRoom}
        />

        <section className="grid gap-5 lg:grid-cols-[1fr_420px]">
          <div className="space-y-5">
            <PersonajeStatusPanel
              players={sortedPlayers}
              gameState={gameState}
              currentPlayerKey={currentPlayerKey}
              mySecretText={mySecret?.secret ?? null}
            />

            <PersonajeTurnBanner
              show={gameState.phase === "playing"}
              currentTurnName={gameState.currentTurnName}
            />

            <PersonajeSecretPicker
              phase={gameState.phase}
              hasMySecret={!!mySecret}
              secretInput={secretInput}
              saving={saving}
              onSecretInputChange={setSecretInput}
              onConfirmSecret={() => void confirmSecret()}
            />

            <PersonajeActionPanel
              show={gameState.phase === "playing"}
              questionInput={questionInput}
              guessInput={guessInput}
              suggestedQuestions={suggestedQuestions}
              saving={saving}
              allPicked={allPicked}
              isMyTurn={isMyTurn}
              hasPendingQuestionsForMe={pendingQuestionsForMe.length > 0}
              hasPendingGuessesForMe={pendingGuessesForMe.length > 0}
              onQuestionInputChange={setQuestionInput}
              onGuessInputChange={setGuessInput}
              onAskQuestion={() => void askQuestion()}
              onSubmitGuess={() => void submitGuess()}
            />

            <PersonajeSecretSummary
              players={sortedPlayers}
              gameState={gameState}
              currentPlayerKey={currentPlayerKey}
            />
          </div>

          <aside className="space-y-5">
            <PersonajePendingPanel
              pendingQuestionsForMe={pendingQuestionsForMe}
              pendingGuessesForMe={pendingGuessesForMe}
              saving={saving}
              onAnswerQuestion={(questionId, answer) =>
                void answerQuestion(questionId, answer)
              }
              onConfirmGuess={(guessId, result) =>
                void resolveGuessConfirmation(guessId, result)
              }
            />

            <PersonajeHistoryPanel
              questions={gameState.questions}
              guesses={gameState.guesses}
            />
          </aside>
        </section>
      </div>

      <PersonajeResultPanel
        show={gameState.phase === "finished"}
        winnerName={gameState.winnerName}
        isWinner={gameState.winnerKey === currentPlayerKey}
        isHost={isHost}
        onBackToSala={handleBackToSala}
        onRematch={() => void handleRematch()}
      />
    </main>
  );
}