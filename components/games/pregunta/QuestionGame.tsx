"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createGameSounds } from "@/lib/audio/useGameSounds";
import { applyQuestionGameProfileRewards } from "@/lib/games/pregunta/questionProfileRewards";
import {
  getPlayerIdentity,
  type PlayerIdentity,
} from "@/lib/profile/getPlayerIdentity";
import {
  applyRoundResultsToPlayers,
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
  buildRoundQuestionSet,
  calculateResponseTimeMs,
  getRemainingMs,
} from "@/lib/games/pregunta/questionUtils";
import type {
  QuestionCategory,
  QuestionForRound,
  QuestionGamePhase,
  QuestionPlayerSummary,
  QuestionRow,
} from "@/lib/games/pregunta/questionTypes";

type QuestionGameProps = {
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
  is_host: boolean | null;
  is_guest: boolean | null;
  is_ready: boolean | null;
  created_at?: string;
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

const QUESTION_INTRO_MS = 3000;
const REVEAL_MS = 3000;
const SCOREBOARD_MS = 3000;

function getCategoryFromVariantOrSettings(
  roomVariant?: string | null,
  roomSettings?: Record<string, unknown> | null,
): QuestionCategory {
  const raw =
    (typeof roomSettings?.categoryMode === "string" && roomSettings.categoryMode) ||
    roomVariant ||
    "sabelotodo";

  const allowed: QuestionCategory[] = [
    "espanol",
    "matematicas",
    "ingles",
    "geografia",
    "ciencias",
    "sabelotodo",
  ];

  return allowed.includes(raw as QuestionCategory)
    ? (raw as QuestionCategory)
    : "sabelotodo";
}

function getTotalRoundsForMode(categoryMode: QuestionCategory) {
  return categoryMode === "sabelotodo" ? 20 : 10;
}

function getAnswerTimeForMode(categoryMode: QuestionCategory) {
  return categoryMode === "sabelotodo" ? 6000 : 8000;
}

export default function QuestionGame({
  roomCode,
  roomVariant,
  roomSettings,
}: QuestionGameProps) {
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const soundsRef = useRef(createGameSounds({ baseVolume: 0.7 }));

  const categoryMode = useMemo(
    () => getCategoryFromVariantOrSettings(roomVariant, roomSettings),
    [roomVariant, roomSettings],
  );

  const totalRounds = useMemo(() => {
    const fromSettings = Number(roomSettings?.totalRounds ?? 0);
    if (fromSettings > 0) return fromSettings;
    return getTotalRoundsForMode(categoryMode);
  }, [roomSettings, categoryMode]);

  const answerTimeMs = useMemo(() => {
    const fromSettings = Number(roomSettings?.answerTimeMs ?? 0);
    if (fromSettings > 0) return fromSettings;
    return getAnswerTimeForMode(categoryMode);
  }, [roomSettings, categoryMode]);

  const [playerIdentity, setPlayerIdentity] = useState<PlayerIdentity | null>(null);
  const [room, setRoom] = useState<RoomRow | null>(null);
  const [roomPlayers, setRoomPlayers] = useState<RoomPlayerRow[]>([]);
  const [session, setSession] = useState<SessionRow | null>(null);
  const [sessionPlayers, setSessionPlayers] = useState<QuestionPlayerSummary[]>([]);
  const [questionBank, setQuestionBank] = useState<QuestionRow[]>([]);
  const [roundQuestions, setRoundQuestions] = useState<QuestionForRound[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionForRound | null>(null);
  const [phase, setPhase] = useState<QuestionGamePhase>("waiting");
  const [timeLeftMs, setTimeLeftMs] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [leavingToRoom, setLeavingToRoom] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const initializedRef = useRef(false);
  const sessionBootstrapRef = useRef(false);
  const phaseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const roundTransitionLockRef = useRef(false);
  const rewardsAppliedSessionIdRef = useRef<string | null>(null);
  const resolvedRoundKeyRef = useRef<string | null>(null);
  const warningPlayedRef = useRef<string | null>(null);
  const phaseSoundKeyRef = useRef<string | null>(null);

  const currentRoomPlayer = useMemo(() => {
    if (!playerIdentity) return null;

    return (
      roomPlayers.find((player) => {
        if (playerIdentity.user_id && player.user_id) {
          return player.user_id === playerIdentity.user_id;
        }

        return !player.user_id && player.player_name === playerIdentity.name;
      }) ?? null
    );
  }, [roomPlayers, playerIdentity]);

  const isHost = !!currentRoomPlayer?.is_host;

  const currentPlayerSessionKey = useMemo(() => {
    if (!currentRoomPlayer) return null;
    return currentRoomPlayer.user_id ?? `guest:${currentRoomPlayer.player_name}`;
  }, [currentRoomPlayer]);

  const hostSessionKey = useMemo(() => {
    const host = roomPlayers.find((p) => p.is_host);
    if (!host) return null;
    return host.user_id ?? `guest:${host.player_name}`;
  }, [roomPlayers]);

  const currentPlayerName = currentRoomPlayer?.player_name ?? playerIdentity?.name ?? "Jugador";

  const sortedPlayers = useMemo(
    () =>
      [...sessionPlayers].sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.name.localeCompare(b.name);
      }),
    [sessionPlayers],
  );

  const loadPlayerIdentity = useCallback(async () => {
    const identity = await getPlayerIdentity();
    setPlayerIdentity(identity);
  }, []);

  const loadRoom = useCallback(async () => {
    const { data, error } = await supabase
      .from("rooms")
      .select("code, status, game_slug, game_variant, room_settings")
      .eq("code", roomCode)
      .maybeSingle();

    if (error) {
      console.error("Error cargando room:", error);
      setErrorMessage("No se pudo cargar la sala.");
      return;
    }

    if (!data) {
      setErrorMessage("No encontramos esta sala.");
      return;
    }

    setRoom(data as RoomRow);
  }, [supabase, roomCode]);

  const loadRoomPlayers = useCallback(async () => {
    const { data, error } = await supabase
      .from("room_players")
      .select("id, room_code, user_id, player_name, is_host, is_guest, is_ready, created_at")
      .eq("room_code", roomCode)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error cargando room_players:", error);
      return;
    }

    setRoomPlayers((data ?? []) as RoomPlayerRow[]);
  }, [supabase, roomCode]);

  const loadSessionPlayers = useCallback(
    async (sessionId?: string | null) => {
      if (!sessionId) {
        setSessionPlayers([]);
        return;
      }

      const dbPlayers = await fetchSessionPlayers(supabase, sessionId);

      const mapped: QuestionPlayerSummary[] = (dbPlayers as SessionPlayerRow[]).map((p) => ({
        playerId: p.player_id,
        name: p.display_name || "Jugador",
        score: p.current_score ?? 0,
        correctAnswers: p.correct_answers ?? 0,
        incorrectAnswers: p.incorrect_answers ?? 0,
        averageResponseMs: null,
      }));

      setSessionPlayers(mapped);
    },
    [supabase],
  );

  const loadSession = useCallback(async () => {
    if (session?.id) return session;

    const { data, error } = await supabase
      .from("pp_sessions")
      .select("*")
      .eq("room_id", roomCode)
      .in("status", ["waiting", "playing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error cargando pp_sessions:", error);
      return null;
    }

    const nextSession = (data ?? null) as SessionRow | null;
    setSession(nextSession);
    setPhase(nextSession?.phase ?? "waiting");
    return nextSession;
  }, [supabase, roomCode, session]);

  const loadQuestionBank = useCallback(async () => {
    const fetchedQuestions = await fetchQuestionsForGame(supabase, {
      categoryMode,
      limit: totalRounds,
      excludeIds: [],
    });

    setQuestionBank(fetchedQuestions);

    const stableRoundQuestions = buildRoundQuestionSet(
      fetchedQuestions,
      totalRounds,
    );

    setRoundQuestions(stableRoundQuestions);

    return fetchedQuestions;
  }, [supabase, categoryMode, totalRounds]);

  const createSessionIfNeeded = useCallback(async () => {
    if (!room || !playerIdentity || !isHost) return null;
    if (session) return session;
    if (room.game_slug !== "pregunta") return null;
    if (roomPlayers.length < 2) return null;
    if (!hostSessionKey) return null;

    const fetchedQuestions = await fetchQuestionsForGame(supabase, {
      categoryMode,
      limit: totalRounds,
      excludeIds: [],
    });

    if (!fetchedQuestions.length) {
      setErrorMessage("No hay preguntas disponibles para esta categoría.");
      return null;
    }

    setQuestionBank(fetchedQuestions);

    const stableRoundQuestions = buildRoundQuestionSet(
      fetchedQuestions,
      totalRounds,
    );

    setRoundQuestions(stableRoundQuestions);

    const created = (await createQuestionSession(supabase, {
      roomId: roomCode,
      hostId: hostSessionKey,
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

    setSession(created);
    setPhase(created.phase);

    return created;
  }, [
    answerTimeMs,
    categoryMode,
    hostSessionKey,
    isHost,
    playerIdentity,
    room,
    roomCode,
    roomPlayers.length,
    session,
    supabase,
    totalRounds,
  ]);

  const ensureSessionPlayersExist = useCallback(
    async (sessionId: string) => {
      if (!roomPlayers.length) return;

      const current = await fetchSessionPlayers(supabase, sessionId);
      const existingIds = new Set(
        (current as SessionPlayerRow[]).map((p) => p.player_id),
      );

      const missingPlayers = roomPlayers.filter((player) => {
        const playerKey = player.user_id ?? `guest:${player.player_name}`;
        return !existingIds.has(playerKey);
      });

      if (missingPlayers.length > 0) {
        await Promise.all(
          missingPlayers.map((player) => {
            const playerKey = player.user_id ?? `guest:${player.player_name}`;

            return upsertSessionPlayer(supabase, {
              sessionId,
              playerId: playerKey,
              displayName: player.player_name,
              currentScore: 0,
              correctAnswers: 0,
              incorrectAnswers: 0,
            });
          }),
        );
      }

      await loadSessionPlayers(sessionId);
    },
    [roomPlayers, supabase, loadSessionPlayers],
  );

  const initializeGame = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      await loadPlayerIdentity();
      await Promise.all([loadRoom(), loadRoomPlayers()]);
    } finally {
      setLoading(false);
    }
  }, [loadPlayerIdentity, loadRoom, loadRoomPlayers]);

  useEffect(() => {
    soundsRef.current.preloadAll();
  }, []);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    void initializeGame();
  }, [initializeGame]);

  useEffect(() => {
    sessionBootstrapRef.current = false;
  }, [roomCode]);

  useEffect(() => {
    if (!room || !playerIdentity) return;
    if (room.game_slug !== "pregunta") return;
    if (roomPlayers.length < 2) return;
    if (!hostSessionKey) return;
    if (sessionBootstrapRef.current) return;

    sessionBootstrapRef.current = true;

    const boot = async () => {
      try {
        const existing = await loadSession();
        const activeSession = existing ?? (await createSessionIfNeeded());

        if (activeSession) {
          if (!questionBank.length) {
            await loadQuestionBank();
          }
          await ensureSessionPlayersExist(activeSession.id);
        }
      } catch (error) {
        console.error("Error bootstrapping Pregunta Pregunta:", error);
        setErrorMessage("No se pudo preparar la partida.");
        sessionBootstrapRef.current = false;
      }
    };

    void boot();
  }, [
    room,
    playerIdentity,
    roomPlayers.length,
    hostSessionKey,
    loadSession,
    createSessionIfNeeded,
    ensureSessionPlayersExist,
    loadQuestionBank,
    questionBank.length,
  ]);

  useEffect(() => {
    if (!session?.id) {
      sessionBootstrapRef.current = false;
    }
  }, [roomPlayers.length, session?.id]);

  useEffect(() => {
    if (!roomCode) return;

    const channel = supabase
      .channel(`pregunta-room-${roomCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rooms",
          filter: `code=eq.${roomCode}`,
        },
        async (payload) => {
          const nextRoom = (payload.new ?? null) as RoomRow | null;

          if (nextRoom) {
            setRoom(nextRoom);

            if (nextRoom.status === "waiting") {
              router.replace(`/sala/${roomCode}`);
            }
          } else {
            await loadRoom();
          }
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
          await loadRoomPlayers();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pp_sessions",
          filter: `room_id=eq.${roomCode}`,
        },
        (payload) => {
          const next = (payload.new ?? null) as SessionRow | null;
          setSession(next);
          setPhase(next?.phase ?? "waiting");
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, roomCode, loadRoom, loadRoomPlayers, router]);

  useEffect(() => {
    if (!session?.id) return;

    if (phase === "reveal" || phase === "scoreboard" || phase === "finished") {
      void loadSessionPlayers(session.id);
    }
  }, [session?.id, phase, loadSessionPlayers]);

  const getQuestionForRound = useCallback(
    (roundNumber: number) => roundQuestions[roundNumber - 1] ?? null,
    [roundQuestions],
  );

  useEffect(() => {
    if (!session?.current_round) return;

    const q = getQuestionForRound(session.current_round);
    if (!q) return;

    setCurrentQuestion((prev) => {
      if (prev?.id === q.id) return prev;
      return q;
    });

    setSelectedOptionIndex(null);
  }, [getQuestionForRound, session?.current_round]);

  useEffect(() => {
    if (!session?.id) return;

    const soundPhaseKey = `${session.id}:${session.current_round}:${phase}`;

    if (phaseSoundKeyRef.current === soundPhaseKey) return;

    if (phase === "question") {
      soundsRef.current.play("round_start");
      phaseSoundKeyRef.current = soundPhaseKey;
      return;
    }

    if (phase === "reveal") {
      soundsRef.current.play("reveal");
      phaseSoundKeyRef.current = soundPhaseKey;
      return;
    }

    if (phase === "finished") {
      soundsRef.current.play("victory");
      phaseSoundKeyRef.current = soundPhaseKey;
    }
  }, [phase, session?.id, session?.current_round]);

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

      resolvedRoundKeyRef.current = null;
      warningPlayedRef.current = null;
      setCurrentQuestion(nextQuestion);
      setPhase("question");
      setSelectedOptionIndex(null);
      setMessage("");
      setErrorMessage("");

      const questionStartedAt = new Date();
      const answerEndsAt = new Date(
        questionStartedAt.getTime() + QUESTION_INTRO_MS + answerTimeMs,
      );

      await updateQuestionSession(supabase, session.id, {
        status: "playing",
        phase: "question",
        currentRound: roundNumber,
        currentQuestion: nextQuestion,
        roundStartedAt: questionStartedAt.toISOString(),
        answerEndsAt: answerEndsAt.toISOString(),
      });

      if (phaseTimeoutRef.current) {
        clearTimeout(phaseTimeoutRef.current);
      }

      phaseTimeoutRef.current = setTimeout(async () => {
        setPhase("answer");

        await updateQuestionSession(supabase, session.id, {
          phase: "answer",
        });
      }, QUESTION_INTRO_MS);
    },
    [answerTimeMs, getQuestionForRound, isHost, session, supabase],
  );

  const awardRewardsIfNeeded = useCallback(
    async (standings: ReturnType<typeof buildFinalStandings>) => {
      if (!session?.id) return;
      if (rewardsAppliedSessionIdRef.current === session.id) return;

      await applyQuestionGameProfileRewards(supabase, standings);

      rewardsAppliedSessionIdRef.current = session.id;
    },
    [session?.id, supabase],
  );

  const resolveCurrentRound = useCallback(async () => {
    if (!session || !currentQuestion || !isHost) return;

    const roundKey = `${session.id}:${session.current_round}`;
    if (resolvedRoundKeyRef.current === roundKey) return;
    if (roundTransitionLockRef.current) return;

    roundTransitionLockRef.current = true;
    resolvedRoundKeyRef.current = roundKey;

    try {
      const answers = await fetchRoundAnswers(
        supabase,
        session.id,
        session.current_round,
      );

      const resolution = resolveRound({
        answers,
        players: sessionPlayers,
        answerTimeMs: session.answer_time_ms,
        difficulty: currentQuestion.difficulty,
        roundNumber: session.current_round,
        questionId: currentQuestion.id,
        correctOriginalIndex: currentQuestion.correctOriginalIndex,
      });

      const nextPlayers = applyRoundResultsToPlayers(
        sessionPlayers,
        resolution.results,
      );

      setSessionPlayers(nextPlayers);

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

          await awardRewardsIfNeeded(standings);
          console.log("Rewards calculadas:", rewards);

          await updateQuestionSession(supabase, session.id, {
            status: "finished",
            phase: "finished",
          });
        } else {
          await updateQuestionSession(supabase, session.id, {
            phase: "scoreboard",
          });

          setTimeout(async () => {
            await startRound(session.current_round + 1);
          }, SCOREBOARD_MS);
        }
      }, REVEAL_MS);
    } catch (error) {
      console.error("Error resolviendo ronda:", error);
      setErrorMessage("No se pudo resolver la ronda.");
      resolvedRoundKeyRef.current = null;
    } finally {
      roundTransitionLockRef.current = false;
    }
  }, [
    awardRewardsIfNeeded,
    currentQuestion,
    isHost,
    session,
    sessionPlayers,
    startRound,
    supabase,
  ]);

  useEffect(() => {
    if (!session) return;

    if (phase === "waiting" && isHost && session.current_round === 0 && questionBank.length) {
      void startRound(1);
      return;
    }

    if (phase === "question") {
      const questionEndsAt =
        session.round_started_at
          ? new Date(session.round_started_at).getTime() + QUESTION_INTRO_MS
          : Date.now() + QUESTION_INTRO_MS;

      const tick = () => {
        const ms = Math.max(0, questionEndsAt - Date.now());
        setTimeLeftMs(ms);
      };

      tick();
      const interval = setInterval(tick, 100);

      return () => clearInterval(interval);
    }

    if (phase === "answer") {
      const tick = () => {
        const ms = getRemainingMs(session.answer_ends_at);
        setTimeLeftMs(ms);

        const warningKey = `${session.id}:${session.current_round}`;
        if (ms <= 3000 && ms > 2000 && warningPlayedRef.current !== warningKey) {
          soundsRef.current.play("timer_warning");
          warningPlayedRef.current = warningKey;
        }

        if (ms <= 0 && isHost) {
          void resolveCurrentRound();
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

    if (phase === "finished") {
      setTimeLeftMs(0);
    }
  }, [isHost, phase, questionBank.length, resolveCurrentRound, session, startRound]);

  const handleSelectOption = async (originalIndex: number) => {
    if (!session || !currentQuestion || !currentPlayerSessionKey) return;
    if (phase !== "answer") return;
    if (selectedOptionIndex !== null) return;

    const answeredAt = new Date().toISOString();
    const responseTimeMs = calculateResponseTimeMs(session.round_started_at, answeredAt);
    const isCorrect = originalIndex === currentQuestion.correctOriginalIndex;

    setSelectedOptionIndex(originalIndex);
    setMessage("Respuesta enviada.");
    setErrorMessage("");

    soundsRef.current.play(isCorrect ? "correct" : "wrong");

    try {
      await submitPlayerAnswer(supabase, {
        sessionId: session.id,
        roomId: roomCode,
        roundNumber: session.current_round,
        playerId: currentPlayerSessionKey,
        questionId: currentQuestion.id,
        selectedOriginalIndex: originalIndex,
        isCorrect,
        responseTimeMs,
        answeredAt,
      });
    } catch (error) {
      console.error("Error enviando respuesta:", error);
      setErrorMessage("No se pudo enviar tu respuesta.");
    }
  };

  const handleBackToRoom = useCallback(async () => {
    try {
      setLeavingToRoom(true);
      setErrorMessage("");
      setMessage("");

      if (session?.id) {
        await updateQuestionSession(supabase, session.id, {
          status: "finished",
          phase: "finished",
        });
      }

      soundsRef.current.stopAll();

      await supabase
        .from("rooms")
        .update({
          status: "waiting",
          started_at: null,
        })
        .eq("code", roomCode);

      await supabase
        .from("room_players")
        .update({ is_ready: false })
        .eq("room_code", roomCode);

      router.replace(`/sala/${roomCode}`);
    } catch (error) {
      console.error("Error volviendo a sala:", error);
      setErrorMessage("No se pudo volver a la sala.");
    } finally {
      setLeavingToRoom(false);
    }
  }, [supabase, router, roomCode, session?.id]);

  const handleTerminateMatch = useCallback(async () => {
    if (!isHost) return;
    await handleBackToRoom();
  }, [isHost, handleBackToRoom]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black px-6 py-12 text-white">
        <div className="mx-auto max-w-6xl rounded-[32px] border border-orange-500/15 bg-zinc-950/90 p-10 text-center">
          Cargando Pregunta Pregunta...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 rounded-[32px] border border-orange-500/15 bg-zinc-950/90 p-5 shadow-[0_0_40px_rgba(249,115,22,0.05)] md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-300/80">
              La Mesa Familiar
            </p>
            <h1 className="mt-1 text-3xl font-extrabold text-white">
              Pregunta Pregunta
            </h1>
            <p className="mt-2 text-sm text-white/60">
              Sala: <span className="font-bold text-orange-300">{roomCode}</span>
            </p>
            <p className="mt-1 text-sm text-white/60">
              Modo: <span className="font-bold text-white">{categoryMode}</span>
            </p>
            <p className="mt-1 text-sm text-white/60">
              Jugando como: <span className="font-bold text-white">{currentPlayerName}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                Fase
              </p>
              <p className="mt-1 font-bold text-white">{phase}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                Tiempo
              </p>
              <p className="mt-1 font-bold text-orange-300">
                {Math.max(0, Math.ceil(timeLeftMs / 1000))}
              </p>
            </div>

            {isHost && (
              <button
                type="button"
                onClick={() => void handleTerminateMatch()}
                disabled={leavingToRoom}
                className="rounded-2xl bg-red-500/90 px-4 py-3 font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {leavingToRoom ? "Terminando..." : "Terminar partida"}
              </button>
            )}

            <button
              type="button"
              onClick={() => void handleBackToRoom()}
              disabled={leavingToRoom}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {leavingToRoom ? "Volviendo..." : "Volver a sala"}
            </button>
          </div>
        </div>

        <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
              Ronda
            </p>
            <p className="mt-1 text-lg font-bold text-white">
              {session?.current_round ?? 0}/{session?.total_rounds ?? totalRounds}
            </p>
          </div>

          <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
              Jugadores
            </p>
            <p className="mt-1 text-lg font-bold text-white">{sessionPlayers.length}</p>
          </div>

          <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
              Estado
            </p>
            <p className="mt-1 text-lg font-bold text-white">
              {session?.status ?? "preparando"}
            </p>
          </div>

          <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
              Respuesta
            </p>
            <p className="mt-1 text-lg font-bold text-orange-300">
              {selectedOptionIndex !== null ? "Enviada" : "Pendiente"}
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-300">
            {errorMessage}
          </div>
        )}

        {message && (
          <div className="mb-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-emerald-300">
            {message}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className="rounded-[30px] border border-orange-500/15 bg-zinc-950/90 p-6">
              {!currentQuestion ? (
                <div className="text-white/60">Esperando pregunta...</div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-300">
                      {currentQuestion.category}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-neutral-300">
                      {currentQuestion.difficulty}
                    </span>
                  </div>

                  <h2 className="mt-4 text-2xl font-bold leading-snug">
                    {currentQuestion.questionText}
                  </h2>

                  {phase === "question" ? (
                    <div className="mt-6 rounded-2xl border border-orange-500/20 bg-orange-500/10 px-4 py-6 text-center text-orange-200">
                      Prepárate... las respuestas aparecerán en un momento.
                    </div>
                  ) : (
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      {currentQuestion.options.map((option) => {
                        const isSelected = selectedOptionIndex === option.originalIndex;
                        const isRevealPhase =
                          phase === "reveal" || phase === "scoreboard" || phase === "finished";
                        const isCorrect =
                          isRevealPhase &&
                          option.originalIndex === currentQuestion.correctOriginalIndex;
                        const isWrongSelected =
                          isRevealPhase && isSelected && !isCorrect;

                        return (
                          <button
                            key={option.id}
                            type="button"
                            disabled={phase !== "answer" || selectedOptionIndex !== null}
                            onClick={() => void handleSelectOption(option.originalIndex)}
                            className={[
                              "min-h-[92px] rounded-2xl border px-4 py-4 text-left transition disabled:cursor-not-allowed",
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
                  )}

                  {phase === "answer" && (
                    <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
                      Elige una opción antes de que termine el tiempo.
                    </div>
                  )}

                  {phase === "reveal" && (
                    <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                      Respuesta correcta revelada.
                    </div>
                  )}

                  {phase === "scoreboard" && (
                    <div className="mt-5 rounded-2xl border border-orange-500/20 bg-orange-500/10 px-4 py-3 text-sm text-orange-200">
                      Preparando siguiente ronda...
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[30px] border border-white/10 bg-zinc-950/90 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-200">
                Marcador
              </p>

              <div className="mt-4 space-y-3">
                {sortedPlayers.map((player, index) => {
                  const isMe = player.playerId === currentPlayerSessionKey;

                  return (
                    <div
                      key={player.playerId}
                      className={`rounded-2xl border px-4 py-3 ${
                        isMe
                          ? "border-orange-400/30 bg-orange-500/10"
                          : "border-white/10 bg-white/5"
                      }`}
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
                        <div className="text-lg font-bold text-orange-400">
                          {player.score}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {sortedPlayers.length === 0 && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white/60">
                    Esperando jugadores...
                  </div>
                )}
              </div>
            </div>

            {phase === "finished" && (
              <div className="rounded-[30px] border border-emerald-500/20 bg-emerald-500/10 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300/80">
                  Resultado final
                </p>

                <h2 className="mt-2 text-3xl font-extrabold text-white">
                  {sortedPlayers[0] ? `${sortedPlayers[0].name} ganó la partida` : "Partida terminada"}
                </h2>

                <p className="mt-3 text-white/65">
                  Ya puedes volver a la sala o iniciar otra partida.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  {isHost && (
                    <button
                      type="button"
                      onClick={() => void handleTerminateMatch()}
                      disabled={leavingToRoom}
                      className="rounded-2xl bg-red-500/90 px-4 py-3 font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {leavingToRoom ? "Terminando..." : "Terminar partida"}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => void handleBackToRoom()}
                    disabled={leavingToRoom}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {leavingToRoom ? "Volviendo..." : "Volver a sala"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
