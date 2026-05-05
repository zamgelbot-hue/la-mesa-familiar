// 📍 Ruta del archivo: components/games/memorama/types.ts

export type MemoramaPhase = "waiting" | "playing" | "finished";

export type MemoramaCard = {
  id: string;
  pairId: string;
  emoji: string;
  isMatched: boolean;
};

export type MemoramaPlayerScore = {
  playerKey: string;
  playerName: string;
  pairs: number;
};

export type MemoramaGameState = {
  phase: MemoramaPhase;
  cards: MemoramaCard[];
  flippedCardIds: string[];
  matchedCardIds: string[];
  matchedPairOwners: Record<string, string>;
  currentTurnKey: string | null;
  currentTurnName: string | null;
  scores: Record<string, MemoramaPlayerScore>;
  lastMatch: boolean | null;
  winnerKey: string | null;
  winnerName: string | null;
  createdAt: string;
  updatedAt: string;
};
