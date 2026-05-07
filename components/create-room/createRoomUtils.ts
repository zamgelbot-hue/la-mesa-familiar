// 📍 Ruta del archivo: components/create-room/createRoomUtils.ts

import type { Game } from "@/lib/home/homeTypes";

export type CreateRoomGroupKey = "rapidos" | "familiares" | "estrategicos";

export type CreateRoomGroup = {
  key: CreateRoomGroupKey;
  title: string;
  subtitle: string;
  icon: string;
  slugs: string[];
};

export const CREATE_ROOM_GROUPS: CreateRoomGroup[] = [
  {
    key: "rapidos",
    title: "Juegos rápidos",
    subtitle: "Partidas cortas, fáciles de explicar y perfectas para empezar.",
    icon: "⚡",
    slugs: ["ppt", "piedra-papel-o-tijera", "gato", "secuencia-oculta"],
  },
  {
    key: "familiares",
    title: "Juegos familiares",
    subtitle: "Ideales para jugar con varios, reírse y convivir.",
    icon: "🎉",
    slugs: ["loteria-mexicana", "memorama", "pregunta-pregunta"],
  },
  {
    key: "estrategicos",
    title: "Estrategia y deducción",
    subtitle: "Más tensión, turnos y decisiones importantes.",
    icon: "🧠",
    slugs: ["guerra-total", "personaje-secreto"],
  },
];

export function getGamesForGroup(games: Game[], slugs: string[]) {
  return games.filter((game) => slugs.includes(game.slug));
}

export function getGameEmoji(slug: string) {
  const icons: Record<string, string> = {
    ppt: "✊",
    "piedra-papel-o-tijera": "✊",
    gato: "⭕",
    "secuencia-oculta": "🔢",
    "loteria-mexicana": "🎴",
    memorama: "🧠",
    "pregunta-pregunta": "❓",
    "guerra-total": "💥",
    "personaje-secreto": "🕵️",
  };

  return icons[slug] ?? "🎲";
}