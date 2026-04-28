// 📍 lib/games/gameCatalog.ts

export type VariantOption = {
  key: string;
  label: string;
  description: string;
  available: boolean;
};

export type GameConfig = {
  maxPlayersOptions: number[];
  variants: VariantOption[];
  tutorial: string[];
};

export const GAME_CONFIGS: Record<string, GameConfig> = {
  "loteria-mexicana": {
    maxPlayersOptions: [2, 4, 6],
    variants: [
      {
        key: "clasica",
        label: "Clásica",
        description: "La versión tradicional de siempre.",
        available: true,
      },
      {
        key: "familia-palomares",
        label: "Familia Palomares",
        description: "Edición especial próximamente.",
        available: false,
      },
      {
        key: "comidas-mexicanas",
        label: "Comidas Mexicanas",
        description: "Nueva variante próximamente.",
        available: false,
      },
    ],
    tutorial: [
      "Escucha las cartas que se van cantando",
      "Marca tu tablero si tienes la carta",
      "No puedes marcar cartas incorrectas",
      "Completa tu tablero para ganar",
    ],
  },

  "piedra-papel-o-tijera": {
    maxPlayersOptions: [2],
    variants: [
      {
        key: "bo3",
        label: "Mejor 2 de 3",
        description: "Gana quien consiga 2 rondas primero.",
        available: true,
      },
      {
        key: "bo5",
        label: "Mejor 3 de 5",
        description: "Gana quien consiga 3 rondas primero.",
        available: true,
      },
      {
        key: "bo7",
        label: "Mejor 4 de 7",
        description: "Gana quien consiga 4 rondas primero.",
        available: true,
      },
      {
        key: "bot_bo3",
        label: "Vs Bot",
        description: "Juega contra la computadora. Recompensa mínima: 1 punto.",
        available: true,
      },
    ],
    tutorial: [
      "Piedra vence a Tijera",
      "Tijera vence a Papel",
      "Papel vence a Piedra",
      "Elige tu opción cuando inicie la ronda",
      "Gana quien complete la serie primero",
    ],
  },

  gato: {
    maxPlayersOptions: [2],
    variants: [
      {
        key: "clasico",
        label: "Clásico 3x3",
        description: "Gana conectando 3 en línea.",
        available: true,
      },
      {
        key: "grande",
        label: "Grande 5x5",
        description: "Gana conectando 5 en línea.",
        available: true,
      },
      {
        key: "epico",
        label: "Épico 7x7",
        description: "Gana conectando 5. Bonus si conectas 7.",
        available: true,
      },
      {
        key: "bot_clasico",
        label: "Vs Bot 3x3",
        description: "Juega El Gato clásico contra la computadora. Recompensa mínima: 1 punto.",
        available: true,
      },
    ],
    tutorial: [
      "El host juega con X",
      "El segundo jugador juega con O",
      "Jueguen por turnos",
      "No puedes tocar una casilla ocupada",
      "Gana conectando la línea requerida",
      "En Épico 7x7 puedes ganar bonus conectando 7",
    ],
  },

    "personaje-secreto": {
    maxPlayersOptions: [2],
    variants: [
      {
        key: "videojuegos",
        label: "Videojuegos",
        description: "Adivina personajes de videojuegos usando preguntas y pistas.",
        available: true,
      },
      {
        key: "peliculas",
        label: "Películas",
        description: "Personajes de películas, sagas y cine familiar.",
        available: true,
      },
      {
        key: "deportes",
        label: "Deportes",
        description: "Atletas, leyendas deportivas y figuras famosas.",
        available: true,
      },
      {
        key: "anime",
        label: "Anime",
        description: "Personajes de anime y manga.",
        available: true,
      },
      {
        key: "musica",
        label: "Música",
        description: "Cantantes, bandas y artistas conocidos.",
        available: true,
      },
      {
        key: "libre",
        label: "Libre",
        description: "Cualquier personaje famoso, ficticio o real.",
        available: true,
      },
    ],
    tutorial: [
      "Cada jugador escribe un personaje secreto",
      "El personaje queda oculto para el rival",
      "Usa el chat para hacer preguntas y dar pistas",
      "Cuando creas saber la respuesta, usa el botón Adivinar",
      "Gana quien descubra primero el personaje del rival",
    ],
  },

  pregunta: {
    maxPlayersOptions: [2, 4, 6, 8],
    variants: [
      {
        key: "espanol",
        label: "Español",
        description: "Ortografía, gramática y comprensión.",
        available: true,
      },
      {
        key: "matematicas",
        label: "Matemáticas",
        description: "Operaciones, lógica y cálculo rápido.",
        available: true,
      },
      {
        key: "ingles",
        label: "Inglés",
        description: "Vocabulario y comprensión básica.",
        available: true,
      },
      {
        key: "geografia",
        label: "Geografía",
        description: "Países, capitales y lugares del mundo.",
        available: true,
      },
      {
        key: "ciencias",
        label: "Ciencias",
        description: "Preguntas básicas de ciencia y naturaleza.",
        available: true,
      },
      {
        key: "sabelotodo",
        label: "Sabelotodo",
        description: "Mezcla de todas las categorías.",
        available: true,
      },
    ],
    tutorial: [
      "Lee la pregunta cuidadosamente",
      "Espera a que aparezcan las opciones",
      "Selecciona tu respuesta antes de que termine el tiempo",
      "Ganas puntos por respuestas correctas y rapidez",
      "El jugador con más puntos gana",
    ],
  },
};

