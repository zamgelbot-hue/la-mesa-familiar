// 📍 Ruta del archivo: components/games/secuencia-oculta/secuenciaOcultaUtils.ts

import type {
  SecuenciaCell,
  SecuenciaGameState,
  SecuenciaPlayer,
  SecuenciaVariant,
} from "./secuenciaOcultaTypes";

export function normalizeSecuenciaVariant(
  variant?: string | null,
): SecuenciaVariant {
  if (variant === "4x4" || variant === "5x5" || variant === "3x3") {
    return variant;
  }

  return "3x3";
}

export function getBoardSizeFromVariant(variant?: string | null) {
  const clean = normalizeSecuenciaVariant(variant);

  if (clean === "4x4") return 4;
  if (clean === "5x5") return 5;

  return 3;
}

export function getSecuenciaPlayerKey(player: {
  user_id: string | null;
  player_name: string;
}) {
  return player.user_id ?? `guest:${player.player_name}`;
}

export function shuffleNumbers(maxNumber: number) {
  return Array.from({ length: maxNumber }, (_, index) => index + 1).sort(
    () => Math.random() - 0.5,
  );
}

export function createSecuenciaCells(boardSize: number): SecuenciaCell[] {
  const maxNumber = boardSize * boardSize;
  const shuffled = shuffleNumbers(maxNumber);

  return shuffled.map((value, index) => ({
    id: `${index}`,
    value,
    row: Math.floor(index / boardSize),
    col: index % boardSize,
    revealed: false,
    failed: false,
  }));
}

export function createInitialSecuenciaGameState(
  variant?: string | null,
  players: SecuenciaPlayer[] = [],
): SecuenciaGameState {
  const cleanVariant = normalizeSecuenciaVariant(variant);
  const boardSize = getBoardSizeFromVariant(cleanVariant);
  const maxNumber = boardSize * boardSize;
  const firstPlayer = players[0] ?? null;

  return {
    phase: "playing",
    variant: cleanVariant,
    boardSize,
    maxNumber,
    nextNumber: 1,
    currentTurnKey: firstPlayer?.key ?? null,
    currentTurnName: firstPlayer?.name ?? null,
    winnerKey: null,
    winnerName: null,
    cells: createSecuenciaCells(boardSize),
    moves: [],
  };
}

export function getNextPlayer(
  players: SecuenciaPlayer[],
  currentTurnKey: string | null,
) {
  if (players.length === 0) return null;

  const currentIndex = players.findIndex(
    (player) => player.key === currentTurnKey,
  );

  if (currentIndex < 0) return players[0];

  return players[(currentIndex + 1) % players.length];
}

export function hideAllCells(cells: SecuenciaCell[]) {
  return cells.map((cell) => ({
    ...cell,
    revealed: false,
    failed: false,
  }));
}

export function clearFailedCells(cells: SecuenciaCell[]) {
  return cells.map((cell) => ({
    ...cell,
    failed: false,
  }));
}

export function revealCell(cells: SecuenciaCell[], cellId: string) {
  return cells.map((cell) =>
    cell.id === cellId ? { ...cell, revealed: true, failed: false } : cell,
  );
}

export function markFailedCell(cells: SecuenciaCell[], cellId: string) {
  return cells.map((cell) =>
    cell.id === cellId ? { ...cell, revealed: true, failed: true } : cell,
  );
}

export function getSecuenciaVariantLabel(variant?: string | null) {
  const clean = normalizeSecuenciaVariant(variant);

  if (clean === "5x5") return "Difícil · 5x5";
  if (clean === "4x4") return "Medio · 4x4";

  return "Fácil · 3x3";
}