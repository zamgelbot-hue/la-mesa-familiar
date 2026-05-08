// 📍 Ruta del archivo: components/create-room/createRoomUtils.ts

import type { Game } from "@/lib/home/homeTypes";

export type CreateRoomGroupKey =
  | "rapidos"
  | "familiares"
  | "estrategicos";

export type CreateRoomGroup = {
  key: CreateRoomGroupKey;
  title: string;
  subtitle: string;
  icon: string;
  slugs: string[];
};

export type GameParticles =
  | "embers"
  | "stars"
  | "cards"
  | "waves"
  | "sparks";

export type GameVisualInfo = {
  emoji: string;
  difficulty: string;
  duration: string;
  badge: string;
  gradient: string;

  banner: string;
  ambientGradient: string;
  accentColor: string;
  glowColor: string;
  particles: GameParticles;
  previewDescription: string;
};

export const CREATE_ROOM_GROUPS: CreateRoomGroup[] = [
  {
    key: "rapidos",
    title: "Juegos rápidos",
    subtitle:
      "Partidas cortas, fáciles de explicar y perfectas para empezar.",
    icon: "⚡",
    slugs: [
      "ppt",
      "piedra-papel-o-tijera",
      "gato",
      "secuencia-oculta",
    ],
  },
  {
    key: "familiares",
    title: "Juegos familiares",
    subtitle:
      "Ideales para jugar con varios, reírse y convivir.",
    icon: "🎉",
    slugs: [
      "loteria-mexicana",
      "memorama",
      "pregunta-pregunta",
      "domino",
    ],
  },
  {
    key: "estrategicos",
    title: "Estrategia y deducción",
    subtitle:
      "Más tensión, turnos y decisiones importantes.",
    icon: "🧠",
    slugs: [
      "guerra-total",
      "personaje-secreto",
    ],
  },
];

