// 📍 Ruta del archivo: lib/room/roomPlayerIdentity.ts

import type { PlayerIdentity } from "@/lib/profile/getPlayerIdentity";
import { readStoredRoomPlayerName, saveRoomPlayerIdentity } from "./roomStorage";
import type { RoomPlayer } from "./roomTypes";

export function resolveCurrentPlayerName(params: {
  code: string;
  players: RoomPlayer[];
  identity: PlayerIdentity | null;
}): string {
  const { code, players, identity } = params;

  if (identity?.user_id) {
    const authMatched = players.find(
      (player) => player.user_id === identity.user_id,
    );

    if (authMatched) {
      saveRoomPlayerIdentity(code, authMatched.player_name, authMatched.is_host);
      return authMatched.player_name;
    }
  }

  if (identity?.is_guest && identity.name) {
    const guestMatched = players.find(
      (player) =>
        player.is_guest &&
        !player.user_id &&
        player.player_name === identity.name,
    );

    if (guestMatched) {
      saveRoomPlayerIdentity(code, guestMatched.player_name, guestMatched.is_host);
      return guestMatched.player_name;
    }
  }

  const storedName = readStoredRoomPlayerName(code);

  if (storedName && players.some((player) => player.player_name === storedName)) {
    return storedName;
  }

  return "";
}

export function findCurrentPlayer(params: {
  players: RoomPlayer[];
  currentPlayerName: string;
}): RoomPlayer | null {
  const { players, currentPlayerName } = params;

  return players.find((player) => player.player_name === currentPlayerName) ?? null;
}

export function sortRoomPlayers(players: RoomPlayer[]): RoomPlayer[] {
  return [...players].sort((a, b) => {
    if (a.is_host && !b.is_host) return -1;
    if (!a.is_host && b.is_host) return 1;
    return a.created_at.localeCompare(b.created_at);
  });
}

export function getUniquePlayerName(params: {
  baseName: string;
  players: RoomPlayer[];
}) {
  const { baseName, players } = params;

  let finalName = baseName;
  let suffix = 2;

  while (players.some((player) => player.player_name === finalName)) {
    finalName = `${baseName} ${suffix}`;
    suffix += 1;
  }

  return finalName;
}
