import type { SupabaseClient } from "@supabase/supabase-js";
import { applyRewardsEngine } from "@/lib/rewards/rewardEngine";
import type { FinalStanding, GlobalRewardBreakdown } from "./questionTypes";
import { calculateGlobalRewards } from "./scoring";

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

        return {
          userId: player.playerId,
          placement: player.position,
          basePoints: reward.totalReward,
        };
      })
      .filter(Boolean) as {
        userId: string;
        placement: number;
        basePoints: number;
      }[],
  });
}
