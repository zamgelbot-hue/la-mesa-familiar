// 📍 Ruta del archivo: lib/home/homeStorage.ts

export const getPlayerStorageKey = (roomCode: string) => `lmf:player:${roomCode}`;

export const savePlayerIdentity = (
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

  const legacyKeys = [
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

  for (const key of legacyKeys) {
    localStorage.setItem(key, playerName);
    sessionStorage.setItem(key, playerName);
  }
};
