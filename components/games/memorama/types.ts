// 📍 Ruta del archivo: components/games/memorama/types.ts

export type MemoramaPhase = "waiting" | "playing" | "finished";

export type MemoramaLastResult = "match" | "miss" | "timeout" | null;

export type MemoramaCard = {
  id: string;
  pairId: string;
  emoji: string;
};

export type MemoramaPlayerScore = {
  playerKey: string;
  playerName: string;
  pairs: number;
};

export type MemoramaSet =
  | "default"
  | "comida"
  | "animales"
  | "deportes"
  | "gaming";

export type MemoramaVariant = {
  set: MemoramaSet;
  pairs: number;
};

export type MemoramaGameState = {
  phase: MemoramaPhase;
  variant: MemoramaVariant;
  cards: MemoramaCard[];
  

  selectedCardIds: string[];
  matchedCardIds: string[];
  matchedPairOwners: Record<string, string>;

  currentTurnKey: string | null;
  currentTurnName: string | null;

  scores: Record<string, MemoramaPlayerScore>;

  isResolving: boolean;
  lastResult: MemoramaLastResult;

  turnStartedAt: string | null;
  turnEndsAt: string | null;

  winnerKey: string | null;
  winnerName: string | null;

  createdAt: string;
  updatedAt: string;
};
