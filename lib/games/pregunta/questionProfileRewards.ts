import type { SupabaseClient } from "@supabase/supabase-js";
import { applyRewardsEngine } from "@/lib/rewards/rewardEngine";
import type { FinalStanding, GlobalRewardBreakdown } from "./questionTypes";
import { calculateGlobalRewards } from "./scoring";

function calculateSmartPreguntaReward(
  player: FinalStanding,
  reward: GlobalRewardBreakdown,
) {
  const correctAnswers = player.correctAnswers ?? 0;
  const incorrectAnswers = player.incorrectAnswers ?? 0;
  const totalAnswers = correctAnswers + incorrectAnswers;

  const accuracy = totalAnswers > 0 ? correctAnswers / totalAnswers : 0;

  const accuracyMultiplier =
    accuracy >= 0.8 ? 1.3 :
    accuracy >= 0.6 ? 1.15 :
    1;

  const placementMultiplier =
    player.position === 1 ? 1.2 :
    player.position === 2 ? 1.1 :
    1;

  return Math.round(
    reward.totalReward * accuracyMultiplier * placementMultiplier
  );
}

export async function applyQuestionGameProfileRewards(
  supabase: SupabaseClient,
  standings: FinalStanding[],
) {
  const registeredStandings = standings.filter(
    (player) =>
      !!player.playerId &&
      typeof player.playerId === "string" &&
      !player.playerId.startsWith("guest:"),
  );

  if (!registeredStandings.length) return;

  const rewards: GlobalRewardBreakdown[] =
    calculateGlobalRewards(registeredStandings);

  const rewardMap = new Map(rewards.map((item) => [item.playerId, item]));

  await applyRewardsEngine({
    supabase,
    players: registeredStandings
      .map((player) => {
        const reward = rewardMap.get(player.playerId);
        if (!reward) return null;

        const finalPoints = calculateSmartPreguntaReward(player, reward);

        return {
          userId: player.playerId,
          placement: player.position,
          basePoints: finalPoints,
        };
      })
      .filter(Boolean) as {
        userId: string;
        placement: number;
        basePoints: number;
      }[],
  });
}
