import type { SupabaseClient } from "@supabase/supabase-js";

type ProfileRewardSnapshot = {
  points: number | null;
  games_played: number | null;
  games_won: number | null;
  games_lost: number | null;
  total_points_earned: number | null;
  current_win_streak: number | null;
  best_win_streak: number | null;
};

type ApplyHeadToHeadMatchRewardsParams = {
  supabase: SupabaseClient;
  winnerUserId: string | null | undefined;
  loserUserId: string | null | undefined;
  winnerPoints?: number;
  loserPoints?: number;
};

type ApplySingleWinnerMatchRewardsParams = {
  supabase: SupabaseClient;
  winnerUserId: string | null | undefined;
  participantUserIds: Array<string | null | undefined>;
  winnerPoints?: number;
  participantPoints?: number;
};

async function readProfileRewardSnapshot(
  supabase: SupabaseClient,
  userId: string
): Promise<ProfileRewardSnapshot | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "points, games_played, games_won, games_lost, total_points_earned, current_win_streak, best_win_streak"
    )
    .eq("id", userId)
    .single();

  if (error || !data) {
    console.error("Error leyendo perfil para recompensas:", error);
    return null;
  }

  return data as ProfileRewardSnapshot;
}

async function applyWinnerReward(
  supabase: SupabaseClient,
  userId: string,
  rewardPoints: number
) {
  const snapshot = await readProfileRewardSnapshot(supabase, userId);
  if (!snapshot) return;

  const newCurrentStreak = (snapshot.current_win_streak ?? 0) + 1;
  const newBestStreak = Math.max(snapshot.best_win_streak ?? 0, newCurrentStreak);

  const { error } = await supabase
    .from("profiles")
    .update({
      points: (snapshot.points ?? 0) + rewardPoints,
      games_played: (snapshot.games_played ?? 0) + 1,
      games_won: (snapshot.games_won ?? 0) + 1,
      total_points_earned: (snapshot.total_points_earned ?? 0) + rewardPoints,
      current_win_streak: newCurrentStreak,
      best_win_streak: newBestStreak,
    })
    .eq("id", userId);

  if (error) {
    console.error("Error actualizando ganador:", error);
  }
}

async function applyNonWinnerReward(
  supabase: SupabaseClient,
  userId: string,
  rewardPoints: number
) {
  const snapshot = await readProfileRewardSnapshot(supabase, userId);
  if (!snapshot) return;

  const { error } = await supabase
    .from("profiles")
    .update({
      points: (snapshot.points ?? 0) + rewardPoints,
      games_played: (snapshot.games_played ?? 0) + 1,
      games_lost: (snapshot.games_lost ?? 0) + 1,
      total_points_earned: (snapshot.total_points_earned ?? 0) + rewardPoints,
      current_win_streak: 0,
    })
    .eq("id", userId);

  if (error) {
    console.error("Error actualizando no-ganador:", error);
  }
}

export async function applyHeadToHeadMatchRewards({
  supabase,
  winnerUserId,
  loserUserId,
  winnerPoints = 5,
  loserPoints = 2,
}: ApplyHeadToHeadMatchRewardsParams) {
  if (winnerUserId) {
    await applyWinnerReward(supabase, winnerUserId, winnerPoints);
  }

  if (loserUserId) {
    await applyNonWinnerReward(supabase, loserUserId, loserPoints);
  }
}

export async function applySingleWinnerMatchRewards({
  supabase,
  winnerUserId,
  participantUserIds,
  winnerPoints = 5,
  participantPoints = 2,
}: ApplySingleWinnerMatchRewardsParams) {
  const uniqueParticipants = Array.from(
    new Set((participantUserIds ?? []).filter(Boolean))
  ) as string[];

  if (winnerUserId) {
    await applyWinnerReward(supabase, winnerUserId, winnerPoints);
  }

  const losers = uniqueParticipants.filter((userId) => userId !== winnerUserId);

  for (const loserUserId of losers) {
    await applyNonWinnerReward(supabase, loserUserId, participantPoints);
  }
}
