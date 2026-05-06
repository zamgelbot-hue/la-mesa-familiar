// 📍 Ruta del archivo: components/games/piedra-papel-o-tijera/pptStorage.ts

import { getPlayerStorageKey } from "./pptUtils";

const getLegacyPlayerStorageKeys = (roomCode: string) => [
  `la-mesa-player-name-${roomCode}`,
  `mesa-player-name-${roomCode}`,
  `player_name_${roomCode}`,
  `playerName_${roomCode}`,
  `room_player_name_${roomCode}`,
  `roomPlayerName_${roomCode}`,
  "player_name",
  "playerName",
  "nombreJugador",
];

export function detectStoredPlayerName(roomCode: string) {
  if (typeof window === "undefined") return "";

  const canonicalKey = getPlayerStorageKey(roomCode);

  const localCanonical = localStorage.getItem(canonicalKey);
  if (localCanonical) {
    try {
      const parsed = JSON.parse(localCanonical);
      if (parsed?.playerName && typeof parsed.playerName === "string") {
        return parsed.playerName.trim();
      }
    } catch {}
  }

  const sessionCanonical = sessionStorage.getItem(canonicalKey);
  if (sessionCanonical) {
    try {
      const parsed = JSON.parse(sessionCanonical);
      if (parsed?.playerName && typeof parsed.playerName === "string") {
        return parsed.playerName.trim();
      }
    } catch {}
  }

  for (const key of getLegacyPlayerStorageKeys(roomCode)) {
    const value = localStorage.getItem(key);
    if (value?.trim()) return value.trim();
  }

  for (const key of getLegacyPlayerStorageKeys(roomCode)) {
    const value = sessionStorage.getItem(key);
    if (value?.trim()) return value.trim();
  }

  return "";
}

export function persistPlayerName(roomCode: string, playerName: string) {
  if (typeof window === "undefined") return;

  const payload = JSON.stringify({
    roomCode,
    playerName,
    savedAt: new Date().toISOString(),
  });

  localStorage.setItem(getPlayerStorageKey(roomCode), payload);
  sessionStorage.setItem(getPlayerStorageKey(roomCode), payload);

  for (const key of getLegacyPlayerStorageKeys(roomCode)) {
    localStorage.setItem(key, playerName);
    sessionStorage.setItem(key, playerName);
  }
}