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
  getPsPlayerKey,
  getPsSuggestedQuestions,
  isClosePsGuess,
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

  const opponent = useMemo(() => {
    if (!currentPlayerKey) return null;
    return sortedPlayers.find((p) => getPsPlayerKey(p) !== currentPlayerKey) ?? null;
  }, [sortedPlayers, currentPlayerKey]);

  const opponentKey = opponent ? getPsPlayerKey(opponent) : null;

  const mySecret = currentPlayerKey ? gameState.secrets[currentPlayerKey] : null;
  const allPicked =
    sortedPlayers.length >= 2 &&
    sortedPlayers.every((p) => !!gameState.secrets[getPsPlayerKey(p)]);

  const pendingQuestionsForMe = useMemo(() => {
    if (!currentPlayerKey) return [];
    return gameState.questions.filter(
      (q) => q.toKey === currentPlayerKey && !q.answer,
    );
  }, [gameState.questions, currentPlayerKey]);

  const answeredQuestions = useMemo(() => {
    return gameState.questions.filter((q) => q.answer);
  }, [gameState.questions]);

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

    setRoom((data ?? null) as RoomRow | null);
    setGameState(extractPsState(data?.room_settings));
  }, [roomCode, supabase]);

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

      if (readyToPlay) {
        next.phase = "playing";
      }

      return next;
    });

    setSecretInput("");
  };

  const askQuestion = async (presetQuestion?: string) => {
    if (!currentPlayer || !currentPlayerKey || !opponent || !opponentKey) return;

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
    await updatePsState((current) => ({
      ...current,
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
    if (!currentPlayer || !currentPlayerKey || !opponentKey) return;

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

    const correct = isClosePsGuess(cleanGuess, opponentSecret);

    await updatePsState((current) => {
      const nextGuess = {
        id: crypto.randomUUID(),
        playerKey: currentPlayerKey,
        playerName: currentPlayer.player_name,
        targetKey: opponentKey,
        guess: cleanGuess,
        result: correct ? ("correct" as const) : ("wrong" as const),
        createdAt: new Date().toISOString(),
      };

      return {
        ...current,
        phase: correct ? "finished" : current.phase,
        winnerKey: correct ? currentPlayerKey : current.winnerKey,
        winnerName: correct ? currentPlayer.player_name : current.winnerName,
        guesses: [nextGuess, ...(current.guesses ?? [])].slice(0, 20),
      };
    });

    setGuessInput("");
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
                Personaje Secreto
              </h1>
              <p className="mt-2 text-sm text-white/60">
                Categoría:{" "}
                <span className="font-bold text-orange-300">{categoryLabel}</span>
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push(`/sala/${roomCode}`)}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white hover:bg-white/10"
            >
              Volver a sala
            </button>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_420px]">
          <div className="space-y-5">
            <div className="rounded-[28px] border border-white/10 bg-zinc-950/90 p-5">
              <h2 className="text-xl font-black">Estado de la partida</h2>

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

            {gameState.phase === "picking" && !mySecret && (
              <div className="rounded-[28px] border border-orange-500/20 bg-zinc-950/90 p-5">
                <h2 className="text-xl font-black">Elige tu personaje secreto</h2>
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
                  Esperando al otro jugador...
                </h2>
              </div>
            )}

            {gameState.phase === "playing" && (
              <>
                <div className="rounded-[28px] border border-emerald-500/20 bg-zinc-950/90 p-5">
                  <h2 className="text-xl font-black text-emerald-300">
                    Haz tu pregunta
                  </h2>
                  <p className="mt-2 text-sm text-white/60">
                    El rival solo podrá responder con Sí, No o Probablemente.
                  </p>

                  <div className="mt-4 flex flex-col gap-3 md:flex-row">
                    <input
                      value={questionInput}
                      onChange={(e) => setQuestionInput(e.target.value)}
                      placeholder="Ejemplo: ¿Tu personaje usa gorra?"
                      className="min-h-[48px] flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-emerald-400"
                    />

                    <button
                      type="button"
                      disabled={saving || !allPicked}
                      onClick={() => askQuestion()}
                      className="rounded-2xl bg-emerald-500 px-5 py-3 font-black text-black hover:bg-emerald-400 disabled:opacity-60"
                    >
                      Preguntar
                    </button>
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-zinc-950/90 p-5">
                  <h2 className="text-xl font-black">Preguntas sugeridas</h2>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {suggestedQuestions.map((question) => (
                      <button
                        key={question}
                        type="button"
                        onClick={() => setQuestionInput(question)}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/80 hover:border-orange-400/60 hover:bg-orange-500/10"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-[28px] border border-orange-500/20 bg-zinc-950/90 p-5">
                  <h2 className="text-xl font-black text-orange-300">
                    Adivinar personaje
                  </h2>

                  <div className="mt-4 flex flex-col gap-3 md:flex-row">
                    <input
                      value={guessInput}
                      onChange={(e) => setGuessInput(e.target.value)}
                      placeholder="Ejemplo: Mario Bros"
                      className="min-h-[48px] flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-orange-400"
                    />

                    <button
                      type="button"
                      disabled={saving || !allPicked}
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
              <div className="rounded-[28px] border border-orange-500/30 bg-orange-500/10 p-6 text-center">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-300">
                  Ganador
                </p>
                <h2 className="mt-2 text-4xl font-black">
                  {gameState.winnerName ?? "Jugador"}
                </h2>
              </div>
            )}
          </div>

          <aside className="space-y-5">
            {pendingQuestionsForMe.length > 0 && (
              <div className="rounded-[28px] border border-yellow-500/20 bg-yellow-500/10 p-5">
                <h2 className="text-xl font-black text-yellow-200">
                  Te preguntaron
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
              <h2 className="text-xl font-black">Chat de juego</h2>
              <p className="mt-1 text-sm text-white/50">
                Preguntas y respuestas oficiales de la partida.
              </p>

              <div className="mt-4 max-h-[520px] space-y-3 overflow-y-auto pr-1">
                {gameState.questions.length === 0 && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/50">
                    Todavía no hay preguntas. Haz la primera.
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
                        <span className="text-white">
                          {getPsAnswerLabel(question.answer)}
                        </span>
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
                Pistas confirmadas
              </h2>

              <div className="mt-4 space-y-2">
                {answeredQuestions.length === 0 && (
                  <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/50">
                    Aquí aparecerán las respuestas confirmadas.
                  </p>
                )}

                {answeredQuestions.map((question) => (
                  <div
                    key={question.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                  >
                    <p className="text-sm font-bold">{question.question}</p>
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

            {gameState.guesses.length > 0 && (
              <div className="rounded-[28px] border border-white/10 bg-zinc-950/90 p-5">
                <h2 className="text-xl font-black">Intentos</h2>

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
                            : "text-sm font-bold text-red-300"
                        }
                      >
                        {guess.result === "correct" ? "Correcto" : "Incorrecto"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}
