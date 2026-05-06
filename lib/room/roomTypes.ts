// 📍 Ruta del archivo: lib/room/roomTypes.ts

export type RoomVisibility = "private" | "public" | "friends";

export type Room = {
  id: string;
  code: string;
  status: string;
  started_at: string | null;
  game_slug: string | null;
  max_players: number | null;
  game_variant: string | null;
  room_settings: Record<string, unknown> | null;
  visibility: RoomVisibility | null;
  created_by: string | null;
  last_activity_at: string | null;
};

export type RoomPlayer = {
  id: string;
  room_code: string;
  player_name: string;
  is_host: boolean;
  is_ready: boolean;
  created_at: string;
  user_id: string | null;
  is_guest: boolean;
};

export type Game = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  min_players: number;
  max_players: number;
  status: "available" | "coming_soon";
  sort_order: number;
};

export type ProfileMap = Record<
  string,
  {
    display_name: string | null;
    avatar_key: string | null;
    frame_key: string | null;
    points: number | null;
  }
>;
