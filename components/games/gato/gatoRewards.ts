// 📍 Ruta del archivo: components/games/gato/gatoRewards.ts

import type { SupabaseClient } from "@supabase/supabase-js";
import { applyRewardsEngine } from "@/lib/rewards/rewardEngine";
import { GATO_BOT_NAME } from "./gatoBot";
import type { GatoState, RoomPlayer } from "./utils";

const GATO_BOT_REWARD_COOLDOWN_MS = 60000;

export async function applyGatoBotWinReward({
  supabase,
  userId,
}: {
  supabase: SupabaseClient;
  userId: string | null | undefined;
}) {
  if (!userId || userId.startsWith("guest:")) return;

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

  if (now - lastRewardAt < GATO_BOT_REWARD_COOLDOWN_MS) {
    console.log("⏳ Reward Gato VS Bot en cooldown");
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
    console.error("Error dando reward Gato VS Bot:", updateError);
    return;
  }

  const { error: eventError } = await supabase.from("reward_events").insert({
    user_id: userId,
    game_type: "gato_bot",
    points_awarded: 1,
    placement: 1,
    created_at: rewardedAt,
  });

  if (eventError) {
    console.error("Error guardando reward_event Gato VS Bot:", eventError);
  }
}

export async function awardGatoMatchRewardsIfNeeded(params: {
  supabase: SupabaseClient;
  state: GatoState;
  players: RoomPlayer[];
  realPlayers: RoomPlayer[];
  isVsBot: boolean;
}) {
  const { supabase, state, players, realPlayers, isVsBot } = params;

  if (!state.match_over) return false;
  if (state.is_draw) return false;
  if (!state.winner) return false;
  if (state.rewards_applied) return false;

  if (isVsBot) {
    if (state.winner === GATO_BOT_NAME) return true;

    const humanWinner = realPlayers.find(
      (player) => player.player_name === state.winner,
    );

    if (humanWinner) {
      await applyGatoBotWinReward({
        supabase,
        userId: humanWinner.user_id,
      });
    }

    return true;
  }

  const winner = players.find((player) => player.player_name === state.winner);
  const loser = players.find((player) => player.player_name !== state.winner);

  if (!winner || !loser) return false;

  await applyRewardsEngine({
    supabase,
    gameType: "gato",
    players: [
      {
        userId: winner.user_id,
        placement: 1,
        basePoints: state.is_bonus_win ? 7 : 4,
      },
      {
        userId: loser.user_id,
        placement: 2,
        basePoints: 1,
      },
    ],
  });

  return true;
}