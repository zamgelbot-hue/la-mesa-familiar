// 📍 Ruta del archivo: lib/home/homeRoomQueries.ts

import type { SupabaseClient } from "@supabase/supabase-js";
import type { FriendshipRow, OpenRoom } from "./homeTypes";

const OPEN_ROOM_ACTIVE_MS = 1000 * 60 * 60;

export async function loadPublicRooms(
  supabase: SupabaseClient,
): Promise<OpenRoom[]> {
  const oneHourAgo = new Date(Date.now() - OPEN_ROOM_ACTIVE_MS).toISOString();

  const { data, error } = await supabase
    .from("rooms")
    .select(
      "code, status, game_slug, game_variant, max_players, visibility, created_by, created_at, last_activity_at",
    )
    .eq("visibility", "public")
    .in("status", ["waiting"])
    .gte("last_activity_at", oneHourAgo)
    .order("last_activity_at", { ascending: false })
    .limit(12);

  if (error) {
    console.error("Error cargando salas públicas:", error);
    return [];
  }

  return (data ?? []) as OpenRoom[];
}

export async function loadFriendRooms(params: {
  supabase: SupabaseClient;
  userId?: string | null;
  isGuest?: boolean;
}): Promise<OpenRoom[]> {
  const { supabase, userId, isGuest } = params;

  if (!userId || isGuest) {
    return [];
  }

  const oneHourAgo = new Date(Date.now() - OPEN_ROOM_ACTIVE_MS).toISOString();

  const { data: friendships, error: friendshipsError } = await supabase
    .from("friendships")
    .select("requester_id, addressee_id, status")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  if (friendshipsError) {
    console.error("Error cargando amistades para salas:", friendshipsError);
    return [];
  }

  const friendIds = Array.from(
    new Set(
      ((friendships ?? []) as FriendshipRow[]).map((friendship) =>
        friendship.requester_id === userId
          ? friendship.addressee_id
          : friendship.requester_id,
      ),
    ),
  );

  if (friendIds.length === 0) {
    return [];
  }

  const { data: rooms, error: roomsError } = await supabase
    .from("rooms")
    .select(
      "code, status, game_slug, game_variant, max_players, visibility, created_by, created_at, last_activity_at",
    )
    .eq("visibility", "friends")
    .in("status", ["waiting"])
    .in("created_by", friendIds)
    .gte("last_activity_at", oneHourAgo)
    .order("last_activity_at", { ascending: false })
    .limit(12);

  if (roomsError) {
    console.error("Error cargando salas de amigos:", roomsError);
    return [];
  }

  return (rooms ?? []) as OpenRoom[];
}
