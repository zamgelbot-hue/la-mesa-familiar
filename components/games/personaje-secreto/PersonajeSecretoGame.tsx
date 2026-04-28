// 📍 components/games/personaje-secreto/PersonajeSecretoGame.tsx

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { PsAnswer, PsGameState, PsQuestion } from "./psTypes";
import {
  createInitialPsGameState,
  getPsAnswerEmoji,
  getPsAnswerLabel,
  getPsGuessResult,
  getPsPlayerKey,
  getPsSuggestedQuestions,
  getRandomFirstTurn,
} from "./psUtils";

type PersonajeSecretoGameProps = {
  roomCode: string;
  roomVariant?: string | null;
  roomSettings?: Record<string, any> | null;
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
  const [gameState, setGameState] = useState<PsGameState>(createInitialPsGameState());
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

  const currentPlayerKey = currentPlayer ? getPsPlayerKey(currentPlayer) : null;
  const isHost = !!currentPlayer?.is_host;

  const opponent = useMemo(() => {
    if (!currentPlayerKey) return null;
    return sortedPlayers.find((p) => getPsPlayerKey(p) !== currentPlayerKey) ?? null;
  }, [sortedPlayers, currentPlayerKey]);

  const opponentKey = opponent ? getPsPlayerKey(opponent) : null;
  const mySecret = currentPlayerKey ? gameState.secrets[currentPlayerKey] : null;

  const allPicked =
    sortedPlayers.length >= 2 &&
    sortedPlayers.every((p) => !!gameState.secrets[getPsPlayerKey(p)]);

  const isMyTurn = !!currentPlayerKey && gameState.currentTurnKey === currentPlayerKey;

  const pendingQuestionsForMe = useMemo(() => {
    if (!currentPlayerKey) return [];
    return gameState.questions.filter(
      (q) => q.toKey === currentPlayerKey && !q.answer,
    );
  }, [gameState.questions, currentPlayerKey]);

  const pendingGuessesForMe = useMemo(() => {
    if (!currentPlayerKey) return [];
    return gameState.guesses.filter(
      (g) => g.targetKey === currentPlayerKey && g.result === "needs_confirmation",
    );
  }, [gameState.guesses, currentPlayerKey]);

  const answeredQuestions = useMemo(() => {
    return gameState.questions.filter((q) => q.answer);
  }, [gameState.questions]);

  const answeredQuestionsByPlayer = useMemo(() => {
  return sortedPlayers.map((player) => {
    const key = getPsPlayerKey(player);

    return {
      playerKey: key,
      playerName: player.player_name,
      isMe: key === currentPlayerKey,
      clues: gameState.questions.filter(
        (question) => question.toKey === key && question.answer,
      ),
    };
  });
}, [sortedPlayers, gameState.questions, currentPlayerKey]);

  const suggestedQuestions = useMemo(() => {
    return getPsSuggestedQuestions(roomVariant);
  }, [roomVariant]);

  const categoryLabel = useMemo(() => {
    const labels: Record<string, string> = {
      videojuegos: "Videojuegos",
      peliculas: "Películas",
      deportes: "Deportes",
      anime: "Anime",
      musica: "Música",
      libre: "Libre",
    };

    return labels[roomVariant ?? ""] ?? "Libre";
  }, [roomVariant]);

  const extractPsState = (settings: Record<string, any> | null | undefined): PsGameState => {
    const saved = settings?.personaje_secreto;

    if (!saved) return createInitialPsGameState();

    return {
      ...createInitialPsGameState(),
      ...saved,
      secrets: saved.secrets ?? {},
      questions: saved.questions ?? [],
      guesses: saved.guesses ?? [],
    };
  };

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
      } else {
        setGameState(nextState);
        setRoom((prev) => (prev ? { ...prev, room_settings: nextSettings } : prev));
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
      .select("id, room_code, user_id, player_name, is_host, is_guest, is_ready, created_at")
      .eq("room_code", roomCode)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error cargando jugadores:", error);
      return;
    }

    setPlayers((data ?? []) as RoomPlayerRow[]);
  }, [roomCode, supabase]);

  const getOpponentTurn = () => {
    if (!opponent || !opponentKey) return null;

    return {
      key: opponentKey,
      name: opponent.player_name,
    };
  };

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

      const playerKeys = sortedPlayers.map((p) => getPsPlayerKey(p));
      const readyToPlay =
        playerKeys.length >= 2 && playerKeys.every((key) => !!next.secrets[key]);

      if (readyToPlay && next.phase === "picking") {
        const first = getRandomFirstTurn(sortedPlayers);
        const firstKey = first ? getPsPlayerKey(first) : playerKeys[0];

        next.phase = "playing";
        next.currentTurnKey = firstKey;
        next.currentTurnName =
          sortedPlayers.find((p) => getPsPlayerKey(p) === firstKey)?.player_name ?? null;
        next.turnNumber = 1;
      }

      return next;
    });

    setSecretInput("");
  };

  const askQuestion = async (presetQuestion?: string) => {
    if (!currentPlayer || !currentPlayerKey || !opponent || !opponentKey) return;

    if (!isMyTurn) {
      alert("Todavía no es tu turno.");
      return;
    }

    const cleanQuestion = (presetQuestion ?? questionInput).trim();

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
    if (!currentPlayer || !currentPlayerKey || !opponent || !opponentKey) return;

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
      const nextGuess = {
        id: crypto.randomUUID(),
        playerKey: currentPlayerKey,
        playerName: currentPlayer.player_name,
        targetKey: opponentKey,
        targetName: opponent.player_name,
        guess: cleanGuess,
        result,
        createdAt: new Date().toISOString(),
        resolvedAt: result === "needs_confirmation" ? null : new Date().toISOString(),
      };

      return {
        ...current,
        phase: result === "correct" ? "finished" : current.phase,
        winnerKey: result === "correct" ? currentPlayerKey : current.winnerKey,
        winnerName: result === "correct" ? currentPlayer.player_name : current.winnerName,
        currentTurnKey:
          result === "correct" || result === "needs_confirmation"
            ? current.currentTurnKey
            : nextTurn?.key ?? current.currentTurnKey,
        currentTurnName:
          result === "correct" || result === "needs_confirmation"
            ? current.currentTurnName
            : nextTurn?.name ?? current.currentTurnName,
        turnNumber:
          result === "wrong" ? (current.turnNumber ?? 0) + 1 : current.turnNumber,
        guesses: [nextGuess, ...(current.guesses ?? [])].slice(0, 20),
      };
    });

    setGuessInput("");
  };

  const resolveGuessConfirmation = async (guessId: string, accepted: boolean) => {
    if (!currentPlayer || !currentPlayerKey) return;

    await updatePsState((current) => {
      const guess = current.guesses.find((item) => item.id === guessId);
      if (!guess) return current;

      return {
        ...current,
        phase: accepted ? "finished" : current.phase,
        winnerKey: accepted ? guess.playerKey : current.winnerKey,
        winnerName: accepted ? guess.playerName : current.winnerName,
        currentTurnKey: accepted ? current.currentTurnKey : currentPlayerKey,
        currentTurnName: accepted ? current.currentTurnName : currentPlayer.player_name,
        turnNumber: accepted ? current.turnNumber : (current.turnNumber ?? 0) + 1,
        guesses: current.guesses.map((item) =>
          item.id === guessId
            ? {
                ...item,
                result: accepted ? "correct" : "wrong",
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

      if (latestGuess?.result === "correct") {
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
        <section className="rounded-[32px] border border-orange-500/20 bg-zinc-950/95 p-6 shadow-[0_0_40px_rgba(249,115,22,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-300/80">
                La Mesa Familiar
              </p>
              <h1 className="mt-2 text-3xl font-black md:text-4xl">
                🕵️ Personaje Secreto
              </h1>
              <p className="mt-2 text-sm text-white/60">
                Categoría:{" "}
                <span className="font-bold text-orange-300">{categoryLabel}</span>
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

        <section className="grid gap-5 lg:grid-cols-[1fr_420px]">
          <div className="space-y-5">
            <div className="rounded-[28px] border border-white/10 bg-zinc-950/90 p-5">
              <h2 className="text-xl font-black">🧩 Estado de la partida</h2>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {sortedPlayers.map((player) => {
                  const key = getPsPlayerKey(player);
                  const picked = !!gameState.secrets[key];
                  const isMe = key === currentPlayerKey;

                  return (
                    <div
                      key={player.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                    >
                      <p className="font-black">
                        {player.player_name} {isMe ? "(Tú)" : ""}
                      </p>
                      <p className={picked ? "text-emerald-300" : "text-yellow-300"}>
                        {picked ? "Personaje elegido" : "Eligiendo personaje..."}
                      </p>

                      {isMe && mySecret && (
                        <p className="mt-2 text-sm text-white/60">
                          Tu personaje:{" "}
                          <span className="font-bold text-white">{mySecret.secret}</span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {gameState.phase === "playing" && (
              <div className="rounded-[28px] border border-purple-500/20 bg-purple-500/10 p-5">
                <h2 className="text-xl font-black text-purple-200">🎲 Turno actual</h2>
                <p className="mt-2 text-white/70">
                  Le toca a{" "}
                  <span className="font-black text-white">
                    {gameState.currentTurnName ?? "Jugador"}
                  </span>
                </p>
              </div>
            )}

            {gameState.phase === "picking" && !mySecret && (
              <div className="rounded-[28px] border border-orange-500/20 bg-zinc-950/90 p-5">
                <h2 className="text-xl font-black">🎭 Elige tu personaje secreto</h2>
                <p className="mt-2 text-sm text-white/60">
                  Escríbelo bien. El rival no podrá verlo.
                </p>

                <div className="mt-4 flex flex-col gap-3 md:flex-row">
                  <input
                    value={secretInput}
                    onChange={(e) => setSecretInput(e.target.value)}
                    placeholder="Ejemplo: Mario Bros"
                    className="min-h-[48px] flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-orange-400"
                  />

                  <button
                    type="button"
                    disabled={saving}
                    onClick={confirmSecret}
                    className="rounded-2xl bg-orange-500 px-5 py-3 font-black text-black hover:bg-orange-400 disabled:opacity-60"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            )}

            {gameState.phase === "picking" && mySecret && (
              <div className="rounded-[28px] border border-yellow-500/20 bg-yellow-500/10 p-5">
                <h2 className="text-xl font-black text-yellow-200">
                  ⏳ Esperando al otro jugador...
                </h2>
              </div>
            )}

            {gameState.phase === "playing" && (
              <>
                <div className="rounded-[28px] border border-emerald-500/20 bg-zinc-950/90 p-5">
                  <h2 className="text-xl font-black text-emerald-300">
                    💬 Haz tu pregunta
                  </h2>
                  <p className="mt-2 text-sm text-white/60">
                    Solo puedes preguntar cuando sea tu turno.
                  </p>

                  <div className="mt-4 flex flex-col gap-3 md:flex-row">
                    <input
                      value={questionInput}
                      onChange={(e) => setQuestionInput(e.target.value)}
                      placeholder="Ejemplo: ¿Tu personaje usa gorra?"
                      disabled={!isMyTurn || pendingQuestionsForMe.length > 0}
                      className="min-h-[48px] flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-emerald-400 disabled:opacity-50"
                    />

                    <button
                      type="button"
                      disabled={saving || !allPicked || !isMyTurn || pendingQuestionsForMe.length > 0}
                      onClick={() => askQuestion()}
                      className="rounded-2xl bg-emerald-500 px-5 py-3 font-black text-black hover:bg-emerald-400 disabled:opacity-60"
                    >
                      Preguntar
                    </button>
                  </div>
                </div>

                <div className="rounded-[28px] border border-sky-500/20 bg-zinc-950/90 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-xl font-black text-sky-200">
                      💡 Preguntas sugeridas
                    </h2>
                    <span className="text-xs font-bold text-white/40">
                      Desliza ↓
                    </span>
                  </div>

                  <div className="mt-4 max-h-[140px] overflow-y-auto pr-2">
                    <div className="flex flex-wrap gap-2">
                      {suggestedQuestions.map((question) => (
                        <button
                          key={question}
                          type="button"
                          onClick={() => setQuestionInput(question)}
                          disabled={!isMyTurn}
                          className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/80 hover:border-orange-400/60 hover:bg-orange-500/10 disabled:opacity-40"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-orange-500/20 bg-zinc-950/90 p-5">
                  <h2 className="text-xl font-black text-orange-300">
                    🕵️ Adivinar personaje
                  </h2>

                  <div className="mt-4 flex flex-col gap-3 md:flex-row">
                    <input
                      value={guessInput}
                      onChange={(e) => setGuessInput(e.target.value)}
                      placeholder="Ejemplo: Mario Bros"
                      disabled={!isMyTurn || pendingGuessesForMe.length > 0}
                      className="min-h-[48px] flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-orange-400 disabled:opacity-50"
                    />

                    <button
                      type="button"
                      disabled={saving || !allPicked || !isMyTurn || pendingGuessesForMe.length > 0}
                      onClick={submitGuess}
                      className="rounded-2xl bg-orange-500 px-5 py-3 font-black text-black hover:bg-orange-400 disabled:opacity-60"
                    >
                      Adivinar
                    </button>
                  </div>
                </div>
              </>
            )}

            {gameState.phase === "finished" && (
              <div className="relative overflow-hidden rounded-[32px] border border-orange-500/40 bg-gradient-to-br from-orange-500/20 via-zinc-950 to-yellow-500/10 p-8 text-center shadow-[0_0_60px_rgba(249,115,22,0.18)]">
                <div className="pointer-events-none absolute inset-0 opacity-20">
                  <div className="absolute left-8 top-6 text-5xl">🎉</div>
                  <div className="absolute right-10 top-10 text-5xl">🏆</div>
                  <div className="absolute bottom-8 left-12 text-5xl">✨</div>
                  <div className="absolute bottom-6 right-14 text-5xl">🎊</div>
                </div>

                <div className="relative z-10">
                  <p className="text-sm font-black uppercase tracking-[0.24em] text-orange-300">
                    Ganador de la partida
                  </p>

                  <h2 className="mt-3 text-5xl font-black text-white md:text-6xl">
                    {gameState.winnerName ?? "Jugador"}
                  </h2>

                  <p className="mx-auto mt-3 max-w-xl text-sm text-white/60">
                    Descubrió el personaje secreto y ganó la partida.
                  </p>

                  <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={handleRematch}
                      className="rounded-2xl bg-orange-500 px-6 py-3 font-black text-black hover:bg-orange-400"
                    >
                      Revancha
                    </button>

                    <button
                      type="button"
                      onClick={handleBackToSala}
                      className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 font-black text-white hover:bg-white/10"
                    >
                      Volver a sala
                    </button>

                    {isHost && (
                      <button
                        type="button"
                        onClick={handleCloseRoom}
                        className="rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-3 font-black text-red-200 hover:bg-red-500/20"
                      >
                        Terminar sala
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-5">
            {pendingGuessesForMe.length > 0 && (
              <div className="rounded-[28px] border border-red-500/20 bg-red-500/10 p-5">
                <h2 className="text-xl font-black text-red-200">
                  ⚠️ Confirmación pendiente
                </h2>

                <div className="mt-4 space-y-3">
                  {pendingGuessesForMe.map((guess) => (
                    <div
                      key={guess.id}
                      className="rounded-2xl border border-white/10 bg-black/30 p-4"
                    >
                      <p className="text-sm text-white/60">
                        {guess.playerName} cree que tu personaje es:
                      </p>
                      <p className="mt-2 text-xl font-black text-white">{guess.guess}</p>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => resolveGuessConfirmation(guess.id, true)}
                          className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-black text-black hover:bg-emerald-400"
                        >
                          Sí, correcto
                        </button>
                        <button
                          type="button"
                          onClick={() => resolveGuessConfirmation(guess.id, false)}
                          className="rounded-xl bg-red-500 px-3 py-2 text-sm font-black text-white hover:bg-red-400"
                        >
                          No
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pendingQuestionsForMe.length > 0 && (
              <div className="rounded-[28px] border border-yellow-500/20 bg-yellow-500/10 p-5">
                <h2 className="text-xl font-black text-yellow-200">
                  ❓ Te preguntaron
                </h2>

                <div className="mt-4 space-y-3">
                  {pendingQuestionsForMe.map((question) => (
                    <div
                      key={question.id}
                      className="rounded-2xl border border-white/10 bg-black/30 p-4"
                    >
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/40">
                        {question.fromName}
                      </p>
                      <p className="mt-2 font-bold text-white">{question.question}</p>

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => answerQuestion(question.id, "si")}
                          className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-black text-black hover:bg-emerald-400"
                        >
                          Sí
                        </button>
                        <button
                          type="button"
                          onClick={() => answerQuestion(question.id, "no")}
                          className="rounded-xl bg-red-500 px-3 py-2 text-sm font-black text-white hover:bg-red-400"
                        >
                          No
                        </button>
                        <button
                          type="button"
                          onClick={() => answerQuestion(question.id, "probablemente")}
                          className="rounded-xl bg-yellow-400 px-3 py-2 text-sm font-black text-black hover:bg-yellow-300"
                        >
                          Prob.
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-[28px] border border-white/10 bg-zinc-950/90 p-5">
              <h2 className="text-xl font-black">💬 Chat de juego</h2>

              <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
                {gameState.questions.length === 0 && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/50">
                    Todavía no hay preguntas.
                  </div>
                )}

                {gameState.questions.map((question) => (
                  <div
                    key={question.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-300/80">
                      {question.fromName} preguntó
                    </p>
                    <p className="mt-2 font-bold">{question.question}</p>

                    {question.answer ? (
                      <p className="mt-3 rounded-xl bg-black/30 px-3 py-2 text-sm font-bold text-white/80">
                        {getPsAnswerEmoji(question.answer)} {question.toName}:{" "}
                        {getPsAnswerLabel(question.answer)}
                      </p>
                    ) : (
                      <p className="mt-3 text-sm font-bold text-yellow-300">
                        Esperando respuesta...
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

<div className="rounded-[28px] border border-emerald-500/20 bg-zinc-950/90 p-5">
  <h2 className="text-xl font-black text-emerald-300">
    ✅ Pistas confirmadas
  </h2>

  <div className="mt-4 space-y-4">
    {answeredQuestions.length === 0 && (
      <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/50">
        Aquí aparecerán las respuestas confirmadas de cada jugador.
      </p>
    )}

    {answeredQuestionsByPlayer.map((group, index) => (
      <div
        key={group.playerKey}
        className={
          group.isMe
            ? "rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4"
            : "rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4"
        }
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-black text-white">
            {group.isMe
              ? "🧑 Tus pistas"
              : `${index === 0 ? "🕵️" : "🎭"} Pistas de ${group.playerName}`}
          </h3>

          <span
            className={
              group.isMe
                ? "rounded-full bg-orange-500/15 px-2 py-1 text-xs font-bold text-orange-300"
                : "rounded-full bg-sky-500/15 px-2 py-1 text-xs font-bold text-sky-300"
            }
          >
            {group.clues.length}
          </span>
        </div>

        <div className="mt-3 max-h-[220px] space-y-2 overflow-y-auto pr-1">
          {group.clues.length === 0 && (
            <p className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/45">
              Sin pistas todavía.
            </p>
          )}

          {group.clues.map((question) => (
            <div
              key={question.id}
              className="rounded-xl border border-white/10 bg-black/25 px-3 py-2"
            >
              <p className="text-sm font-bold text-white">
                {question.question}
              </p>

              {question.answer && (
                <p className="mt-1 text-sm text-white/70">
                  {getPsAnswerEmoji(question.answer)}{" "}
                  {getPsAnswerLabel(question.answer)}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
</div>

{gameState.guesses.length > 0 && (
  <div className="rounded-[28px] border border-white/10 bg-zinc-950/90 p-5">
    <h2 className="text-xl font-black">🎯 Intentos</h2>

    <div className="mt-4 space-y-2">
      {gameState.guesses.map((guess) => (
        <div
          key={guess.id}
          className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
        >
          <p className="text-sm text-white/70">
            <span className="font-bold text-white">{guess.playerName}</span>{" "}
            intentó:{" "}
            <span className="font-bold text-orange-300">{guess.guess}</span>
          </p>
          <p
            className={
              guess.result === "correct"
                ? "text-sm font-bold text-emerald-300"
                : guess.result === "needs_confirmation"
                  ? "text-sm font-bold text-yellow-300"
                  : "text-sm font-bold text-red-300"
            }
          >
            {guess.result === "correct"
              ? "Correcto"
              : guess.result === "needs_confirmation"
                ? "Esperando confirmación"
                : "Incorrecto"}
          </p>
        </div>
      ))}
    </div>
  </div>
)}
