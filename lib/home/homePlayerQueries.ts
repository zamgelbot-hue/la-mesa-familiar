0// 📍 Ruta del archivo: lib/home/homePlayerQueries.ts

import type { SupabaseClient } from "@supabase/supabase-js";
import type { HomeStats, TopPlayer } from "./homeTypes";

export const DEFAULT_STATS: HomeStats = {
  activePlayers: 0,
  availableGames: 0,
  gamesPlayed: 0,
  roomsCreated: 0,
};

const DAILY_VISIT_DEVICE_KEY = "lmf:home-daily-device-id";

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function createDeviceId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `device_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function getOrCreateDeviceId() {
  if (typeof window === "undefined") return null;

  const current = window.localStorage.getItem(DAILY_VISIT_DEVICE_KEY);
  if (current) return current;

  const next = createDeviceId();
  window.localStorage.setItem(DAILY_VISIT_DEVICE_KEY, next);
  return next;
}

export async function registerHomeDailyVisit(supabase: SupabaseClient) {
  if (typeof window === "undefined") return false;

  const deviceId = getOrCreateDeviceId();
  if (!deviceId) return false;

  const visitDate = getTodayKey();
  const { data: userData } = await supabase.auth.getUser();

  const { error } = await supabase.from("home_daily_visits").upsert(
    {
      device_id: deviceId,
      visit_date: visitDate,
      user_id: userData.user?.id ?? null,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "device_id,visit_date" },
  );

  if (error) {
    console.error("Error registrando visita diaria:", error);
    return false;
  }

  return true;
}

export async function loadHomeStats(supabase: SupabaseClient): Promise<HomeStats> {
  const today = getTodayKey();

  const [dailyVisitsRes, gamesCountRes, startedRoomsRes, roomsCreatedRes] =
    await Promise.all([
      supabase
        .from("home_daily_visits")
        .select("id", { count: "exact", head: true })
        .eq("visit_date", today),
      supabase
        .from("games")
        .select("id", { count: "exact", head: true })
        .eq("status", "available"),
      supabase
        .from("rooms")
        .select("id", { count: "exact", head: true })
        .or("status.eq.playing,status.eq.closed,started_at.not.is.null"),
      supabase.from("rooms").select("id", { count: "exact", head: true }),
    ]);

  if (dailyVisitsRes.error) {
    console.error("Error contando visitas diarias:", dailyVisitsRes.error);
  }

  if (gamesCountRes.error) {
    console.error("Error contando juegos disponibles:", gamesCountRes.error);
  }

  if (startedRoomsRes.error) {
    console.error("Error contando partidas iniciadas:", startedRoomsRes.error);
  }

  if (roomsCreatedRes.error) {
    console.error("Error contando salas creadas:", roomsCreatedRes.error);
  }

  return {
    activePlayers: dailyVisitsRes.count ?? 0,
    availableGames: gamesCountRes.count ?? 0,
    gamesPlayed: startedRoomsRes.count ?? 0,
    roomsCreated: roomsCreatedRes.count ?? 0,
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