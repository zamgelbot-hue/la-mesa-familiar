// 📍 Ruta del archivo: components/games/piedra-papel-o-tijera/pptActions.ts

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { SupabaseClient } from "@supabase/supabase-js";
import { returnToRoom } from "@/lib/games/gameNavigation";
import { buildFreshState } from "./pptUtils";
import { upsertPPTGameState, updatePPTRoomStatus } from "./pptQueries";
import type { Choice, GameState, RoomPlayer } from "./pptTypes";
import { BOT_PLAYER_NAME, getRandomBotChoice } from "./pptBot";

export async function savePPTChoice(params: {
  supabase: SupabaseClient;
  roomCode: string;
  gameState: GameState;
  playerName: string;
  choice: Exclude<Choice, null>;
}) {
  const { supabase, roomCode, gameState, playerName, choice } = params;

  const nextState: GameState = {
    ...gameState,
    playerChoices: {
      ...gameState.playerChoices,
      [playerName]: choice,
    },
  };

  await upsertPPTGameState({ supabase, roomCode, state: nextState });
  return nextState;
}

export async function savePPTBotChoiceIfNeeded(params: {
  supabase: SupabaseClient;
  roomCode: string;
  gameState: GameState;
  isVsBot: boolean;
}) {
  const { supabase, roomCode, gameState, isVsBot } = params;

  if (!isVsBot) return gameState;
  if (gameState.playerChoices?.[BOT_PLAYER_NAME]) return gameState;

  const nextState: GameState = {
    ...gameState,
    playerChoices: {
      ...gameState.playerChoices,
      [BOT_PLAYER_NAME]: getRandomBotChoice(),
    },
  };

  await upsertPPTGameState({ supabase, roomCode, state: nextState });
  return nextState;
}

export async function rematchPPT(params: {
  supabase: SupabaseClient;
  roomCode: string;
  players: RoomPlayer[];
}) {
  const { supabase, roomCode, players } = params;

  await upsertPPTGameState({
    supabase,
    roomCode,
    state: buildFreshState(players),
  });

  await updatePPTRoomStatus({ supabase, roomCode, status: "playing" });
}

export async function goBackToPPTRoom(params: {
  supabase: SupabaseClient;
  router: AppRouterInstance;
  roomCode: string;
  players: RoomPlayer[];
}) {
  const { supabase, router, roomCode, players } = params;

  await updatePPTRoomStatus({ supabase, roomCode, status: "waiting" });

  await supabase
    .from("room_players")
    .update({ is_ready: false })
    .eq("room_code", roomCode);

  await upsertPPTGameState({
    supabase,
    roomCode,
    state: buildFreshState(players),
  });

  returnToRoom({ router, roomCode });
}