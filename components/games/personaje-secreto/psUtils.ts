// 📍 components/games/personaje-secreto/psUtils.ts

import type { PsGuessResult } from "./psTypes";

export function normalizePsText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string) {
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);

  for (let j = 0; j <= a.length; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i += 1) {
    for (let j = 1; j <= a.length; j += 1) {
      matrix[i][j] =
        b.charAt(i - 1) === a.charAt(j - 1)
          ? matrix[i - 1][j - 1]
          : Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1,
            );
    }
  }

  return matrix[b.length][a.length];
}

export function getPsGuessResult(guess: string, secret: string): PsGuessResult {
  const cleanGuess = normalizePsText(guess);
  const cleanSecret = normalizePsText(secret);

  if (!cleanGuess || !cleanSecret) return "wrong";

  if (cleanGuess === cleanSecret) return "correct";

  if (cleanSecret.includes(cleanGuess) && cleanGuess.length >= 4) {
    return "needs_confirmation";
  }

  if (cleanGuess.includes(cleanSecret) && cleanSecret.length >= 4) {
    return "needs_confirmation";
  }

  const distance = levenshtein(cleanGuess, cleanSecret);
  const maxLength = Math.max(cleanGuess.length, cleanSecret.length);
  const similarity = 1 - distance / maxLength;

  if (similarity >= 0.82) return "needs_confirmation";

  return "wrong";
}

export function createInitialPsGameState() {
  return {
    phase: "picking" as const,
    winnerKey: null,
    winnerName: null,
    currentTurnKey: null,
    currentTurnName: null,
    turnNumber: 0,
    secrets: {},
    questions: [],
    guesses: [],
  };
}

export function getPsPlayerKey(player: {
  user_id: string | null;
  player_name: string;
}) {
  return player.user_id ?? `guest:${player.player_name}`;
}

export function getRandomFirstTurn<T>(players: T[]) {
  if (players.length === 0) return null;
  return players[Math.floor(Math.random() * players.length)];
}

export function getPsSuggestedQuestions(category?: string | null) {
  const common = [
    "¿Tu personaje es humano?",
    "¿Tu personaje es hombre?",
    "¿Tu personaje es mujer?",
    "¿Tu personaje es protagonista?",
    "¿Tu personaje es villano?",
    "¿Tu personaje tiene poderes?",
    "¿Tu personaje usa algún objeto especial?",
  ];

  const byCategory: Record<string, string[]> = {
    videojuegos: [
      "¿Tu personaje es de Nintendo?",
      "¿Tu personaje usa armas?",
      "¿Tu personaje usa gorra?",
      "¿Tu personaje es rápido?",
      "¿Tu personaje es mascota de una franquicia?",
      "¿Tu personaje aparece en juegos clásicos?",
    ],
    peliculas: [
      "¿Tu personaje aparece en una película animada?",
      "¿Tu personaje aparece en una saga?",
      "¿Tu personaje tiene superpoderes?",
      "¿Tu personaje es de Disney?",
      "¿Tu personaje es villano?",
    ],
    deportes: [
      "¿Tu personaje es futbolista?",
      "¿Tu personaje sigue activo?",
      "¿Tu personaje ha ganado campeonatos?",
      "¿Tu personaje es considerado leyenda?",
    ],
    anime: [
      "¿Tu personaje pelea?",
      "¿Tu personaje tiene transformación?",
      "¿Tu personaje tiene poderes especiales?",
      "¿Tu personaje es protagonista?",
    ],
    musica: [
      "¿Tu personaje es cantante?",
      "¿Tu personaje canta en español?",
      "¿Tu personaje es solista?",
      "¿Tu personaje pertenece a una banda?",
    ],
    libre: [
      "¿Tu personaje es real?",
      "¿Tu personaje es ficticio?",
      "¿Tu personaje es famoso mundialmente?",
      "¿Tu personaje aparece en televisión?",
    ],
  };

  return [...common, ...(byCategory[category ?? "libre"] ?? byCategory.libre)];
}

export function getPsAnswerLabel(answer: "si" | "no" | "probablemente") {
  if (answer === "si") return "Sí";
  if (answer === "no") return "No";
  return "Probablemente";
}

export function getPsAnswerEmoji(answer: "si" | "no" | "probablemente") {
  if (answer === "si") return "✅";
  if (answer === "no") return "❌";
  return "🤔";
}
