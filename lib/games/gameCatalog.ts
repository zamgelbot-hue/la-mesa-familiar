// 📍 Ruta del archivo: lib/games/gameCatalog.ts

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

type MemoramaVariantSettings = {
  set: "default" | "comida" | "animales" | "deportes" | "gaming" | "fantasia" | "espacio";
  pairs: number;
};

export const GAME_CONFIGS: Record<string, GameConfig> = {
  // 📍 Ruta del archivo: lib/games/gameCatalog.ts

  "loteria-mexicana": {
    maxPlayersOptions: [2, 3, 4, 5, 6, 7, 8],
    variants: [
      {
        key: "clasica_linea",
        label: "Clásica - Línea",
        description: "Gana completando una línea horizontal, vertical o diagonal.",
        available: true,
      },
      {
        key: "clasica_esquinas",
        label: "Clásica - 4 esquinas",
        description: "Gana marcando las cuatro esquinas del tablero.",
        available: true,
      },
      {
        key: "clasica_llena",
        label: "Clásica - Cartón lleno",
        description: "Gana llenando todo tu tablero.",
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

  "piedra-papel-o-tijera": {
    maxPlayersOptions: [2],
    variants: [
      { key: "bo3", label: "Mejor 2 de 3", description: "Gana quien consiga 2 rondas primero.", available: true },
      { key: "bo5", label: "Mejor 3 de 5", description: "Gana quien consiga 3 rondas primero.", available: true },
      { key: "bo7", label: "Mejor 4 de 7", description: "Gana quien consiga 4 rondas primero.", available: true },
      { key: "bot_bo3", label: "Vs Bot", description: "Juega contra la computadora. Recompensa mínima: 1 punto.", available: true },
    ],
    tutorial: [
      "Piedra vence a Tijera",
      "Tijera vence a Papel",
      "Papel vence a Piedra",
      "Elige tu opción cuando inicie la ronda",
      "Gana quien complete la serie primero",
    ],
  },

  memorama: {
    maxPlayersOptions: [2],
    variants: [
      {
        key: "clasico_8",
        label: "Clásico · 8 pares",
        description: "Memorama balanceado con emojis variados.",
        available: true,
      },
      {
        key: "comida_8",
        label: "Comida · 8 pares",
        description: "Encuentra pares de comida como tacos, pizza, fruta y más.",
        available: true,
      },
      {
        key: "animales_8",
        label: "Animales · 8 pares",
        description: "Pares de mascotas y animales divertidos.",
        available: true,
      },
      {
        key: "deportes_8",
        label: "Deportes · 8 pares",
        description: "Ideal para familias competitivas y fans del deporte.",
        available: true,
      },
      {
        key: "gaming_8",
        label: "Gaming · 8 pares",
        description: "Emojis gamer, controles, trofeos y retos.",
        available: true,
      },
      {
        key: "facil_6",
        label: "Fácil · 6 pares",
        description: "Partida rápida con menos cartas.",
        available: true,
      },
      {
        key: "dificil_12",
        label: "Difícil · 12 pares",
        description: "Más cartas, más memoria y más reto.",
        available: true,
      },
      {
        key: "fantasia_8",
        label: "Fantasía · 8 pares 🔒",
        description: "Tema premium preparado para desbloquear en tienda.",
        available: false,
      },
      {
        key: "espacio_8",
        label: "Espacio · 8 pares 🔒",
        description: "Tema premium preparado para desbloquear en tienda.",
        available: false,
      },
    ],
    tutorial: [
      "Cada jugador juega por turnos",
      "En tu turno debes elegir 2 cartas",
      "Si encuentras una pareja, ganas punto y mantienes el turno",
      "Si fallas, las cartas se ocultan y pasa el turno",
      "Si se acaba el tiempo, pierdes el turno",
      "Gana quien encuentre más parejas",
    ],
  },

  gato: {
    maxPlayersOptions: [2],
    variants: [
      { key: "clasico", label: "Clásico 3x3", description: "Gana conectando 3 en línea.", available: true },
      { key: "grande", label: "Grande 5x5", description: "Gana conectando 4 en línea.", available: true },
      { key: "epico", label: "Épico 7x7", description: "Gana conectando 5. Bonus si conectas 7.", available: true },
      { key: "bot_clasico", label: "Vs Bot 3x3", description: "Juega El Gato clásico contra la computadora. Recompensa mínima: 1 punto.", available: true },
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

  "guerra-total": {
    maxPlayersOptions: [2],
    variants: [
      { key: "mar", label: "Mar", description: "Batalla clásica con flotas sobre el océano.", available: true },
      { key: "aire", label: "Aire", description: "Combate estratégico con escuadrones y radar.", available: true },
      { key: "tierra", label: "Tierra", description: "Combate terrestre con unidades y campo de batalla.", available: true },

      { key: "mar_bot", label: "Mar vs Bot", description: "Batalla naval contra la computadora. Recompensa mínima.", available: true },
      { key: "aire_bot", label: "Aire vs Bot", description: "Combate aéreo contra la computadora. Recompensa mínima.", available: true },
      { key: "tierra_bot", label: "Tierra vs Bot", description: "Batalla terrestre contra la computadora. Recompensa mínima.", available: true },
    ],
    tutorial: [
      "Coloca todas tus unidades en tu tablero",
      "Confirma tu formación cuando termines",
      "Ataca el territorio enemigo por turnos",
      "Agua significa que fallaste",
      "Impacto significa que dañaste una unidad",
      "Hundido significa que destruiste una unidad completa",
      "Gana quien destruya todas las unidades enemigas",
    ],
  },

  "personaje-secreto": {
    maxPlayersOptions: [2],
    variants: [
      { key: "videojuegos", label: "Videojuegos", description: "Adivina personajes de videojuegos usando preguntas y pistas.", available: true },
      { key: "peliculas", label: "Películas", description: "Personajes de películas, sagas y cine familiar.", available: true },
      { key: "deportes", label: "Deportes", description: "Atletas, leyendas deportivas y figuras famosas.", available: true },
      { key: "anime", label: "Anime", description: "Personajes de anime y manga.", available: true },
      { key: "musica", label: "Música", description: "Cantantes, bandas y artistas conocidos.", available: true },
      { key: "libre", label: "Libre", description: "Cualquier personaje famoso, ficticio o real.", available: true },
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
      { key: "espanol", label: "Español", description: "Ortografía, gramática y comprensión.", available: true },
      { key: "matematicas", label: "Matemáticas", description: "Operaciones, lógica y cálculo rápido.", available: true },
      { key: "ingles", label: "Inglés", description: "Vocabulario y comprensión básica.", available: true },
      { key: "geografia", label: "Geografía", description: "Países, capitales y lugares del mundo.", available: true },
      { key: "ciencias", label: "Ciencias", description: "Preguntas básicas de ciencia y naturaleza.", available: true },
      { key: "sabelotodo", label: "Sabelotodo", description: "Mezcla de todas las categorías.", available: true },
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

function getMemoramaVariantSettings(variantKey: string): MemoramaVariantSettings {
  const variantMap: Record<string, MemoramaVariantSettings> = {
    clasico_8: { set: "default", pairs: 8 },
    comida_8: { set: "comida", pairs: 8 },
    animales_8: { set: "animales", pairs: 8 },
    deportes_8: { set: "deportes", pairs: 8 },
    gaming_8: { set: "gaming", pairs: 8 },
    facil_6: { set: "default", pairs: 6 },
    dificil_12: { set: "default", pairs: 12 },
    fantasia_8: { set: "fantasia", pairs: 8 },
    espacio_8: { set: "espacio", pairs: 8 },
  };

  return variantMap[variantKey] ?? variantMap.clasico_8;
}

export function buildRoomSettings(
  gameSlug: string,
  variantKey: string,
  maxPlayers: number,
) {
  // 📍 Ruta del archivo: lib/games/gameCatalog.ts

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
      max_players: selectedPlayers,
      min_players: 2,
    };
  }

  if (gameSlug === "memorama") {
    const memoramaVariant = getMemoramaVariantSettings(variantKey);

    return {
      mode: "memory_match",
      memorama_variant: memoramaVariant,
      max_players: 2,
      min_players: 2,
      store_ready: ["fantasia", "espacio"].includes(memoramaVariant.set),
    };
  }

  if (gameSlug === "guerra-total") {
    const isBotVariant = variantKey.endsWith("_bot");
    const cleanVariant = variantKey.replace("_bot", "");

    return {
      mode: "strategic_battle",
      battle_variant: cleanVariant,
      board_size: 8,
      max_players: isBotVariant ? 1 : 2,
      min_players: 1,
      vs_bot: isBotVariant,
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
      espanol: { categoryMode: "espanol", totalRounds: 10, answerTimeMs: 8000, max_players: maxPlayers },
      matematicas: { categoryMode: "matematicas", totalRounds: 10, answerTimeMs: 10000, max_players: maxPlayers },
      ingles: { categoryMode: "ingles", totalRounds: 10, answerTimeMs: 8000, max_players: maxPlayers },
      geografia: { categoryMode: "geografia", totalRounds: 10, answerTimeMs: 8000, max_players: maxPlayers },
      ciencias: { categoryMode: "ciencias", totalRounds: 10, answerTimeMs: 8000, max_players: maxPlayers },
      sabelotodo: { categoryMode: "sabelotodo", totalRounds: 15, answerTimeMs: 6000, max_players: maxPlayers },
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
      clasico: { board_size: 3, win_length: 3, bonus_win_length: null },
      grande: { board_size: 5, win_length: 4, bonus_win_length: null },
      epico: { board_size: 7, win_length: 5, bonus_win_length: 7 },
      bot_clasico: { board_size: 3, win_length: 3, bonus_win_length: null },
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
    case "guerra-total":
      return "💥";
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
      return "🧠";
    default:
      return "🎮";
  }
}
