import type { SupabaseClient } from "@supabase/supabase-js";
import { applyRewardsEngine } from "@/lib/rewards/rewardEngine";

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

  await applyRewardsEngine({
    supabase,
    players: [
      {
        userId: winnerUserId,
        placement: 1,
        basePoints: rewardConfig.winnerPoints,
      },
      {
        userId: loserUserId,
        placement: 2,
        basePoints: rewardConfig.loserPoints,
      },
    ],
  });
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

  await applyRewardsEngine({
    supabase,
    players: uniqueParticipants.map((userId) => ({
      userId,
      placement: userId === winnerUserId ? 1 : 2,
      basePoints:
        userId === winnerUserId
          ? rewardConfig.winnerPoints
          : rewardConfig.loserPoints,
    })),
  });
}
