// 📍 Ruta del archivo: lib/room/roomStorage.ts

const getPlayerStorageKey = (roomCode: string) => `lmf:player:${roomCode}`;

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

export const saveRoomPlayerIdentity = (
  roomCode: string,
  playerName: string,
  isHost: boolean,
) => {
  if (typeof window === "undefined") return;

  const payload = JSON.stringify({
    roomCode,
    playerName,
    isHost,
    savedAt: new Date().toISOString(),
  });

  localStorage.setItem(getPlayerStorageKey(roomCode), payload);
  sessionStorage.setItem(getPlayerStorageKey(roomCode), payload);

  for (const key of getLegacyPlayerStorageKeys(roomCode)) {
    localStorage.setItem(key, playerName);
    sessionStorage.setItem(key, playerName);
  }
};

export const readStoredRoomPlayerName = (roomCode: string) => {
  if (typeof window === "undefined") return "";

  const canonical = localStorage.getItem(getPlayerStorageKey(roomCode));

  if (canonical) {
    try {
      const parsed = JSON.parse(canonical);
      if (parsed?.playerName) return String(parsed.playerName);
    } catch {}
  }

  const sessionCanonical = sessionStorage.getItem(getPlayerStorageKey(roomCode));

  if (sessionCanonical) {
    try {
      const parsed = JSON.parse(sessionCanonical);
      if (parsed?.playerName) return String(parsed.playerName);
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
};
