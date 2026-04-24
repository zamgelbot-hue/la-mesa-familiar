// lib/rewards/rewardEngine.ts

import type { SupabaseClient } from "@supabase/supabase-js";

const MIN_REWARD_COOLDOWN_MS = 15000; // 15 segundos

type PlayerRewardInput = {
  userId: string | null | undefined;
  isGuest?: boolean;
  placement: number;
  basePoints: number;
};

type RewardEngineInput = {
  supabase: SupabaseClient;
  gameType: string;
  players: PlayerRewardInput[];
};

type ProfileRewardSnapshot = {
  points: number | null;
  games_played: number | null;
  games_won: number | null;
  games_lost: number | null;
  total_points_earned: number | null;
  current_win_streak: number | null;
  best_win_streak: number | null;
  last_reward_at: string | null;
};

async function readProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<ProfileRewardSnapshot | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "points, games_played, games_won, games_lost, total_points_earned, current_win_streak, best_win_streak, last_reward_at"
    )
    .eq("id", userId)
    .single();

  if (error || !data) return null;

  return data as ProfileRewardSnapshot;
}

function getStreakBonus(streak: number) {
  if (streak >= 5) return 2;
  if (streak >= 3) return 1;
  return 0;
}

function isOnCooldown(lastRewardAt: string | null | undefined) {
  if (!lastRewardAt) return false;

  const last = new Date(lastRewardAt).getTime();
  const now = Date.now();

  return now - last < MIN_REWARD_COOLDOWN_MS;
}

export async function applyRewardsEngine({
  supabase,
  gameType,
  players,
}: RewardEngineInput) {
  for (const player of players) {
    if (!player.userId) continue;
    if (player.userId.startsWith("guest:")) continue;

    const snapshot = await readProfile(supabase, player.userId);
    if (!snapshot) continue;

    if (isOnCooldown(snapshot.last_reward_at)) {
      continue; // evita farming
    }

    const isWinner = player.placement === 1;

    const nextStreak = isWinner
      ? (snapshot.current_win_streak ?? 0) + 1
      : 0;

    const bestStreak = Math.max(snapshot.best_win_streak ?? 0, nextStreak);
    const streakBonus = isWinner ? getStreakBonus(nextStreak) : 0;
    const finalPoints = player.basePoints + streakBonus;
    const rewardedAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        points: (snapshot.points ?? 0) + finalPoints,
        games_played: (snapshot.games_played ?? 0) + 1,
        games_won: isWinner
          ? (snapshot.games_won ?? 0) + 1
          : snapshot.games_won ?? 0,
        games_lost: !isWinner
          ? (snapshot.games_lost ?? 0) + 1
          : snapshot.games_lost ?? 0,
        total_points_earned:
          (snapshot.total_points_earned ?? 0) + finalPoints,
        current_win_streak: nextStreak,
        best_win_streak: bestStreak,
        last_reward_at: rewardedAt,
      })
      .eq("id", player.userId);

    if (updateError) {
      console.error("Error actualizando rewards en profile:", updateError);
      continue;
    }

    const { error: eventError } = await supabase.from("reward_events").insert({
      user_id: player.userId,
      game_type: gameType,
      points_awarded: finalPoints,
      placement: player.placement,
      created_at: rewardedAt,
    });

    if (eventError) {
      console.error("Error guardando reward_event:", eventError);
    }
  }
}
