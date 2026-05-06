// 📍 Ruta del archivo: components/games/piedra-papel-o-tijera/pptBot.ts

import type { Choice, RoomPlayer } from "./pptTypes";

export const BOT_PLAYER_NAME = "Bot Familiar 🤖";
export const BOT_REWARD_COOLDOWN_MS = 60000;

const BOT_CHOICES: Exclude<Choice, null>[] = ["piedra", "papel", "tijera"];

export function getRandomBotChoice(): Exclude<Choice, null> {
  return BOT_CHOICES[Math.floor(Math.random() * BOT_CHOICES.length)];
}

export function buildBotPlayer(roomCode: string): RoomPlayer {
  return {
    id: `bot-${roomCode}`,
    room_code: roomCode,
    player_name: BOT_PLAYER_NAME,
    is_host: false,
    is_ready: true,
    created_at: "9999-12-31T23:59:59.999Z",
    user_id: null,
    is_guest: true,
  };
}

export function withBotPlayer(
  realPlayers: RoomPlayer[],
  roomCode: string,
  vsBot: boolean,
) {
  if (!vsBot) return realPlayers;

  if (realPlayers.some((player) => player.player_name === BOT_PLAYER_NAME)) {
    return realPlayers;
  }

  return [...realPlayers, buildBotPlayer(roomCode)];
}