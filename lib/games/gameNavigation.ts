// 📍 Ruta del archivo: lib/games/gameNavigation.ts

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export function getRoomPath(roomCode: string) {
  return `/sala/${String(roomCode).toUpperCase()}`;
}

export function getGamePath(roomCode: string) {
  return `/juego/${String(roomCode).toUpperCase()}`;
}

export function returnToRoom(params: {
  router: AppRouterInstance;
  roomCode: string;
  replace?: boolean;
}) {
  const { router, roomCode, replace = false } = params;
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