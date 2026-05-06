// 📍 Ruta del archivo: components/games/gato/gatoBot.ts

import { checkGatoWinner, type CellValue, type RoomPlayer } from "./utils";

export const GATO_BOT_NAME = "Bot Familiar 🤖";

export function buildGatoBotPlayer(roomCode: string): RoomPlayer {
  return {
    id: `bot-gato-${roomCode}`,
    room_code: roomCode,
    player_name: GATO_BOT_NAME,
    is_host: false,
    is_ready: true,
    created_at: "9999-12-31T23:59:59.999Z",
    user_id: null,
    is_guest: true,
  };
}

export function withGatoBotPlayer(
  realPlayers: RoomPlayer[],
  roomCode: string,
  vsBot: boolean,
) {
  if (!vsBot) return realPlayers;

  if (realPlayers.some((player) => player.player_name === GATO_BOT_NAME)) {
    return realPlayers;
  }

  return [...realPlayers, buildGatoBotPlayer(roomCode)];
}

export function getBestGatoBotMove(params: {
  board: CellValue[];
  boardSize: number;
  winLength: number;
}) {
  const { board, boardSize, winLength } = params;

  const emptyIndexes = board
    .map((cell, index) => (cell === null ? index : null))
    .filter((value): value is number => value !== null);

  if (emptyIndexes.length === 0) return null;

  const tryMove = (symbol: "X" | "O") => {
    for (const index of emptyIndexes) {
      const copy = [...board];
      copy[index] = symbol;

      const result = checkGatoWinner(copy, boardSize, winLength, null);

      if (result?.symbol === symbol) {
        return index;
      }
    }

    return null;
  };

  const winningMove = tryMove("O");
  if (winningMove !== null) return winningMove;

  const blockingMove = tryMove("X");
  if (blockingMove !== null) return blockingMove;

  const center = Math.floor((boardSize * boardSize) / 2);
  if (board[center] === null) return center;

  const corners = [
    0,
    boardSize - 1,
    boardSize * (boardSize - 1),
    boardSize * boardSize - 1,
  ];

  const openCorners = corners.filter((index) => board[index] === null);

  if (openCorners.length > 0) {
    return openCorners[Math.floor(Math.random() * openCorners.length)];
  }

  return emptyIndexes[Math.floor(Math.random() * emptyIndexes.length)];
}