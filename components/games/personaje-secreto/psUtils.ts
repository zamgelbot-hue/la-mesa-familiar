// 📍 components/games/personaje-secreto/psUtils.ts

export function normalizePsText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function isClosePsGuess(guess: string, secret: string) {
  const cleanGuess = normalizePsText(guess);
  const cleanSecret = normalizePsText(secret);

  if (!cleanGuess || !cleanSecret) return false;

  if (cleanGuess === cleanSecret) return true;

  if (cleanSecret.includes(cleanGuess) && cleanGuess.length >= 4) return true;

  if (cleanGuess.includes(cleanSecret) && cleanSecret.length >= 4) return true;

  return false;
}

export function createInitialPsGameState() {
  return {
    phase: "picking" as const,
    winnerKey: null,
    winnerName: null,
    secrets: {},
    guesses: [],
  };
}

export function getPsPlayerKey(player: {
  user_id: string | null;
  player_name: string;
}) {
  return player.user_id ?? `guest:${player.player_name}`;
}
