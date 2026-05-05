// 📍 Ruta del archivo: lib/home/homeTypes.ts

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

export type HomeStats = {
  activePlayers: number;
  classicGames: number;
  gamesPlayed: number;
};

export type TopPlayer = {
  id: string;
  display_name: string | null;
  points: number | null;
  games_played: number | null;
  games_won: number | null;
  games_lost: number | null;
  total_points_earned: number | null;
  best_win_streak: number | null;
  avatar_key: string | null;
  frame_key: string | null;
};

export type RoomVisibility = "private" | "public" | "friends";

export type OpenRoom = {
  code: string;
  status: string;
  game_slug: string | null;
  game_variant: string | null;
  max_players: number | null;
  visibility: RoomVisibility | null;
  created_by: string | null;
  created_at: string;
  last_activity_at: string | null;
};

export type FriendshipRow = {
  requester_id: string;
  addressee_id: string;
  status: string;
};

export const DEFAULT_STATS: HomeStats = {
  activePlayers: 0,
  classicGames: 0,
  gamesPlayed: 0,
};
