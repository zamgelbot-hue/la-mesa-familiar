// 📍 Ruta del archivo: lib/games/gameNavigation.ts

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export function getRoomPath(roomCode: string) {
  return `/sala/${String(roomCode).toUpperCase()}`;
}

export function getGamePath(roomCode: string) {
  return `/juego/${String(roomCode).toUpperCase()}`;
}

export function setCurrentGamePresence(params: {
  roomCode: string;
  gameName: string;
}) {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    "lmf_current_game",
    JSON.stringify({
      roomCode: params.roomCode,
      gameName: params.gameName,
      startedAt: Date.now(),
    }),
  );
}

export function clearCurrentGamePresence() {
  if (typeof window === "undefined") return;

  localStorage.removeItem("lmf_current_game");
}

export function getCurrentGamePresence() {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem("lmf_current_game");

    if (!raw) return null;

    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function returnToRoom(params: {
  router: AppRouterInstance;
  roomCode: string;
  replace?: boolean;
}) {
  const { router, roomCode, replace = false } = params;

  clearCurrentGamePresence();

  const path = getRoomPath(roomCode);

  if (replace) {
    router.replace(path);
    return;
  }

  router.push(path);
}

export function goToGame(params: {
  router: AppRouterInstance;
  roomCode: string;
  replace?: boolean;
}) {
  const { router, roomCode, replace = true } = params;

  const path = getGamePath(roomCode);

  if (replace) {
    router.replace(path);
    return;
  }

  router.push(path);
}