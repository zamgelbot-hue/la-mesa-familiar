// 📍 components/games/personaje-secreto/psTypes.ts

export type PsPhase = "picking" | "playing" | "finished";

export type PsAnswer = "si" | "no" | "probablemente";

export type PsGuessResult = "correct" | "wrong" | "needs_confirmation";

export type PsPlayerSecret = {
  playerKey: string;
  playerName: string;
  secret: string;
  pickedAt: string;
};

export type PsQuestion = {
  id: string;
  fromKey: string;
  fromName: string;
  toKey: string;
  toName: string;
  question: string;
  answer: PsAnswer | null;
  answeredAt: string | null;
  createdAt: string;
};

export type PsGuess = {
  id: string;
  playerKey: string;
  playerName: string;
  targetKey: string;
  targetName: string;
  guess: string;
  result: PsGuessResult;
  createdAt: string;
  resolvedAt: string | null;
};

export type PsGameState = {
  phase: PsPhase;
  winnerKey: string | null;
  winnerName: string | null;
  currentTurnKey: string | null;
  currentTurnName: string | null;
  turnNumber: number;
  secrets: Record<string, PsPlayerSecret>;
  questions: PsQuestion[];
  guesses: PsGuess[];
};
