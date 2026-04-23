import type { SupabaseClient } from "@supabase/supabase-js";
import type { FinalStanding, GlobalRewardBreakdown } from "./questionTypes";
import { calculateGlobalRewards } from "./scoring";

type ProfileRewardSnapshot = {
  points: number | null;
  games_played: number | null;
  games_won: number | null;
  games_lost: number | null;
  total_points_earned: number | null;
  current_win_streak: number | null;
  best_win_streak: number | null;
};

async function readProfileRewardSnapshot(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProfileRewardSnapshot | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "points, games_played, games_won, games_lost, total_points_earned, current_win_streak, best_win_streak",
    )
    .eq("id", userId)
    .single();

  if (error || !data) {
    console.error("Error leyendo perfil para recompensas de pregunta:", error);
    return null;
  }

  return data as ProfileRewardSnapshot;
}

function getWinStreakBonus(nextWinStreak: number): number {
  if (nextWinStreak >= 5) return 2;
  if (nextWinStreak >= 3) return 1;
  return 0;
}

async function applyWinnerReward(
  supabase: SupabaseClient,
  userId: string,
  rewardPoints: number,
) {
  const snapshot = await readProfileRewardSnapshot(supabase, userId);
  if (!snapshot) return;

  const newCurrentStreak = (snapshot.current_win_streak ?? 0) + 1;
  const newBestStreak = Math.max(snapshot.best_win_streak ?? 0, newCurrentStreak);
  const streakBonus = getWinStreakBonus(newCurrentStreak);
  const finalReward = rewardPoints + streakBonus;

  const { error } = await supabase
    .from("profiles")
    .update({
      points: (snapshot.points ?? 0) + finalReward,
      games_played: (snapshot.games_played ?? 0) + 1,
      games_won: (snapshot.games_won ?? 0) + 1,
      games_lost: snapshot.games_lost ?? 0,
      total_points_earned: (snapshot.total_points_earned ?? 0) + finalReward,
      current_win_streak: newCurrentStreak,
      best_win_streak: newBestStreak,
    })
    .eq("id", userId);

  if (error) {
    console.error("Error actualizando ganador de pregunta:", error);
  }
}

async function applyNonWinnerReward(
  supabase: SupabaseClient,
  userId: string,
  rewardPoints: number,
) {
  const snapshot = await readProfileRewardSnapshot(supabase, userId);
  if (!snapshot) return;

  const { error } = await supabase
    .from("profiles")
    .update({
      points: (snapshot.points ?? 0) + rewardPoints,
      games_played: (snapshot.games_played ?? 0) + 1,
      games_won: snapshot.games_won ?? 0,
      games_lost: (snapshot.games_lost ?? 0) + 1,
      total_points_earned: (snapshot.total_points_earned ?? 0) + rewardPoints,
      current_win_streak: 0,
      best_win_streak: snapshot.best_win_streak ?? 0,
    })
    .eq("id", userId);

  if (error) {
    console.error("Error actualizando no-ganador de pregunta:", error);
  }
}

export async function applyQuestionGameProfileRewards(
  supabase: SupabaseClient,
  standings: FinalStanding[],
) {
  const registeredStandings = standings.filter((player) => !!player.playerId);

  if (!registeredStandings.length) return;

  const rewards: GlobalRewardBreakdown[] = calculateGlobalRewards(registeredStandings);

  const rewardMap = new Map(rewards.map((item) => [item.playerId, item]));
  const winner = registeredStandings.find((player) => player.position === 1);

  for (const player of registeredStandings) {
    const reward = rewardMap.get(player.playerId);
    if (!reward) continue;

    if (winner && player.playerId === winner.playerId) {
      await applyWinnerReward(supabase, player.playerId, reward.totalReward);
    } else {
      await applyNonWinnerReward(supabase, player.playerId, reward.totalReward);
    }
  }
}
