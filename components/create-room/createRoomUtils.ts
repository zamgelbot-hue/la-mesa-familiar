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

export type GameVisualInfo = {
  emoji: string;
  difficulty: string;
  duration: string;
  badge: string;
  gradient: string;
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

export const GAME_VISUAL_INFO: Record<
  string,
  GameVisualInfo
> = {
  ppt: {
    emoji: "✊",
    difficulty: "Fácil",
    duration: "2 min",
    badge: "Clásico",
    gradient:
      "from-orange-500/20 via-orange-500/5 to-transparent",
  },

  "piedra-papel-o-tijera": {
    emoji: "✊",
    difficulty: "Fácil",
    duration: "2 min",
    badge: "Clásico",
    gradient:
      "from-orange-500/20 via-orange-500/5 to-transparent",
  },

  gato: {
    emoji: "⭕",
    difficulty: "Fácil",
    duration: "3 min",
    badge: "Rápido",
    gradient:
      "from-pink-500/20 via-pink-500/5 to-transparent",
  },

  "secuencia-oculta": {
    emoji: "🔢",
    difficulty: "Media",
    duration: "5 min",
    badge: "Memoria",
    gradient:
      "from-cyan-500/20 via-cyan-500/5 to-transparent",
  },

  "pregunta-pregunta": {
    emoji: "❓",
    difficulty: "Media",
    duration: "10 min",
    badge: "Popular",
    gradient:
      "from-violet-500/20 via-violet-500/5 to-transparent",
  },

  memorama: {
    emoji: "🧠",
    difficulty: "Media",
    duration: "8 min",
    badge: "Familiar",
    gradient:
      "from-emerald-500/20 via-emerald-500/5 to-transparent",
  },

  "loteria-mexicana": {
    emoji: "🎴",
    difficulty: "Fácil",
    duration: "15 min",
    badge: "Fiesta",
    gradient:
      "from-yellow-500/20 via-yellow-500/5 to-transparent",
  },

  "guerra-total": {
    emoji: "💥",
    difficulty: "Difícil",
    duration: "15 min",
    badge: "Competitivo",
    gradient:
      "from-red-500/20 via-red-500/5 to-transparent",
  },

  "personaje-secreto": {
    emoji: "🕵️",
    difficulty: "Media",
    duration: "12 min",
    badge: "Estrategia",
    gradient:
      "from-purple-500/20 via-purple-500/5 to-transparent",
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
    }
  );
}