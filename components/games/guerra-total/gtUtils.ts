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
      unitIcons: {
        carrier: "🛩️",
        "destroyer-a": "🚁",
        "destroyer-b": "🚁",
        "submarine-a": "🛰️",
        "submarine-b": "🛰️",
        "scout-a": "🛸",
        "scout-b": "🛸",
      } as Record<string, string>,
      emptyIcon: "",
      missIcon: "☁️",
      hitIcon: "💥",
      sunkIcon: "🔥",
      unitLabel: "Escuadrón",
      boardLabel: "Radar",
      enemyLabel: "Zona aérea enemiga",
      waterLabel: "Cielo limpio",
      hitLabel: "Impacto aéreo",
      sunkLabel: "Derribado",
      mineBoardClass:
        "rounded-[28px] border border-sky-500/20 bg-sky-950/30 p-5",
      enemyBoardClass:
        "rounded-[28px] border border-slate-400/20 bg-slate-950/40 p-5",
      shipCellClass: "border-slate-200/40 bg-slate-400/25 text-slate-50",
      emptyCellClass:
        "border-white/10 bg-white/[0.03] text-white/30 hover:border-sky-300/50",
      missCellClass: "border-sky-200/30 bg-sky-500/15 text-sky-100",
      hitCellClass: "border-red-400/50 bg-red-500/40 text-red-100",
      sunkCellClass: "border-orange-400/70 bg-orange-500/60 text-orange-50",
    };
  }

  if (variant === "tierra") {
    return {
      label: "Tierra",
      icon: "🪖",
      unitIcons: {
        carrier: "🛡️",
        "destroyer-a": "🚜",
        "destroyer-b": "🚜",
        "submarine-a": "💣",
        "submarine-b": "💣",
        "scout-a": "🪖",
        "scout-b": "🪖",
      } as Record<string, string>,
      emptyIcon: "",
      missIcon: "🟫",
      hitIcon: "💥",
      sunkIcon: "🔥",
      unitLabel: "Unidad",
      boardLabel: "Campo",
      enemyLabel: "Territorio enemigo",
      waterLabel: "Terreno vacío",
      hitLabel: "Impacto terrestre",
      sunkLabel: "Destruido",
      mineBoardClass:
        "rounded-[28px] border border-emerald-500/20 bg-emerald-950/25 p-5",
      enemyBoardClass:
        "rounded-[28px] border border-amber-500/20 bg-amber-950/20 p-5",
      shipCellClass: "border-lime-300/40 bg-lime-600/25 text-lime-50",
      emptyCellClass:
        "border-white/10 bg-white/[0.03] text-white/30 hover:border-emerald-400/50",
      missCellClass: "border-amber-400/30 bg-amber-700/20 text-amber-100",
      hitCellClass: "border-red-400/50 bg-red-500/40 text-red-100",
      sunkCellClass: "border-orange-400/70 bg-orange-500/60 text-orange-50",
    };
  }

  return {
    label: "Mar",
    icon: "🌊",
    unitIcons: {
      carrier: "🚢",
      "destroyer-a": "⛴️",
      "destroyer-b": "⛴️",
      "submarine-a": "⚓",
      "submarine-b": "⚓",
      "scout-a": "🛟",
      "scout-b": "🛟",
    } as Record<string, string>,
    emptyIcon: "",
    missIcon: "🌊",
    hitIcon: "💥",
    sunkIcon: "🔥",
    unitLabel: "Flota",
    boardLabel: "Océano",
    enemyLabel: "Océano enemigo",
    waterLabel: "Agua",
    hitLabel: "Impacto",
    sunkLabel: "Hundido",
    mineBoardClass:
      "rounded-[28px] border border-cyan-500/20 bg-cyan-950/25 p-5",
    enemyBoardClass:
      "rounded-[28px] border border-orange-500/20 bg-zinc-950/90 p-5",
    shipCellClass: "border-slate-200/40 bg-slate-500/25 text-slate-50",
    emptyCellClass:
      "border-white/10 bg-white/[0.03] text-white/30 hover:border-orange-400/50",
    missCellClass: "border-sky-400/30 bg-sky-500/20 text-sky-100",
    hitCellClass: "border-red-400/50 bg-red-500/40 text-red-100",
    sunkCellClass: "border-orange-400/70 bg-orange-500/60 text-orange-50",
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

export function hasAlreadyShot(
  shots: GtShot[],
  attackerKey: string,
  targetKey: string,
  cell: GtCell,
) {
  return shots.some(
    (shot) =>
      shot.attackerKey === attackerKey &&
      shot.targetKey === targetKey &&
      sameCell(shot.cell, cell),
  );
}
