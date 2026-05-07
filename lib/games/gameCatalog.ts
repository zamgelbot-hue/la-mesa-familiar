// 📍 Ruta del archivo: lib/games/gameCatalog.ts

export type GameVariant = {
  key: string;
  label: string;
  description: string;
  available?: boolean;
};

export type GameCatalogEntry = {
  maxPlayersOptions: number[];
  variants: GameVariant[];
  tutorial: string[];
};

export type GameCatalog = Record<string, GameCatalogEntry>;

export const GAME_CATALOG: GameCatalog = {
  ppt: {
    maxPlayersOptions: [2],
    variants: [
      {
        key: "best_of_3",
        label: "Mejor 2 de 3",
        description: "Gana quien consiga 2 rondas primero.",
        available: true,
      },
      {
        key: "best_of_5",
        label: "Mejor 3 de 5",
        description: "Gana quien consiga 3 rondas primero.",
        available: true,
      },
      {
        key: "best_of_7",
        label: "Mejor 4 de 7",
        description: "Gana quien consiga 4 rondas primero.",
        available: true,
      },
      {
        key: "vs_bot",
        label: "Vs Bot",
        description: "Juega contra la computadora. Recompensa mínima: 1 punto.",
        available: true,
      },
    ],
    tutorial: [
      "Elige piedra, papel o tijera",
      "Todos revelan al mismo tiempo",
      "Gana quien consiga más rondas",
    ],
  },

  "loteria-mexicana": {
    maxPlayersOptions: [2, 3, 4, 5, 6, 7, 8],
    variants: [
      {
        key: "clasica_linea",
        label: "Clásica - Línea",
        description:
          "Gana completando una línea horizontal, vertical o diagonal.",
        available: true,
      },
      {
        key: "clasica_esquinas",
        label: "Clásica - 4 esquinas",
        description:
          "Gana marcando las cuatro esquinas del tablero.",
        available: true,
      },
      {
        key: "clasica_llena",
        label: "Clásica - Cartón lleno",
        description:
          "Gana llenando todo tu tablero.",
        available: true,
      },
      {
        key: "familia_palomares",
        label: "Familia Palomares",
        description: "Nueva baraja familiar personalizada.",
        available: false,
      },
      {
        key: "comidas_mexicanas",
        label: "Comidas Mexicanas",
        description: "Baraja temática de comida mexicana.",
        available: false,
      },
    ],
    tutorial: [
      "Escucha la carta cantada",
      "Marca las cartas que aparezcan en tu tablero",
      "Solo tienes pocos turnos para marcar una carta llamada",
      "Reclama Lotería cuando completes el modo de victoria",
      "Gana quien complete primero el objetivo",
    ],
  },

  "pregunta-pregunta": {
  maxPlayersOptions: [2, 3, 4, 5, 6],
  variants: [
    {
      key: "espanol",
      label: "Español",
      description:
        "Ortografía, gramática y comprensión.",
      available: true,
    },
    {
      key: "matematicas",
      label: "Matemáticas",
      description:
        "Operaciones, lógica y problemas rápidos.",
      available: true,
    },
    {
      key: "ingles",
      label: "Inglés",
      description:
        "Vocabulario y traducciones.",
      available: true,
    },
    {
      key: "geografia",
      label: "Geografía",
      description:
        "Países, capitales y mapas.",
      available: true,
    },
    {
      key: "ciencias",
      label: "Ciencias",
      description:
        "Naturaleza, química y física básica.",
      available: true,
    },
    {
      key: "sabelotodo",
      label: "Sabelotodo",
      description:
        "Preguntas mezcladas de todas las categorías.",
      available: true,
    },
  ],
  tutorial: [
    "Lee rápidamente la pregunta",
    "Todos responden al mismo tiempo",
    "Las respuestas permanecen ocultas",
    "El tiempo afecta los puntos obtenidos",
    "Las respuestas correctas dan bonus",
    "Gana quien consiga más puntos al final",
  ],
},

  gato: {
    maxPlayersOptions: [2],
    variants: [
      {
        key: "3x3",
        label: "3x3",
        description: "El clásico gato.",
        available: true,
      },
      {
        key: "5x5",
        label: "5x5",
        description: "Conecta 4 para ganar.",
        available: true,
      },
      {
        key: "7x7",
        label: "7x7",
        description: "Conecta 5 para ganar.",
        available: true,
      },
      {
        key: "vs_bot",
        label: "Vs Bot",
        description: "Juega contra la computadora.",
        available: true,
      },
    ],
    tutorial: [
      "Haz una línea antes que tu rival",
      "Horizontal, vertical o diagonal",
      "Bloquea movimientos enemigos",
    ],
  },

  "personaje-secreto": {
    maxPlayersOptions: [2, 3, 4],
    variants: [
      {
        key: "clasico",
        label: "Clásico",
        description: "Descubre el personaje secreto.",
        available: true,
      },
    ],
    tutorial: [
      "Haz preguntas estratégicas",
      "Descarta personajes",
      "Adivina antes que los demás",
    ],
  },

  "guerra-total": {
    maxPlayersOptions: [2],
    variants: [
      {
        key: "mar",
        label: "Mar",
        description:
          "Batalla clásica con flotas sobre el océano.",
        available: true,
      },
      {
        key: "aire",
        label: "Aire",
        description:
          "Combate estratégico con escuadrones y radar.",
        available: true,
      },
      {
        key: "tierra",
        label: "Tierra",
        description:
          "Combate terrestre con unidades y campo de batalla.",
        available: true,
      },
      {
        key: "mar_bot",
        label: "Mar vs Bot",
        description:
          "Batalla naval contra la computadora. Recompensa mínima.",
        available: true,
      },
      {
        key: "aire_bot",
        label: "Aire vs Bot",
        description:
          "Combate aéreo contra la computadora. Recompensa mínima.",
        available: true,
      },
      {
        key: "tierra_bot",
        label: "Tierra vs Bot",
        description:
          "Batalla terrestre contra la computadora. Recompensa mínima.",
        available: true,
      },
    ],
    tutorial: [
      "Coloca todas tus unidades",
      "Confirma tu formación",
      "Ataca por turnos",
      "Destruye todas las unidades enemigas",
    ],
  },

  memorama: {
    maxPlayersOptions: [2, 3, 4],
    variants: [
      {
        key: "8_pairs",
        label: "8 pares",
        description: "Modo rápido.",
        available: true,
      },
      {
        key: "12_pairs",
        label: "12 pares",
        description: "Modo normal.",
        available: true,
      },
      {
        key: "18_pairs",
        label: "18 pares",
        description: "Modo avanzado.",
        available: true,
      },
    ],
    tutorial: [
      "Encuentra pares iguales",
      "Memoriza posiciones",
      "Gana quien consiga más pares",
    ],
  },

  "secuencia-oculta": {
    maxPlayersOptions: [2, 3, 4],
    variants: [
      {
        key: "3x3",
        label: "Fácil · 3x3",
        description: "Encuentra la secuencia del 1 al 9.",
        available: true,
      },
      {
        key: "4x4",
        label: "Medio · 4x4",
        description: "Encuentra la secuencia del 1 al 16.",
        available: true,
      },
      {
        key: "5x5",
        label: "Difícil · 5x5",
        description: "Encuentra la secuencia del 1 al 25.",
        available: true,
      },
    ],
    tutorial: [
      "Los números están ocultos y revueltos",
      "Cada jugador juega por turnos",
      "Debes encontrar los números en orden",
      "Si fallas, todo vuelve a ocultarse",
      "Memoriza posiciones",
      "Gana quien complete toda la secuencia",
    ],
  },
};

