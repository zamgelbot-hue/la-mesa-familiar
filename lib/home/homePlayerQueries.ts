// 📍 Ruta del archivo: lib/home/homePlayerQueries.ts

import type { SupabaseClient } from "@supabase/supabase-js";
import type { HomeStats, TopPlayer } from "./homeTypes";

export const DEFAULT_STATS: HomeStats = {
  activePlayers: 0,
  classicGames: 0,
  gamesPlayed: 0,
};

export async function loadHomeStats(supabase: SupabaseClient): Promise<HomeStats> {
  const [activeRoomsRes, gamesCountRes, roomsCountRes] = await Promise.all([
    supabase
      .from("rooms")
      .select("code", { count: "exact" })
      .in("status", ["waiting", "playing"]),
    supabase.from("games").select("id", { count: "exact", head: true }),
    supabase.from("rooms").select("id", { count: "exact", head: true }),
  ]);

  if (activeRoomsRes.error) {
    console.error("Error cargando salas activas:", activeRoomsRes.error);
  }

  if (gamesCountRes.error) {
    console.error("Error contando games:", gamesCountRes.error);
  }

  if (roomsCountRes.error) {
    console.error("Error contando rooms:", roomsCountRes.error);
  }

  let activePlayers = 0;
  const activeRoomCodes = (activeRoomsRes.data ?? []).map((room) => room.code);

  if (activeRoomCodes.length > 0) {
    const roomPlayersRes = await supabase
      .from("room_players")
      .select("id", { count: "exact", head: true })
      .in("room_code", activeRoomCodes);

    if (roomPlayersRes.error) {
      console.error("Error contando jugadores activos:", roomPlayersRes.error);
    } else {
      activePlayers = roomPlayersRes.count ?? 0;
    }
  }

  return {
    activePlayers,
    classicGames: gamesCountRes.count ?? 0,
    gamesPlayed: roomsCountRes.count ?? 0,
  };
}

export async function loadTopPlayers(
  supabase: SupabaseClient,
): Promise<TopPlayer[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, display_name, points, games_played, games_won, games_lost, total_points_earned, best_win_streak, avatar_key, frame_key",
    )
    .not("display_name", "is", null)
    .order("points", { ascending: false })
    .order("games_won", { ascending: false })
    .order("best_win_streak", { ascending: false })
    .limit(3);

  if (error) {
    console.error("Error cargando top players:", error);
    return [];
  }

  return (data ?? []) as TopPlayer[];
}
