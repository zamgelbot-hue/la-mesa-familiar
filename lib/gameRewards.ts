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

export type RewardGameType =
  | "ppt_human"
  | "ppt_bot"
  | "pregunta"
  | "loteria";

type RewardConfig = {
  winnerPoints: number;
  loserPoints: number;
};

const REWARD_TABLE: Record<RewardGameType, RewardConfig> = {
  ppt_human: {
    winnerPoints: 6,
    loserPoints: 2,
  },
  ppt_bot: {
    winnerPoints: 2,
    loserPoints: 1,
  },
  pregunta: {
    winnerPoints: 10,
    loserPoints: 4,
  },
  loteria: {
    winnerPoints: 7,
    loserPoints: 3,
  },
};

type ApplyHeadToHeadMatchRewardsParams = {
  supabase: SupabaseClient;
  winnerUserId: string | null | undefined;
  loserUserId: string | null | undefined;
  gameType: RewardGameType;
};

type ApplySingleWinnerMatchRewardsParams = {
  supabase: SupabaseClient;
  winnerUserId: string | null | undefined;
  participantUserIds: Array<string | null | undefined>;
  gameType: RewardGameType;
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

function getStreakBonus(nextWinStreak: number): number {
  if (nextWinStreak >= 5) return 2;
  if (nextWinStreak >= 3) return 1;
  return 0;
}

async function applyWinnerReward(
  supabase: SupabaseClient,
  userId: string,
  baseRewardPoints: number
) {
  const snapshot = await readProfileRewardSnapshot(supabase, userId);
  if (!snapshot) return;

  const newCurrentStreak = (snapshot.current_win_streak ?? 0) + 1;
  const newBestStreak = Math.max(snapshot.best_win_streak ?? 0, newCurrentStreak);
  const streakBonus = getStreakBonus(newCurrentStreak);
  const finalRewardPoints = baseRewardPoints + streakBonus;

  const { error } = await supabase
    .from("profiles")
    .update({
      points: (snapshot.points ?? 0) + finalRewardPoints,
      games_played: (snapshot.games_played ?? 0) + 1,
      games_won: (snapshot.games_won ?? 0) + 1,
      total_points_earned: (snapshot.total_points_earned ?? 0) + finalRewardPoints,
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
  gameType,
}: ApplyHeadToHeadMatchRewardsParams) {
  const rewardConfig = REWARD_TABLE[gameType];

  if (!rewardConfig) {
    console.error("Tipo de juego no configurado en recompensas:", gameType);
    return;
  }

  if (winnerUserId) {
    await applyWinnerReward(supabase, winnerUserId, rewardConfig.winnerPoints);
  }

  if (loserUserId) {
    await applyNonWinnerReward(supabase, loserUserId, rewardConfig.loserPoints);
  }
}

export async function applySingleWinnerMatchRewards({
  supabase,
  winnerUserId,
  participantUserIds,
  gameType,
}: ApplySingleWinnerMatchRewardsParams) {
  const rewardConfig = REWARD_TABLE[gameType];

  if (!rewardConfig) {
    console.error("Tipo de juego no configurado en recompensas:", gameType);
    return;
  }

  const uniqueParticipants = Array.from(
    new Set((participantUserIds ?? []).filter(Boolean))
  ) as string[];

  if (winnerUserId) {
    await applyWinnerReward(supabase, winnerUserId, rewardConfig.winnerPoints);
  }

  const losers = uniqueParticipants.filter((userId) => userId !== winnerUserId);

  for (const loserUserId of losers) {
    await applyNonWinnerReward(supabase, loserUserId, rewardConfig.loserPoints);
  }
}
