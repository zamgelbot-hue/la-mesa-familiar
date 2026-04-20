export type LoteriaCardData = {
  id: number;
  key: string;
  name: string;
  image: string;
  callout?: string | null;
};

export type LoteriaDeckDefinition = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  theme?: string | null;
  cards: LoteriaCardData[];
};

export type LoteriaMatchStatus = "waiting" | "playing" | "finished";

export type LoteriaWinningPattern =
  | "row"
  | "column"
  | "diagonal_main"
  | "diagonal_anti";

export type LoteriaCardVisualState =
  | "idle"
  | "just_called"
  | "markable"
  | "marked"
  | "expired"
  | "winning";

export type LoteriaBoardCell = {
  card_key: string;
};

export type LoteriaBoard = LoteriaBoardCell[];

export type LoteriaMatchRow = {
  id: string;
  room_code: string;
  deck_slug: string;
  status: LoteriaMatchStatus;
  draw_order: string[];
  called_card_keys: string[];
  current_card_key: string | null;
  winner_user_id: string | null;
  winner_player_name: string | null;
  winning_pattern: LoteriaWinningPattern | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
};

export type LoteriaMatchPlayerRow = {
  id: string;
  match_id: string;
  room_code: string;
  user_id: string | null;
  player_name: string;
  board_card_keys: string[];
  marked_card_keys: string[];
  has_claimed: boolean;
  is_rematch_ready: boolean;
  created_at: string;
  updated_at: string;
};

export type LoteriaPlayerState = {
  id: string;
  match_id: string;
  room_code: string;
  user_id: string | null;
  player_name: string;
  board_card_keys: string[];
  marked_card_keys: string[];
  has_claimed: boolean;
  is_rematch_ready: boolean;
};

export type LoteriaResolvedCard = LoteriaCardData & {
  isMarked?: boolean;
  isCalled?: boolean;
  isWinningCard?: boolean;
};

export type LoteriaValidationResult = {
  isWinner: boolean;
  pattern: LoteriaWinningPattern | null;
  winningCardKeys: string[];
};

export type LoteriaCreateMatchPayload = {
  roomCode: string;
  deckSlug: string;
  players: Array<{
    user_id: string | null;
    player_name: string;
  }>;
};

export type LoteriaGameProps = {
  roomCode: string;
};
