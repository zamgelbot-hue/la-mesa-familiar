// 📍 Ruta del archivo: components/games/gato/gatoQueries.ts

import type { SupabaseClient } from "@supabase/supabase-js";
import type { GatoState, RoomPlayer } from "./utils";

export async function fetchGatoPlayers({
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
    console.error("Error cargando jugadores de Gato:", error);
    return [];
  }

  return (data ?? []) as RoomPlayer[];
}

export async function fetchGatoRoomStatus({
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
    console.error("Error cargando sala de Gato:", error);
    return "playing";
  }

  return data?.status ?? "playing";
}

export async function updateGatoRoomStatus({
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
    console.error("Error actualizando sala de Gato:", error);
  }
}

export async function fetchGatoGameState({
  supabase,
  roomCode,
}: {
  supabase: SupabaseClient;
  roomCode: string;
}): Promise<Partial<GatoState> | null> {
  const { data, error } = await supabase
    .from("game_state")
    .select("state")
    .eq("room_code", roomCode)
    .maybeSingle();

  if (error) {
    console.error("Error cargando estado de Gato:", error);
    return null;
  }

  return (data?.state ?? null) as Partial<GatoState> | null;
}

export async function upsertGatoGameState({
  supabase,
  roomCode,
  state,
}: {
  supabase: SupabaseClient;
  roomCode: string;
  state: GatoState;
}) {
  const { data } = await supabase
    .from("game_state")
    .select("id")
    .eq("room_code", roomCode)
    .maybeSingle();

  if (data?.id) {
    const { error } = await supabase
      .from("game_state")
      .update({
        state,
        updated_at: new Date().toISOString(),
      })
      .eq("room_code", roomCode);

    if (error) {
      console.error("Error actualizando estado de Gato:", error);
      return false;
    }

    return true;
  }

  const { error } = await supabase.from("game_state").insert({
    room_code: roomCode,
    state,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Error creando estado de Gato:", error);
    return false;
  }

  return true;
}