export function getDefaultVariantForGame(gameSlug: string) {
  return GAME_CONFIGS[gameSlug]?.variants[0]?.key ?? "default";
}

export function getDefaultMaxPlayersForGame(gameSlug: string) {
  return GAME_CONFIGS[gameSlug]?.maxPlayersOptions[0] ?? 2;
}

export function getAvailableVariantsForGame(gameSlug: string) {
  return (GAME_CONFIGS[gameSlug]?.variants ?? []).filter(
    (variant) => variant.available,
  );
}

export function getVariantLabel(gameSlug?: string | null, variantKey?: string | null) {
  if (!gameSlug || !variantKey) return "Sin variante";

  const variant = GAME_CONFIGS[gameSlug]?.variants.find(
    (item) => item.key === variantKey,
  );

  return variant?.label ?? variantKey;
}

export function buildRoomSettings(
  gameSlug: string,
  variantKey: string,
  maxPlayers: number,
) {
  if (gameSlug === "loteria-mexicana") {
    return {
      mode: "standard",
      deck_variant: variantKey,
      board_size: 4,
      win_condition: "tabla",
      max_players: maxPlayers,
    };
  }

  if (gameSlug === "pregunta") {
    const variantMap: Record<
      string,
      {
        categoryMode: string;
        totalRounds: number;
        answerTimeMs: number;
        max_players: number;
      }
    > = {
      espanol: {
        categoryMode: "espanol",
        totalRounds: 10,
        answerTimeMs: 8000,
        max_players: maxPlayers,
      },
      matematicas: {
        categoryMode: "matematicas",
        totalRounds: 10,
        answerTimeMs: 10000,
        max_players: maxPlayers,
      },
      ingles: {
        categoryMode: "ingles",
        totalRounds: 10,
        answerTimeMs: 8000,
        max_players: maxPlayers,
      },
      geografia: {
        categoryMode: "geografia",
        totalRounds: 10,
        answerTimeMs: 8000,
        max_players: maxPlayers,
      },
      ciencias: {
        categoryMode: "ciencias",
        totalRounds: 10,
        answerTimeMs: 8000,
        max_players: maxPlayers,
      },
      sabelotodo: {
        categoryMode: "sabelotodo",
        totalRounds: 15,
        answerTimeMs: 6000,
        max_players: maxPlayers,
      },
    };

    const selected = variantMap[variantKey] ?? variantMap.sabelotodo;

    return {
      mode: "quiz",
      categoryMode: selected.categoryMode,
      totalRounds: selected.totalRounds,
      answerTimeMs: selected.answerTimeMs,
      max_players: selected.max_players,
    };
  }

    if (gameSlug === "personaje-secreto") {
    return {
      mode: "secret_character",
      category: variantKey,
      max_players: 2,
      min_players: 2,
      allow_free_chat: true,
      confirmation_enabled: true,
      fuzzy_match_enabled: true,
    };
  }

  if (gameSlug === "piedra-papel-o-tijera") {
    const variantMap: Record<string, { best_of: number; rounds_to_win: number }> = {
      bo3: { best_of: 3, rounds_to_win: 2 },
      bo5: { best_of: 5, rounds_to_win: 3 },
      bo7: { best_of: 7, rounds_to_win: 4 },
      bot_bo3: { best_of: 3, rounds_to_win: 2 },
    };

    const selected = variantMap[variantKey] ?? variantMap.bo3;

    return {
  mode: "match_series",
  best_of: selected.best_of,
  rounds_to_win: selected.rounds_to_win,
  max_players: variantKey === "bot_bo3" ? 1 : 2,
  vs_bot: variantKey === "bot_bo3",
};
  }

  if (gameSlug === "gato") {
    const variantMap: Record<
      string,
      {
        board_size: number;
        win_length: number;
        bonus_win_length: number | null;
      }
    > = {
      clasico: {
        board_size: 3,
        win_length: 3,
        bonus_win_length: null,
      },
      grande: {
        board_size: 5,
        win_length: 5,
        bonus_win_length: null,
      },
      epico: {
        board_size: 7,
        win_length: 5,
        bonus_win_length: 7,
      },
      bot_clasico: {
        board_size: 3,
        win_length: 3,
        bonus_win_length: null,
      },
    };

    const selected = variantMap[variantKey] ?? variantMap.clasico;

    return {
  mode: "classic_tictactoe",
  board_size: selected.board_size,
  win_length: selected.win_length,
  bonus_win_length: selected.bonus_win_length,
  max_players: variantKey === "bot_clasico" ? 1 : 2,
  vs_bot: variantKey === "bot_clasico",
};
  }

  return {
    max_players: maxPlayers,
  };
}

export function getGameIcon(slug: string) {
  switch (slug) {
    case "piedra-papel-o-tijera":
      return "✂️";
    case "loteria-mexicana":
      return "🇲🇽";
    case "pregunta":
      return "❓";
    case "gato":
      return "⭕";
    case "personaje-secreto":
      return "🕵️";
    case "domino":
      return "🁫";
    case "trivia-familiar":
      return "🧠";
    case "pictionary":
      return "🎨";
    case "bingo":
      return "🎱";
    case "memorama":
      return "🃏";
    default:
      return "🎮";
  }
}