export function buildRoomSettings(
  gameSlug: string,
  variantKey: string,
  maxPlayers: number,
) {
  if (gameSlug === "loteria-mexicana") {
    const winCondition =
      variantKey === "clasica_esquinas"
        ? "corners"
        : variantKey === "clasica_llena"
          ? "full_card"
          : "line";

    return {
      mode: "loteria",
      deck_slug: "tradicional",
      win_condition: winCondition,
      board_size: 4,
      max_players: maxPlayers,
      min_players: 2,
    };
  }

  if (gameSlug === "guerra-total") {
    const isBotVariant = variantKey.endsWith("_bot");
    const cleanVariant = variantKey.replace("_bot", "");

    return {
      mode: "strategic_battle",
      battle_variant: cleanVariant,
      board_size: 8,
      max_players: 2,
      min_players: 1,
      vs_bot: isBotVariant,
    };
  }

  if (gameSlug === "secuencia-oculta") {
    const cleanVariant =
      variantKey === "4x4" || variantKey === "5x5"
        ? variantKey
        : "3x3";

    const boardSize =
      cleanVariant === "5x5"
        ? 5
        : cleanVariant === "4x4"
          ? 4
          : 3;

    return {
      mode: "memory_sequence",
      board_size: boardSize,
      max_number: boardSize * boardSize,
      max_players: maxPlayers,
      min_players: 2,
    };
  }

  return {
    mode: "default",
    variant: variantKey,
    max_players: maxPlayers,
    min_players: 2,
  };
}
export const GAME_CONFIGS = GAME_CATALOG;

export function getDefaultVariantForGame(
  gameSlug: string,
): string {
  return (
    GAME_CATALOG[gameSlug]?.variants.find(
      (variant) => variant.available !== false,
    )?.key ??
    GAME_CATALOG[gameSlug]?.variants[0]?.key ??
    "default"
  );
}

export function getDefaultMaxPlayersForGame(
  gameSlug: string,
): number {
  return GAME_CATALOG[gameSlug]?.maxPlayersOptions[0] ?? 2;
}

export function getAvailableVariantsForGame(
  gameSlug: string,
): GameVariant[] {
  return (
    GAME_CATALOG[gameSlug]?.variants.filter(
      (variant) => variant.available !== false,
    ) ?? []
  );
}

export function getVariantLabel(
  gameSlug: string,
  variantKey?: string | null,
): string {
  if (!variantKey) return "Clásico";

  return (
    GAME_CATALOG[gameSlug]?.variants.find(
      (variant) => variant.key === variantKey,
    )?.label ?? variantKey
  );
}

export function getGameIcon(
  gameSlug: string,
): string {
  const icons: Record<string, string> = {
    ppt: "✊",
    "loteria-mexicana": "🎴",
    "pregunta-pregunta": "❓",
    gato: "⭕",
    "personaje-secreto": "🕵️",
    "guerra-total": "💥",
    memorama: "🧠",
    "secuencia-oculta": "🔢",
  };

  return icons[gameSlug] ?? "🎲";
}