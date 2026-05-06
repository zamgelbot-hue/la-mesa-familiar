// 📍 Ruta del archivo: lib/room/roomQueries.ts

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Game, ProfileMap, Room, RoomPlayer } from "./roomTypes";

export async function fetchRoomByCode(params: {
  supabase: SupabaseClient;
  code: string;
  retries?: number;
  delayMs?: number;
}): Promise<Room | null> {
  const { supabase, code, retries = 10, delayMs = 700 } = params;

  for (let attempt = 0; attempt < retries; attempt += 1) {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (error) {
      console.error("Error cargando room:", error);
    }

    if (data) {
      return data as Room;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  const { data: fallbackData, error: fallbackError } = await supabase
    .from("rooms")
    .select("*")
    .ilike("code", code)
    .maybeSingle();

  if (fallbackError) {
    console.error("Error cargando room fallback:", fallbackError);
  }

  return (fallbackData ?? null) as Room | null;
}

export async function fetchGameBySlug(params: {
  supabase: SupabaseClient;
  gameSlug?: string | null;
}): Promise<Game | null> {
  const { supabase, gameSlug } = params;

  if (!gameSlug) return null;

  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("slug", gameSlug)
    .maybeSingle();

  if (error) {
    console.error("Error cargando game:", error);
    return null;
  }

  return (data ?? null) as Game | null;
}

export async function fetchRoomPlayers(params: {
  supabase: SupabaseClient;
  code: string;
}): Promise<RoomPlayer[]> {
  const { supabase, code } = params;

  const { data, error } = await supabase
    .from("room_players")
    .select("*")
    .eq("room_code", code)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error cargando players:", error);
    return [];
  }

  return (data ?? []) as RoomPlayer[];
}

export async function fetchProfilesMapForPlayers(params: {
  supabase: SupabaseClient;
  players: RoomPlayer[];
}): Promise<ProfileMap> {
  const { supabase, players } = params;

  const userIds = Array.from(
    new Set(players.map((player) => player.user_id).filter(Boolean)),
  ) as string[];

  if (userIds.length === 0) {
    return {};
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_key, frame_key, points")
    .in("id", userIds);

  if (error) {
    console.error("Error cargando perfiles:", error);
    return {};
  }

  const nextMap: ProfileMap = {};

  for (const profile of data ?? []) {
    nextMap[profile.id] = {
      display_name: profile.display_name,
      avatar_key: profile.avatar_key,
      frame_key: profile.frame_key,
      points: profile.points,
    };
  }

  return nextMap;
}

export async function touchRoomActivity(params: {
  supabase: SupabaseClient;
  code: string;
}) {
  const { supabase, code } = params;

  if (!code) return;

  const { error } = await supabase
    .from("rooms")
    .update({ last_activity_at: new Date().toISOString() })
    .eq("code", code);

  if (error) {
    console.error("Error actualizando actividad de sala:", error);
  }
}
