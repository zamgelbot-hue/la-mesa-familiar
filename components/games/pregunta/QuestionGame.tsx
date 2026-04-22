"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildFinalStandings,
  calculateGlobalRewards,
  resolveRound,
} from "@/lib/games/pregunta/scoring";
import {
  createQuestionSession,
  fetchQuestionsForGame,
  fetchRoundAnswers,
  fetchSessionPlayers,
  saveFinalResults,
  submitPlayerAnswer,
  updateQuestionSession,
  updateSessionPlayerScores,
  upsertSessionPlayer,
} from "@/lib/games/pregunta/questionService";
import {
  calculateResponseTimeMs,
  getRemainingMs,
  mapQuestionRowToRoundQuestion,
} from "@/lib/games/pregunta/questionUtils";
import type {
  PlayerRoundAnswer,
  QuestionCategory,
  QuestionForRound,
  QuestionGamePhase,
  QuestionPlayerSummary,
  QuestionRow,
} from "@/lib/games/pregunta/questionTypes";

type RoomPlayer = {
  id: string;
  display_name?: string | null;
  name?: string | null;
  avatar_url?: string | null;
  is_host?: boolean | null;
};

type QuestionGameProps = {
  roomId: string;
  currentPlayerId: string;
  players: RoomPlayer[];
  hostPlayerId: string;
  categoryMode?: QuestionCategory;
  totalRounds?: number;
  answerTimeMs?: number;
  onReturnToRoom?: () => void;
};

type SessionRow = {
  id: string;
  room_id: string;
  host_player_id: string;
  status: "waiting" | "playing" | "finished";
  phase: QuestionGamePhase;
  category_mode: QuestionCategory;
  total_rounds: number;
  current_round: number;
  answer_time_ms: number;
  current_question_id: string | null;
  round_started_at: string | null;
  answer_ends_at: string | null;
  created_at?: string;
};

type SessionPlayerRow = {
  session_id: string;
  player_id: string;
  display_name: string | null;
  current_score: number | null;
  correct_answers: number | null;
  incorrect_answers: number | null;
  created_at?: string;
};

const QUESTION_INTRO_MS = 2000;
const REVEAL_MS = 2500;
const SCOREBOARD_MS = 2500;