export const GAME_VISUAL_INFO: Record<string, GameVisualInfo> = {
  ppt: {
    emoji: "✊",
    difficulty: "Fácil",
    duration: "2 min",
    badge: "Clásico",
    gradient:
      "from-orange-500/20 via-orange-500/5 to-transparent",

    banner: "/games/banners/ppt.png",
    ambientGradient:
      "from-orange-500/30 via-orange-500/10 to-transparent",
    accentColor: "#f97316",
    glowColor: "rgba(249,115,22,0.45)",
    particles: "embers",
    previewDescription:
      "Duelo clásico en tiempo real para partidas rápidas.",
  },

  "piedra-papel-o-tijera": {
    emoji: "✊",
    difficulty: "Fácil",
    duration: "2 min",
    badge: "Clásico",
    gradient:
      "from-orange-500/20 via-orange-500/5 to-transparent",

    banner: "/games/banners/ppt.png",
    ambientGradient:
      "from-orange-500/30 via-orange-500/10 to-transparent",
    accentColor: "#f97316",
    glowColor: "rgba(249,115,22,0.45)",
    particles: "embers",
    previewDescription:
      "Duelo clásico en tiempo real para partidas rápidas.",
  },

  gato: {
    emoji: "⭕",
    difficulty: "Fácil",
    duration: "3 min",
    badge: "Rápido",
    gradient:
      "from-pink-500/20 via-pink-500/5 to-transparent",

    banner: "/games/banners/gato.png",
    ambientGradient:
      "from-pink-500/30 via-fuchsia-500/10 to-transparent",
    accentColor: "#ec4899",
    glowColor: "rgba(236,72,153,0.45)",
    particles: "sparks",
    previewDescription:
      "Forma una línea de 3 con X y O antes que tu rival.",
  },

  "secuencia-oculta": {
    emoji: "🔢",
    difficulty: "Media",
    duration: "5 min",
    badge: "Memoria",
    gradient:
      "from-cyan-500/20 via-cyan-500/5 to-transparent",

    banner: "/games/banners/secuencia.png",
    ambientGradient:
      "from-cyan-500/30 via-blue-500/10 to-transparent",
    accentColor: "#06b6d4",
    glowColor: "rgba(6,182,212,0.45)",
    particles: "stars",
    previewDescription:
      "Descifra el orden oculto y forma la cadena del 1 al 9.",
  },

  "pregunta-pregunta": {
    emoji: "❓",
    difficulty: "Media",
    duration: "10 min",
    badge: "Popular",
    gradient:
      "from-violet-500/20 via-violet-500/5 to-transparent",

    banner: "/games/banners/pregunta.png",
    ambientGradient:
      "from-violet-500/30 via-fuchsia-500/10 to-transparent",
    accentColor: "#8b5cf6",
    glowColor: "rgba(139,92,246,0.45)",
    particles: "stars",
    previewDescription:
      "Responde preguntas rápidas, suma puntos y gana.",
  },

  memorama: {
    emoji: "🧠",
    difficulty: "Media",
    duration: "8 min",
    badge: "Familiar",
    gradient:
      "from-emerald-500/20 via-emerald-500/5 to-transparent",

    banner: "/games/banners/memorama.png",
    ambientGradient:
      "from-emerald-500/30 via-green-500/10 to-transparent",
    accentColor: "#10b981",
    glowColor: "rgba(16,185,129,0.45)",
    particles: "waves",
    previewDescription:
      "Voltea cartas, encuentra los pares y entrena tu memoria.",
  },

  domino: {
    emoji: "🎲",
    difficulty: "Media",
    duration: "10 min",
    badge: "Clásico",
    gradient:
      "from-orange-500/20 via-stone-500/10 to-transparent",

    banner: "/games/banners/domino.png",
    ambientGradient:
      "from-orange-500/30 via-stone-500/10 to-transparent",
    accentColor: "#f97316",
    glowColor: "rgba(249,115,22,0.45)",
    particles: "embers",
    previewDescription:
      "Conecta fichas, come del pozo y domina la mesa antes que tu rival.",
  },

  "loteria-mexicana": {
    emoji: "🎴",
    difficulty: "Fácil",
    duration: "15 min",
    badge: "Fiesta",
    gradient:
      "from-yellow-500/20 via-yellow-500/5 to-transparent",

    banner: "/games/banners/loteria.png",
    ambientGradient:
      "from-yellow-500/30 via-orange-500/10 to-transparent",
    accentColor: "#f59e0b",
    glowColor: "rgba(245,158,11,0.45)",
    particles: "cards",
    previewDescription:
      "Marca tus cartas, canta lotería y completa líneas para ganar.",
  },

  "guerra-total": {
    emoji: "💥",
    difficulty: "Difícil",
    duration: "15 min",
    badge: "Competitivo",
    gradient:
      "from-red-500/20 via-red-500/5 to-transparent",

    banner: "/games/banners/guerra-total.png",
    ambientGradient:
      "from-red-500/30 via-orange-500/10 to-transparent",
    accentColor: "#ef4444",
    glowColor: "rgba(239,68,68,0.45)",
    particles: "embers",
    previewDescription:
      "Coloca unidades, ataca coordenadas y destruye la flota rival.",
  },

  "personaje-secreto": {
    emoji: "🕵️",
    difficulty: "Media",
    duration: "12 min",
    badge: "Estrategia",
    gradient:
      "from-purple-500/20 via-purple-500/5 to-transparent",

    banner: "/games/banners/personaje.png",
    ambientGradient:
      "from-purple-500/30 via-indigo-500/10 to-transparent",
    accentColor: "#8b5cf6",
    glowColor: "rgba(139,92,246,0.45)",
    particles: "stars",
    previewDescription:
      "Haz preguntas, descarta pistas y descubre el personaje secreto.",
  },
};

export function getGamesForGroup(
  games: Game[],
  slugs: string[],
) {
  return games.filter((game) =>
    slugs.includes(game.slug),
  );
}

export function getGameVisualInfo(slug: string) {
  return (
    GAME_VISUAL_INFO[slug] ?? {
      emoji: "🎲",
      difficulty: "Normal",
      duration: "5 min",
      badge: "Juego",
      gradient:
        "from-white/10 via-white/5 to-transparent",

      banner: "/games/banners/default.png",
      ambientGradient:
        "from-orange-500/20 via-white/5 to-transparent",
      accentColor: "#f97316",
      glowColor: "rgba(249,115,22,0.35)",
      particles: "stars",
      previewDescription:
        "Entra a La Mesa Familiar, crea una sala y juega con todos.",
    }
  );
}