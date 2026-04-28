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
      "¿Tu personaje aparece en videojuegos?",
      "¿Tu personaje es de Nintendo?",
      "¿Tu personaje usa armas?",
      "¿Tu personaje usa gorra?",
      "¿Tu personaje es de un juego clásico?",
      "¿Tu personaje es rápido?",
      "¿Tu personaje es mascota de una franquicia?",
    ],
    peliculas: [
      "¿Tu personaje aparece en una película animada?",
      "¿Tu personaje aparece en una saga?",
      "¿Tu personaje tiene superpoderes?",
      "¿Tu personaje es de Disney?",
      "¿Tu personaje usa traje especial?",
      "¿Tu personaje es famoso por una frase?",
    ],
    deportes: [
      "¿Tu personaje es futbolista?",
      "¿Tu personaje sigue activo?",
      "¿Tu personaje ha ganado campeonatos?",
      "¿Tu personaje es mexicano?",
      "¿Tu personaje es considerado leyenda?",
      "¿Tu personaje juega en equipo?",
    ],
    anime: [
      "¿Tu personaje es de anime?",
      "¿Tu personaje pelea?",
      "¿Tu personaje tiene transformación?",
      "¿Tu personaje tiene poderes especiales?",
      "¿Tu personaje es protagonista?",
      "¿Tu personaje pertenece a una serie muy famosa?",
    ],
    musica: [
      "¿Tu personaje es cantante?",
      "¿Tu personaje canta en español?",
      "¿Tu personaje es solista?",
      "¿Tu personaje pertenece a una banda?",
      "¿Tu personaje sigue activo?",
      "¿Tu personaje es famoso mundialmente?",
    ],
    libre: [
      "¿Tu personaje es real?",
      "¿Tu personaje es ficticio?",
      "¿Tu personaje es famoso mundialmente?",
      "¿Tu personaje aparece en televisión?",
      "¿Tu personaje es de internet?",
      "¿Tu personaje es de una franquicia conocida?",
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