export default function QuestionGame({
  roomId,
  currentPlayerId,
  players,
  hostPlayerId,
  categoryMode = "sabelotodo",
  totalRounds = 10,
  answerTimeMs = 5000,
  onReturnToRoom,
}: QuestionGameProps) {
  const supabase = useMemo(() => createClientComponentClient(), []) as SupabaseClient;

  const isHost = currentPlayerId === hostPlayerId;

  const [session, setSession] = useState<SessionRow | null>(null);
  const [sessionPlayers, setSessionPlayers] = useState<QuestionPlayerSummary[]>([]);
  const [questionBank, setQuestionBank] = useState<QuestionRow[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionForRound | null>(null);
  const [phase, setPhase] = useState<QuestionGamePhase>("waiting");
  const [timeLeftMs, setTimeLeftMs] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [roundResolved, setRoundResolved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const phaseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initializedRef = useRef(false);
  const roundTransitionLockRef = useRef(false);

  const currentPlayer = useMemo(
    () => players.find((p) => p.id === currentPlayerId),
    [players, currentPlayerId],
  );

  const ensureSessionPlayersExist = useCallback(
    async (sessionId: string) => {
      await Promise.all(
        players.map((player) =>
          upsertSessionPlayer(supabase, {
            sessionId,
            playerId: player.id,
            displayName:
              player.display_name || player.name || `Jugador ${player.id.slice(0, 4)}`,
            currentScore: 0,
            correctAnswers: 0,
            incorrectAnswers: 0,
          }),
        ),
      );

      const dbPlayers = await fetchSessionPlayers(supabase, sessionId);

      const mapped: QuestionPlayerSummary[] = dbPlayers.map((p: SessionPlayerRow) => ({
        playerId: p.player_id,
        name: p.display_name || "Jugador",
        score: p.current_score ?? 0,
        correctAnswers: p.correct_answers ?? 0,
        incorrectAnswers: p.incorrect_answers ?? 0,
        averageResponseMs: null,
      }));

      setSessionPlayers(mapped);
    },
    [players, supabase],
  );

  const initializeGame = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: existingSession } = await supabase
        .from("pp_sessions")
        .select("*")
        .eq("room_id", roomId)
        .in("status", ["waiting", "playing"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let activeSession = existingSession as SessionRow | null;

      if (!activeSession) {
        if (!isHost) {
          setLoading(false);
          return;
        }

        const fetchedQuestions = await fetchQuestionsForGame(supabase, {
          categoryMode,
          limit: totalRounds,
          excludeIds: [],
        });

        if (!fetchedQuestions.length) {
          throw new Error("No hay preguntas disponibles para esta categoría.");
        }

        setQuestionBank(fetchedQuestions);

        const created = (await createQuestionSession(supabase, {
          roomId,
          hostId: hostPlayerId,
          status: "waiting",
          phase: "waiting",
          currentRound: 0,
          totalRounds,
          settings: {
            totalRounds,
            answerTimeMs,
            questionRevealMs: REVEAL_MS,
            scoreboardMs: SCOREBOARD_MS,
            categoryMode,
            allowExplanation: true,
          },
        })) as SessionRow;

        activeSession = created;
      }

      setSession(activeSession);
      setPhase(activeSession.phase);

      const fetchedQuestions = await fetchQuestionsForGame(supabase, {
        categoryMode: activeSession.category_mode,
        limit: activeSession.total_rounds,
        excludeIds: [],
      });

      setQuestionBank(fetchedQuestions);

      await ensureSessionPlayersExist(activeSession.id);

      setLoading(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error inicializando partida";
      setError(message);
      setLoading(false);
    }
  }, [
    answerTimeMs,
    categoryMode,
    ensureSessionPlayersExist,
    hostPlayerId,
    isHost,
    roomId,
    supabase,
    totalRounds,
  ]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    initializeGame();
  }, [initializeGame]);

  useEffect(() => {
    if (!session?.id) return;

    const sessionChannel = supabase
      .channel(`pp_sessions_${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pp_sessions",
          filter: `id=eq.${session.id}`,
        },
        (payload) => {
          const next = payload.new as SessionRow;
          if (!next) return;

          setSession(next);
          setPhase(next.phase);
        },
      )
      .subscribe();

    const playersChannel = supabase
      .channel(`pp_session_players_${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pp_session_players",
          filter: `session_id=eq.${session.id}`,
        },
        async () => {
          const dbPlayers = await fetchSessionPlayers(supabase, session.id);

          const mapped: QuestionPlayerSummary[] = dbPlayers.map((p: SessionPlayerRow) => ({
            playerId: p.player_id,
            name: p.display_name || "Jugador",
            score: p.current_score ?? 0,
            correctAnswers: p.correct_answers ?? 0,
            incorrectAnswers: p.incorrect_answers ?? 0,
            averageResponseMs: null,
          }));

          setSessionPlayers(mapped);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sessionChannel);
      supabase.removeChannel(playersChannel);
    };
  }, [session?.id, supabase]);

  const getQuestionForRound = useCallback(
    (roundNumber: number) => {
      const row = questionBank[roundNumber - 1];
      if (!row) return null;
      return mapQuestionRowToRoundQuestion(row);
    },
    [questionBank],
  );

  const startRound = useCallback(
    async (roundNumber: number) => {
      if (!session || !isHost) return;

      const nextQuestion = getQuestionForRound(roundNumber);
      if (!nextQuestion) {
        await updateQuestionSession(supabase, session.id, {
          status: "finished",
          phase: "finished",
        });
        return;
      }

      setCurrentQuestion(nextQuestion);
      setSelectedOptionIndex(null);
      setRoundResolved(false);

      const questionStartedAt = new Date();
      const answerEndsAt = new Date(questionStartedAt.getTime() + QUESTION_INTRO_MS + answerTimeMs);

      await updateQuestionSession(supabase, session.id, {
        status: "playing",
        phase: "question",
        currentRound: roundNumber,
        currentQuestion: nextQuestion,
        roundStartedAt: questionStartedAt.toISOString(),
        answerEndsAt: answerEndsAt.toISOString(),
      });

      if (phaseTimeoutRef.current) clearTimeout(phaseTimeoutRef.current);

      phaseTimeoutRef.current = setTimeout(async () => {
        await updateQuestionSession(supabase, session.id, {
          phase: "answer",
        });
      }, QUESTION_INTRO_MS);
    },
    [answerTimeMs, getQuestionForRound, isHost, session, supabase],
  );

  const resolveCurrentRound = useCallback(async () => {
    if (!session || !currentQuestion || !isHost || roundResolved) return;
    if (roundTransitionLockRef.current) return;

    roundTransitionLockRef.current = true;

    try {
      const answers = (await fetchRoundAnswers(
        supabase,
        session.id,
        session.current_round,
      )) as PlayerRoundAnswer[];

      const resolution = resolveRound({
        answers,
        players: sessionPlayers,
        answerTimeMs: session.answer_time_ms,
        difficulty: currentQuestion.difficulty,
        roundNumber: session.current_round,
        questionId: currentQuestion.id,
        correctOriginalIndex: currentQuestion.correctOriginalIndex,
      });

      const nextPlayers = sessionPlayers.map((player) => {
        const round = resolution.results.find((r) => r.playerId === player.playerId);

        if (!round) return player;

        return {
          ...player,
          score: round.totalScore,
          correctAnswers: player.correctAnswers + (round.isCorrect ? 1 : 0),
          incorrectAnswers: player.incorrectAnswers + (round.isCorrect ? 0 : 1),
        };
      });

      setSessionPlayers(nextPlayers);
      setRoundResolved(true);

      await updateSessionPlayerScores(
        supabase,
        nextPlayers.map((player) => ({
          sessionId: session.id,
          playerId: player.playerId,
          currentScore: player.score,
          correctAnswers: player.correctAnswers,
          incorrectAnswers: player.incorrectAnswers,
        })),
      );

      await updateQuestionSession(supabase, session.id, {
        phase: "reveal",
      });

      setTimeout(async () => {
        const isLastRound = session.current_round >= session.total_rounds;

        if (isLastRound) {
          const standings = buildFinalStandings(nextPlayers);
          const rewards = calculateGlobalRewards(standings);

          await saveFinalResults(
            supabase,
            standings.map((standing) => ({
              session_id: session.id,
              player_id: standing.playerId,
              final_score: standing.score,
              position: standing.position,
            })),
          );

          await updateQuestionSession(supabase, session.id, {
            status: "finished",
            phase: "finished",
          });

          console.log("Rewards calculadas:", rewards);
        } else {
          await updateQuestionSession(supabase, session.id, {
            phase: "scoreboard",
          });

          setTimeout(async () => {
            await startRound(session.current_round + 1);
          }, SCOREBOARD_MS);
        }
      }, REVEAL_MS);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error resolviendo ronda";
      setError(message);
    } finally {
      roundTransitionLockRef.current = false;
    }
  }, [
    currentQuestion,
    isHost,
    roundResolved,
    session,
    sessionPlayers,
    startRound,
    supabase,
  ]);

  useEffect(() => {
    if (!session) return;

    if (phase === "waiting" && isHost && session.current_round === 0) {
      startRound(1);
      return;
    }

    if (phase === "question") {
      setTimeLeftMs(QUESTION_INTRO_MS);
      return;
    }

    if (phase === "answer") {
      const tick = () => {
        const ms = getRemainingMs(session.answer_ends_at);
        setTimeLeftMs(ms);

        if (ms <= 0) {
          resolveCurrentRound();
        }
      };

      tick();
      const interval = setInterval(tick, 100);

      return () => clearInterval(interval);
    }

    if (phase === "reveal") {
      setTimeLeftMs(REVEAL_MS);
      return;
    }

    if (phase === "scoreboard") {
      setTimeLeftMs(SCOREBOARD_MS);
      return;
    }
  }, [isHost, phase, resolveCurrentRound, session, startRound]);

  useEffect(() => {
    if (!session?.current_round) return;
    const q = getQuestionForRound(session.current_round);
    if (q) setCurrentQuestion(q);
  }, [getQuestionForRound, session?.current_round]);

  const handleSelectOption = async (originalIndex: number) => {
    if (!session || !currentQuestion) return;
    if (phase !== "answer") return;
    if (selectedOptionIndex !== null) return;

    const answeredAt = new Date().toISOString();
    const responseTimeMs = calculateResponseTimeMs(session.round_started_at, answeredAt);
    const isCorrect = originalIndex === currentQuestion.correctOriginalIndex;

    setSelectedOptionIndex(originalIndex);

    try {
      await submitPlayerAnswer(supabase, {
        sessionId: session.id,
        roomId,
        roundNumber: session.current_round,
        playerId: currentPlayerId,
        questionId: currentQuestion.id,
        selectedOriginalIndex: originalIndex,
        isCorrect,
        responseTimeMs,
        answeredAt,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error enviando respuesta";
      setError(message);
    }
  };

  const sortedPlayers = useMemo(
    () => [...sessionPlayers].sort((a, b) => b.score - a.score),
    [sessionPlayers],
  );

  if (loading) {
    return (
      <div className="rounded-2xl border border-orange-500/20 bg-neutral-900 p-6 text-white">
        Cargando Pregunta Pregunta...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-neutral-900 p-6 text-white">
        <p className="font-semibold text-red-400">Error</p>
        <p className="mt-2 text-sm text-neutral-300">{error}</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="rounded-2xl border border-orange-500/20 bg-neutral-900 p-6 text-white">
        Esperando sesión...
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 text-white">
      <div className="rounded-3xl border border-orange-500/20 bg-neutral-950/90 p-5 shadow-2xl">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-orange-400">
              Pregunta Pregunta
            </p>
            <h2 className="mt-1 text-2xl font-bold">
              Ronda {session.current_round} / {session.total_rounds}
            </h2>
            <p className="mt-1 text-sm text-neutral-400">
              Fase actual: <span className="text-neutral-200">{phase}</span>
            </p>
          </div>

          <div className="rounded-2xl border border-orange-500/20 bg-black/30 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-wide text-neutral-400">Tiempo</p>
            <p className="text-2xl font-bold text-orange-400">
              {Math.ceil(timeLeftMs / 1000)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="rounded-3xl border border-orange-500/15 bg-neutral-950/90 p-6 shadow-xl">
          {phase === "finished" ? (
            <div className="space-y-4">
              <h3 className="text-3xl font-bold text-orange-400">Partida terminada</h3>
              <p className="text-neutral-300">
                Gracias por jugar. Ya puedes volver a la sala.
              </p>

              <div className="space-y-3">
                {sortedPlayers.map((player, index) => (
                  <div
                    key={player.playerId}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <div>
                      <p className="font-semibold">
                        #{index + 1} {player.name}
                      </p>
                      <p className="text-sm text-neutral-400">
                        {player.correctAnswers} correctas · {player.incorrectAnswers} incorrectas
                      </p>
                    </div>
                    <div className="text-xl font-bold text-orange-400">{player.score}</div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={onReturnToRoom}
                className="rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-400"
              >
                Volver a sala
              </button>
            </div>
          ) : currentQuestion ? (
            <div className="space-y-6">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-300">
                    {currentQuestion.category}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-neutral-300">
                    {currentQuestion.difficulty}
                  </span>
                </div>

                <h3 className="mt-4 text-2xl font-bold leading-snug">
                  {currentQuestion.questionText}
                </h3>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {currentQuestion.options.map((option) => {
                  const isSelected = selectedOptionIndex === option.originalIndex;
                  const isCorrect =
                    phase === "reveal" || phase === "scoreboard" || phase === "finished"
                      ? option.originalIndex === currentQuestion.correctOriginalIndex
                      : false;

                  const isWrongSelected =
                    (phase === "reveal" || phase === "scoreboard" || phase === "finished") &&
                    isSelected &&
                    !isCorrect;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={phase !== "answer" || selectedOptionIndex !== null}
                      onClick={() => handleSelectOption(option.originalIndex)}
                      className={[
                        "min-h-[90px] rounded-2xl border px-4 py-4 text-left transition",
                        "disabled:cursor-not-allowed",
                        isCorrect
                          ? "border-emerald-400/40 bg-emerald-500/20"
                          : isWrongSelected
                            ? "border-red-400/40 bg-red-500/20"
                            : isSelected
                              ? "border-orange-400/40 bg-orange-500/20"
                              : "border-white/10 bg-white/5 hover:border-orange-400/30 hover:bg-orange-500/10",
                      ].join(" ")}
                    >
                      <span className="text-base font-medium">{option.text}</span>
                    </button>
                  );
                })}
              </div>

              {phase === "reveal" && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  Respuesta correcta revelada.
                </div>
              )}

              {phase === "scoreboard" && (
                <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 px-4 py-3 text-sm text-orange-200">
                  Preparando siguiente ronda...
                </div>
              )}
            </div>
          ) : (
            <div className="text-neutral-400">Esperando pregunta...</div>
          )}
        </div>

        <div className="rounded-3xl border border-orange-500/15 bg-neutral-950/90 p-5 shadow-xl">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">Marcador</p>
            <h3 className="mt-1 text-xl font-bold text-white">Jugadores</h3>
          </div>

          <div className="space-y-3">
            {sortedPlayers.map((player, index) => {
              const isMe = player.playerId === currentPlayerId;
              return (
                <div
                  key={player.playerId}
                  className={[
                    "rounded-2xl border px-4 py-3",
                    isMe
                      ? "border-orange-400/30 bg-orange-500/10"
                      : "border-white/10 bg-white/5",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        #{index + 1} {player.name} {isMe ? "· Tú" : ""}
                      </p>
                      <p className="text-xs text-neutral-400">
                        {player.correctAnswers} correctas · {player.incorrectAnswers} incorrectas
                      </p>
                    </div>
                    <div className="text-lg font-bold text-orange-400">{player.score}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {currentPlayer && (
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-300">
              Jugando como:{" "}
              <span className="font-semibold text-white">
                {currentPlayer.display_name || currentPlayer.name || "Jugador"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
