// 📍 components/games/guerra-total/gtUtils.ts

import type {
  GtCell,
  GtGameState,
  GtPlayerBoard,
  GtShip,
  GtShot,
  GtVariant,
} from "./gtTypes";

export const GT_DEFAULT_BOARD_SIZE = 8;

export const GT_SHIP_TEMPLATES = [
  { id: "carrier", name: "Comandante", size: 4 },
  { id: "destroyer-a", name: "Destructor Alpha", size: 3 },
  { id: "destroyer-b", name: "Destructor Beta", size: 3 },
  { id: "submarine-a", name: "Unidad Fantasma", size: 2 },
  { id: "submarine-b", name: "Unidad Rápida", size: 2 },
  { id: "scout-a", name: "Explorador 1", size: 1 },
  { id: "scout-b", name: "Explorador 2", size: 1 },
];

export function createInitialGtGameState(
  variant: GtVariant = "mar",
  boardSize = GT_DEFAULT_BOARD_SIZE,
): GtGameState {
  return {
    phase: "placing",
    variant,
    boardSize,
    currentTurnKey: null,
    currentTurnName: null,
    winnerKey: null,
    winnerName: null,
    boards: {},
    shots: [],
  };
}

export function getGtPlayerKey(player: {
  user_id: string | null;
  player_name: string;
}) {
  return player.user_id ?? `guest:${player.player_name}`;
}

export function cellKey(cell: GtCell) {
  return `${cell.row}-${cell.col}`;
}

export function sameCell(a: GtCell, b: GtCell) {
  return a.row === b.row && a.col === b.col;
}

export function isCellInList(cell: GtCell, list: GtCell[]) {
  return list.some((item) => sameCell(item, cell));
}

export function buildShipCells(
  start: GtCell,
  size: number,
  orientation: "horizontal" | "vertical",
): GtCell[] {
  return Array.from({ length: size }, (_, index) => ({
    row: orientation === "vertical" ? start.row + index : start.row,
    col: orientation === "horizontal" ? start.col + index : start.col,
  }));
}

export function isPlacementValid(
  cells: GtCell[],
  existingShips: GtShip[],
  boardSize: number,
) {
  const insideBoard = cells.every(
    (cell) =>
      cell.row >= 0 &&
      cell.row < boardSize &&
      cell.col >= 0 &&
      cell.col < boardSize,
  );

  if (!insideBoard) return false;

  const occupied = existingShips.flatMap((ship) => ship.cells);

  return cells.every((cell) => !isCellInList(cell, occupied));
}

export function createShipFromTemplate(
  template: { id: string; name: string; size: number },
  cells: GtCell[],
): GtShip {
  return {
    id: template.id,
    name: template.name,
    size: template.size,
    cells,
    hits: [],
    sunk: false,
  };
}

export function createEmptyPlayerBoard(
  playerKey: string,
  playerName: string,
): GtPlayerBoard {
  return {
    playerKey,
    playerName,
    ready: false,
    ships: [],
    shotsReceived: [],
  };
}

export function allShipsPlaced(board?: GtPlayerBoard | null) {
  return !!board && board.ships.length === GT_SHIP_TEMPLATES.length;
}

export function allShipsSunk(board?: GtPlayerBoard | null) {
  if (!board || board.ships.length === 0) return false;

  return board.ships.every((ship) => ship.sunk);
}

export function getRandomFirstTurn<T>(players: T[]) {
  if (players.length === 0) return null;
  return players[Math.floor(Math.random() * players.length)];
}

export function getGtVariantTheme(variant?: string | null) {
  if (variant === "aire") {
    return {
      label: "Aire",
      icon: "✈️",
      unitLabel: "Escuadrón",
      boardLabel: "Radar",
      waterLabel: "Cielo limpio",
      hitLabel: "Impacto aéreo",
      sunkLabel: "Derribado",
      accent: "sky",
    };
  }

  if (variant === "tierra") {
    return {
      label: "Tierra",
      icon: "🪖",
      unitLabel: "Unidad",
      boardLabel: "Campo",
      waterLabel: "Terreno vacío",
      hitLabel: "Impacto terrestre",
      sunkLabel: "Destruido",
      accent: "emerald",
    };
  }

  return {
    label: "Mar",
    icon: "🌊",
    unitLabel: "Flota",
    boardLabel: "Océano",
    waterLabel: "Agua",
    hitLabel: "Impacto",
    sunkLabel: "Hundido",
    accent: "cyan",
  };
}

export function resolveShot(
  board: GtPlayerBoard,
  shot: GtShot,
): {
  nextBoard: GtPlayerBoard;
  result: GtShot["result"];
  sunkShipName: string | null;
} {
  let result: GtShot["result"] = "water";
  let sunkShipName: string | null = null;

  const ships = board.ships.map((ship) => {
    const wasHit = ship.cells.some((cell) => sameCell(cell, shot.cell));

    if (!wasHit) return ship;

    const nextHits = isCellInList(shot.cell, ship.hits)
      ? ship.hits
      : [...ship.hits, shot.cell];

    const sunk = ship.cells.every((cell) => isCellInList(cell, nextHits));

    result = sunk ? "sunk" : "hit";
    sunkShipName = sunk ? ship.name : null;

    return {
      ...ship,
      hits: nextHits,
      sunk,
    };
  });

  return {
    result,
    sunkShipName,
    nextBoard: {
      ...board,
      ships,
      shotsReceived: [
        {
          ...shot,
          result,
          sunkShipName,
        },
        ...(board.shotsReceived ?? []),
      ],
    },
  };
}

export function hasAlreadyShot(shots: GtShot[], attackerKey: string, targetKey: string, cell: GtCell) {
  return shots.some(
    (shot) =>
      shot.attackerKey === attackerKey &&
      shot.targetKey === targetKey &&
      sameCell(shot.cell, cell),
  );
}
