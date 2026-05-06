// 📍 Ruta del archivo: components/games/piedra-papel-o-tijera/pptRewards.ts

import type { SupabaseClient } from "@supabase/supabase-js";
import { BOT_REWARD_COOLDOWN_MS } from "./pptBot";

export async function applyBotWinReward({
  supabase,
  userId,
}: {
  supabase: SupabaseClient;
  userId: string | null | undefined;
}) {
  if (!userId) return;
  if (userId.startsWith("guest:")) return;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("points, total_points_earned, last_reward_at")
    .eq("id", userId)
    .single();

  if (profileError || !profile) return;

  const lastRewardAt = profile.last_reward_at
    ? new Date(profile.last_reward_at).getTime()
    : 0;

  const now = Date.now();

  if (now - lastRewardAt < BOT_REWARD_COOLDOWN_MS) {
    console.log("⏳ Reward VS Bot en cooldown");
    return;
  }

  const rewardedAt = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      points: (profile.points ?? 0) + 1,
      total_points_earned: (profile.total_points_earned ?? 0) + 1,
      last_reward_at: rewardedAt,
    })
    .eq("id", userId);

  if (updateError) {
    console.error("Error dando reward VS Bot:", updateError);
    return;
  }

  const { error: eventError } = await supabase.from("reward_events").insert({
    user_id: userId,
    game_type: "ppt_bot",
    points_awarded: 1,
    placement: 1,
    created_at: rewardedAt,
  });

  if (eventError) {
    console.error("Error guardando reward_event VS Bot:", eventError);
  }
}