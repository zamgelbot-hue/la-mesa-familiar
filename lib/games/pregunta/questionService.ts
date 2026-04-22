import { SupabaseClient } from "@supabase/supabase-js";
import {
  PlayerRoundAnswer,
  QuestionCategory,
  QuestionGameState,
  QuestionRow,
} from "./questionTypes";

type GetQuestionsParams = {
  categoryMode: QuestionCategory;
  limit: number;
  excludeIds?: string[];
};

export async function fetchQuestionsForGame(
  supabase: SupabaseClient,
  params: GetQuestionsParams,
): Promise<QuestionRow[]> {
  const { categoryMode, limit, excludeIds = [] } = params;

  let query = supabase
    .from("pp_questions")
    .select("*")
    .eq("is_active", true)
    .limit(limit * 3);

  if (categoryMode !== "sabelotodo") {
    query = query.eq("category", categoryMode);
  }

  if (excludeIds.length > 0) {
    query = query.not("id", "in", `(${excludeIds.map((id) => `"${id}"`).join(",")})`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Error fetching questions: ${error.message}`);
  }

  return (data ?? []) as QuestionRow[];
}

export async function createQuestionSession(
  supabase: SupabaseClient,
  payload: Partial<QuestionGameState>,
) {
  const dbPayload = {
    room_id: payload.roomId,
    host_player_id: payload.hostId,
    status: payload.status ?? "waiting",
    phase: payload.phase ?? "waiting",
    category_mode: payload.settings?.categoryMode ?? "sabelotodo",
    total_rounds: payload.totalRounds ?? payload.settings?.totalRounds ?? 10,
    current_round: payload.currentRound ?? 0,
    answer_time_ms: payload.settings?.answerTimeMs ?? 5000,
    current_question_id: payload.currentQuestion?.id ?? null,
    round_started_at: payload.roundStartedAt,
    answer_ends_at: payload.answerEndsAt,
  };

  const { data, error } = await supabase
    .from("pp_sessions")
    .insert(dbPayload)
    .select()
    .single();

  if (error) {
    throw new Error(`Error creating question session: ${error.message}`);
  }

  return data;
}

export async function updateQuestionSession(
  supabase: SupabaseClient,
  sessionId: string,
  updates: Partial<QuestionGameState>,
) {
  const dbUpdates: Record<string, unknown> = {};

  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.phase !== undefined) dbUpdates.phase = updates.phase;
  if (updates.currentRound !== undefined) dbUpdates.current_round = updates.currentRound;
  if (updates.totalRounds !== undefined) dbUpdates.total_rounds = updates.totalRounds;
  if (updates.currentQuestion !== undefined) {
    dbUpdates.current_question_id = updates.currentQuestion?.id ?? null;
  }
  if (updates.roundStartedAt !== undefined) dbUpdates.round_started_at = updates.roundStartedAt;
  if (updates.answerEndsAt !== undefined) dbUpdates.answer_ends_at = updates.answerEndsAt;

  const { data, error } = await supabase
    .from("pp_sessions")
    .update(dbUpdates)
    .eq("id", sessionId)
    .select()
    .single();

  if (error) {
    throw new Error(`Error updating question session: ${error.message}`);
  }

  return data;
}

export async function upsertSessionPlayer(
  supabase: SupabaseClient,
  payload: {
    sessionId: string;
    playerId: string;
    displayName: string;
    currentScore?: number;
    correctAnswers?: number;
    incorrectAnswers?: number;
  },
) {
  const { data, error } = await supabase
    .from("pp_session_players")
    .upsert(
      {
        session_id: payload.sessionId,
        player_id: payload.playerId,
        display_name: payload.displayName,
        current_score: payload.currentScore ?? 0,
        correct_answers: payload.correctAnswers ?? 0,
        incorrect_answers: payload.incorrectAnswers ?? 0,
      },
      {
        onConflict: "session_id,player_id",
      },
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Error upserting session player: ${error.message}`);
  }

  return data;
}

export async function fetchSessionPlayers(
  supabase: SupabaseClient,
  sessionId: string,
) {
  const { data, error } = await supabase
    .from("pp_session_players")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Error fetching session players: ${error.message}`);
  }

  return data ?? [];
}

export async function submitPlayerAnswer(
  supabase: SupabaseClient,
  answer: PlayerRoundAnswer,
) {
  const { data, error } = await supabase
    .from("pp_answers")
    .upsert(
      {
        session_id: answer.sessionId,
        room_id: answer.roomId,
        player_id: answer.playerId,
        round_number: answer.roundNumber,
        question_id: answer.questionId,
        selected_original_index: answer.selectedOriginalIndex,
        is_correct: answer.isCorrect,
        response_time_ms: answer.responseTimeMs,
        answered_at: answer.answeredAt,
      },
      {
        onConflict: "session_id,round_number,player_id",
      },
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Error submitting answer: ${error.message}`);
  }

  return data;
}

  if (error) {
    throw new Error(`Error submitting answer: ${error.message}`);
  }

  return data;
}

export async function fetchRoundAnswers(
  supabase: SupabaseClient,
  sessionId: string,
  roundNumber: number,
): Promise<PlayerRoundAnswer[]> {
  const { data, error } = await supabase
    .from("pp_answers")
    .select("*")
    .eq("session_id", sessionId)
    .eq("round_number", roundNumber);

  if (error) {
    throw new Error(`Error fetching round answers: ${error.message}`);
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    sessionId: row.session_id,
    roomId: row.room_id ?? "",
    roundNumber: row.round_number,
    playerId: row.player_id,
    questionId: row.question_id,
    selectedOriginalIndex: row.selected_original_index,
    isCorrect: row.is_correct,
    responseTimeMs: row.response_time_ms,
    answeredAt: row.answered_at ?? row.created_at ?? new Date().toISOString(),
  }));
}

export async function updateSessionPlayerScores(
  supabase: SupabaseClient,
  updates: Array<{
    sessionId: string;
    playerId: string;
    currentScore: number;
    correctAnswers: number;
    incorrectAnswers: number;
  }>,
) {
  if (!updates.length) return [];

  const payload = updates.map((item) => ({
    session_id: item.sessionId,
    player_id: item.playerId,
    current_score: item.currentScore,
    correct_answers: item.correctAnswers,
    incorrect_answers: item.incorrectAnswers,
  }));

  const { data, error } = await supabase
    .from("pp_session_players")
    .upsert(payload, {
      onConflict: "session_id,player_id",
    })
    .select();

  if (error) {
    throw new Error(`Error updating session player scores: ${error.message}`);
  }

  return data ?? [];
}

export async function saveFinalResults(
  supabase: SupabaseClient,
  rows: Array<{
    session_id: string;
    player_id: string;
    final_score: number;
    position: number;
  }>,
) {
  const { data, error } = await supabase
    .from("pp_results")
    .insert(rows)
    .select();

  if (error) {
    throw new Error(`Error saving final results: ${error.message}`);
  }

  return data ?? [];
}
