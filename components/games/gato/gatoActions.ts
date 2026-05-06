// 📍 Ruta del archivo: components/games/gato/gatoActions.ts

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { SupabaseClient } from "@supabase/supabase-js";
import { returnToRoom } from "@/lib/games/gameNavigation";
import { applyHeadToHeadMatchRewards } from "@/lib/gameRewards";
import { updateGatoRoomStatus, upsertGatoGameState } from "./gatoQueries";
import { buildFreshState } from "./utils";
import type { GatoState, RoomPlayer } from "./utils";

export async function writeGatoGameState(params: {
  supabase: SupabaseClient;
  roomCode: string;
  state: GatoState;
}) {
  const saved = await upsertGatoGameState({
    supabase: params.supabase,
    roomCode: params.roomCode,
    state: params.state,
  });

  return saved;
}

export async function goBackToGatoRoom(params: {
  supabase: SupabaseClient;
  router: AppRouterInstance;
  roomCode: string;
}) {
  const { supabase, router, roomCode } = params;

  await updateGatoRoomStatus({
    supabase,
    roomCode,
    status: "waiting",
  });

  returnToRoom({
    router,
    roomCode,
  });
}

export async function resetGatoMatch(params: {
  supabase: SupabaseClient;
  roomCode: string;
  players: RoomPlayer[];
  boardSize: number;
  winLength: number;
  bonusWinLength: number | null;
}) {
  const { supabase, roomCode, players, boardSize, winLength, bonusWinLength } =
    params;

  const fresh = buildFreshState(players, boardSize, winLength, bonusWinLength);

  await upsertGatoGameState({
    supabase,
    roomCode,
    state: fresh,
  });

  await updateGatoRoomStatus({
    supabase,
    roomCode,
    status: "playing",
  });

  return fresh;
}

export async function awardGatoRewards(params: {
  supabase: SupabaseClient;
  winnerName: string | null;
  players: RoomPlayer[];
  isVsBot: boolean;
}) {
  const { supabase, winnerName, players, isVsBot } = params;

  if (!winnerName) return;
  if (isVsBot) return;

  const winner = players.find((player) => player.player_name === winnerName);
  const loser = players.find((player) => player.player_name !== winnerName);

  await applyHeadToHeadMatchRewards({
    supabase,
    winnerUserId: winner?.user_id,
    loserUserId: loser?.user_id,
    gameType: "gato",
  });
}