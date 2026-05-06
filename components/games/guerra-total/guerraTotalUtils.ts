// 📍 Ruta del archivo: components/games/guerra-total/guerraTotalUtils.ts

import type {
  GtCell,
  GtCellStatus,
  GtGameState,
  GtOrientation,
  GtPlayerBoard,
  GtShip,
  GtShot,
  GtVariant,
  GtVariantTheme,
} from "./guerraTotalTypes";

export const GT_DEFAULT_BOARD_SIZE = 8;
export const GT_BOT_KEY = "bot:guerra-total";
export const GT_BOT_NAME = "Bot";

export const GT_SHIP_TEMPLATES = [
  { id: "carrier", name: "Comandante", size: 4 },
  { id: "destroyer-a", name: "Destructor Alpha", size: 3 },
  { id: "destroyer-b", name: "Destructor Beta", size: 3 },
  { id: "submarine-a", name: "Unidad Fantasma", size: 2 },
  { id: "submarine-b", name: "Unidad Rápida", size: 2 },
  { id: "scout-a", name: "Explorador 1", size: 1 },
  { id: "scout-b", name: "Explorador 2", size: 1 },
];

export function normalizeGtVariant(variant?: string | null): GtVariant {
  const clean = String(variant ?? "mar").replace("_bot", "");

  if (clean === "aire" || clean === "tierra" || clean === "mar") {
    return clean;
  }

  return "mar";
}

export function isGtBotVariant(variant?: string | null) {
  return String(variant ?? "").endsWith("_bot");
}

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
  orientation: GtOrientation,
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

export function createBotBoard(boardSize: number): GtPlayerBoard {
  const ships: GtShip[] = [];

  for (const template of GT_SHIP_TEMPLATES) {
    let placed = false;
    let attempts = 0;

    while (!placed && attempts < 300) {
      attempts += 1;

      const orientation: GtOrientation =
        Math.random() > 0.5 ? "horizontal" : "vertical";

      const cell: GtCell = {
        row: Math.floor(Math.random() * boardSize),
        col: Math.floor(Math.random() * boardSize),
      };

      const cells = buildShipCells(cell, template.size, orientation);

      if (isPlacementValid(cells, ships, boardSize)) {
        ships.push(createShipFromTemplate(template, cells));
        placed = true;
      }
    }
  }

  return {
    playerKey: GT_BOT_KEY,
    playerName: GT_BOT_NAME,
    ready: true,
    ships,
    shotsReceived: [],
  };
}

export function getBotShotTarget(params: {
  boardSize: number;
  shots: GtShot[];
  humanKey: string;
}): GtCell | null {
  const { boardSize, shots, humanKey } = params;

  const available: GtCell[] = [];

  for (let row = 0; row < boardSize; row += 1) {
    for (let col = 0; col < boardSize; col += 1) {
      const cell = { row, col };

      const alreadyShot = shots.some(
        (shot) =>
          shot.attackerKey === GT_BOT_KEY &&
          shot.targetKey === humanKey &&
          sameCell(shot.cell, cell),
      );

      if (!alreadyShot) available.push(cell);
    }
  }

  if (available.length === 0) return null;

  return available[Math.floor(Math.random() * available.length)];
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

export function getNextUnplacedShipId(
  currentShipId: string,
  placedShipIds: Set<string>,
) {
  return (
    GT_SHIP_TEMPLATES.find(
      (ship) => ship.id !== currentShipId && !placedShipIds.has(ship.id),
    )?.id ?? null
  );
}

export function getMyCellStatus(
  cell: GtCell,
  myBoard?: GtPlayerBoard | null,
): GtCellStatus {
  const ship = myBoard?.ships.find((item) => isCellInList(cell, item.cells));
  const wasShot = myBoard?.shotsReceived.find((item) => sameCell(item.cell, cell));

  if (ship?.sunk && wasShot) return "sunk";
  if (ship && wasShot) return "hit-received";
  if (wasShot?.result === "water") return "miss-received";
  if (ship) return "ship";

  return "empty";
}

export function getEnemyCellStatus(params: {
  cell: GtCell;
  shots: GtShot[];
  currentPlayerKey: string | null;
  opponentKey: string | null;
  opponentBoard?: GtPlayerBoard | null;
}): GtCellStatus {
  const { cell, shots, currentPlayerKey, opponentKey, opponentBoard } = params;

  const shot = shots.find(
    (item) =>
      item.attackerKey === currentPlayerKey &&
      item.targetKey === opponentKey &&
      sameCell(item.cell, cell),
  );

  if (!shot) return "unknown";

  const sunkShip = opponentBoard?.ships.find(
    (ship) => ship.sunk && isCellInList(cell, ship.cells),
  );

  if (sunkShip) return "sunk";
  if (shot.result === "water") return "water";
  if (shot.result === "hit") return "hit";

  return "sunk";
}

export function getShipIconForCell(params: {
  cell: GtCell;
  board?: GtPlayerBoard | null;
  theme: GtVariantTheme;
}) {
  const { cell, board, theme } = params;

  const ship = board?.ships.find((item) => isCellInList(cell, item.cells));

  if (!ship) return theme.icon;

  return theme.unitIcons[ship.id] ?? theme.icon;
}

export function getShotResultLabel(shot: GtShot, theme: GtVariantTheme) {
  if (shot.result === "water") return theme.waterLabel;
  if (shot.result === "hit") return theme.hitLabel;
  return `${theme.sunkLabel}: ${shot.sunkShipName}`;
}

export function getShotResultClass(result: GtShot["result"]) {
  if (result === "water") return "text-sm font-bold text-sky-300";
  if (result === "hit") return "text-sm font-bold text-red-300";
  return "text-sm font-bold text-orange-300";
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

export function getGtVariantTheme(variant?: string | null): GtVariantTheme {
  const cleanVariant = normalizeGtVariant(variant);

  if (cleanVariant === "aire") {
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
      },
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

  if (cleanVariant === "tierra") {
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
      },
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
    },
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