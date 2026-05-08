// 📍 Ruta del archivo: components/games/domino/dominoTypes.ts

export type DominoSide = "left" | "right";

export type DominoTile = {
  id: string;
  a: number;
  b: number;
};

export type DominoPlacedTile = DominoTile & {
  side: DominoSide | "start";
  playedBy: string;
  playedAt: number;
  flipped: boolean;
};

export type DominoPlayer = {
  key: string;
  name: string;
  isHost: boolean;
  userId?: string | null;
};

export type DominoMove = {
  playerKey: string;
  playerName: string;
  tileId: string;
  side: DominoSide;
  flipped: boolean;
  createdAt: number;
};

export type DominoPass = {
  playerKey: string;
  playerName: string;
  createdAt: number;
};

export type DominoState = {
  game_slug: "domino";
  match_id: string;
  variant: string;
  status: "waiting" | "playing" | "finished";
  players: DominoPlayer[];
  hands: Record<string, DominoTile[]>;
  boneyard: DominoTile[];
  board: DominoPlacedTile[];
  current_turn_key: string | null;
  winner_key: string | null;
  winner_name: string | null;
  is_blocked: boolean;
  result_text: string | null;
  moves: DominoMove[];
  passes: DominoPass[];
  last_action_text: string | null;
  rewards_applied: boolean;
  rematch_votes: string[];
};

export type DominoRoomPlayerRow = {
  id: string;
  room_code: string;
  user_id: string | null;
  player_name: string;
  is_host: boolean | null;
  is_guest: boolean | null;
  is_ready: boolean | null;
  created_at: string;
};
