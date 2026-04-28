// 📍 components/games/personaje-secreto/psTypes.ts

export type PsPhase = "picking" | "playing" | "finished";

export type PsPlayerSecret = {
  playerKey: string;
  playerName: string;
  secret: string;
  pickedAt: string;
};

export type PsGuess = {
  id: string;
  playerKey: string;
  playerName: string;
  targetKey: string;
  guess: string;
  result: "correct" | "wrong" | "needs_confirmation";
  createdAt: string;
};

export type PsGameState = {
  phase: PsPhase;
  winnerKey: string | null;
  winnerName: string | null;
  secrets: Record<string, PsPlayerSecret>;
  guesses: PsGuess[];
};
