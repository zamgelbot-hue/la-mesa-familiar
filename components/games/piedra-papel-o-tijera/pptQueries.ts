// 📍 Ruta del archivo: components/games/piedra-papel-o-tijera/pptQueries.ts

import type { SupabaseClient } from "@supabase/supabase-js";
import type { GameState, ProfileMap, RoomPlayer } from "./pptTypes";

export async function fetchPPTPlayers({
  supabase,
  roomCode,
}: {
  supabase: SupabaseClient;
  roomCode: string;
}): Promise<RoomPlayer[]> {
  const { data, error } = await supabase
    .from("room_players")
    .select("*")
    .eq("room_code", roomCode)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error cargando jugadores PPT:", error);
    return [];
  }

  return (data ?? []) as RoomPlayer[];
}

export async function fetchPPTProfilesMap({
  supabase,
  players,
}: {
  supabase: SupabaseClient;
  players: RoomPlayer[];
}): Promise<ProfileMap> {
  const userIds = Array.from(
    new Set(players.map((player) => player.user_id).filter(Boolean)),
  ) as string[];

  if (userIds.length === 0) return {};

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, display_name, avatar_key, frame_key, points, games_played, games_won, games_lost",
    )
    .in("id", userIds);

  if (error) {
    console.error("Error cargando perfiles PPT:", error);
    return {};
  }

  const nextMap: ProfileMap = {};

  for (const profile of data ?? []) {
    nextMap[profile.id] = {
      display_name: profile.display_name,
      avatar_key: profile.avatar_key,
      frame_key: profile.frame_key,
      points: profile.points,
      games_played: profile.games_played,
      games_won: profile.games_won,
      games_lost: profile.games_lost,
    };
  }

  return nextMap;
}

export async function fetchPPTGameState({
  supabase,
  roomCode,
}: {
  supabase: SupabaseClient;
  roomCode: string;
}): Promise<GameState | null> {
  const { data, error } = await supabase
    .from("game_state")
    .select("state")
    .eq("room_code", roomCode)
    .maybeSingle();

  if (error) {
    console.error("Error cargando estado PPT:", error);
    return null;
  }

  return (data?.state ?? null) as GameState | null;
}

export async function upsertPPTGameState({
  supabase,
  roomCode,
  state,
}: {
  supabase: SupabaseClient;
  roomCode: string;
  state: GameState;
}) {
  const { error } = await supabase.from("game_state").upsert({
    room_code: roomCode,
    state,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Error guardando estado PPT:", error);
  }
}

export async function fetchPPTRoomStatus({
  supabase,
  roomCode,
}: {
  supabase: SupabaseClient;
  roomCode: string;
}) {
  const { data, error } = await supabase
    .from("rooms")
    .select("status")
    .eq("code", roomCode)
    .maybeSingle();

  if (error) {
    console.error("Error cargando status de sala PPT:", error);
    return "playing";
  }

  return data?.status ?? "playing";
}

export async function updatePPTRoomStatus({
  supabase,
  roomCode,
  status,
}: {
  supabase: SupabaseClient;
  roomCode: string;
  status: string;
}) {
  const { error } = await supabase
    .from("rooms")
    .update({
      status,
      last_activity_at: new Date().toISOString(),
    })
    .eq("code", roomCode);

  if (error) {
    console.error("Error actualizando status de sala PPT:", error);
  }
}