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
    .from("questions")
    .select("*")
    .eq("is_active", true)
    .limit(limit * 3);

  if (categoryMode !== "sabelotodo") {
    query = query.eq("category", categoryMode);
  }

  if (excludeIds.length > 0) {
    query = query.not("id", "in", `(${excludeIds.join(",")})`);
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
  const { data, error } = await supabase
    .from("game_sessions")
    .insert(payload)
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
  const { data, error } = await supabase
    .from("game_sessions")
    .update(updates)
    .eq("id", sessionId)
    .select()
    .single();

  if (error) {
    throw new Error(`Error updating question session: ${error.message}`);
  }

  return data;
}

export async function submitPlayerAnswer(
  supabase: SupabaseClient,
  answer: PlayerRoundAnswer,
) {
  const { data, error } = await supabase
    .from("game_answers")
    .upsert(answer, {
      onConflict: "session_id,round_number,player_id",
    })
    .select()
    .single();

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
    .from("game_answers")
    .select("*")
    .eq("session_id", sessionId)
    .eq("round_number", roundNumber);

  if (error) {
    throw new Error(`Error fetching round answers: ${error.message}`);
  }

  return (data ?? []) as PlayerRoundAnswer[];
}

export async function saveFinalResults(
  supabase: SupabaseClient,
  rows: Record<string, unknown>[],
) {
  const { error } = await supabase.from("game_results").insert(rows);

  if (error) {
    throw new Error(`Error saving final results: ${error.message}`);
  }
}
