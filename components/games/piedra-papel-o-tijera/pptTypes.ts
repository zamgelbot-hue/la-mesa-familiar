export type Choice = "piedra" | "papel" | "tijera" | null;

export type RoundSoundType =
  | "piedra"
  | "papel"
  | "tijera"
  | "empate"
  | "victoria";

export type PPTGameProps = {
  roomCode: string;
  roomVariant?: string | null;
  roomSettings?: Record<string, any> | null;
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

export type GameState = {
  round: number;
  playerChoices: Record<string, Choice>;
  scores: Record<string, number>;
  roundWinner: string | null;
  resultText: string | null;
  resultDetail: string | null;
  champion: string | null;
  matchOver: boolean;
  rematchVotes: string[];
  canAdvanceRound: boolean;
};

export type ProfileMap = Record<
  string,
  {
    display_name: string | null;
    avatar_key: string | null;
    frame_key: string | null;
    points: number | null;
    games_played: number | null;
    games_won: number | null;
    games_lost: number | null;
  }
>;

export type ModeConfig = {
  bestOf: number;
  roundsToWin: number;
  modeLabel: string;
  variantLabel: string;
};

export type RoundOutcome = {
  winnerSide: "a" | "b" | "empate";
  winningChoice: Exclude<Choice, null> | null;
  losingChoice: Exclude<Choice, null> | null;
  detailText: string;
  sound: RoundSoundType;
};
