// 📍 Ruta del archivo: components/games/guerra-total/guerraTotalTypes.ts

export type GtPhase = "placing" | "battle" | "finished";

export type GtVariant = "mar" | "aire" | "tierra";

export type GtOrientation = "horizontal" | "vertical";

export type GtBoardKind = "mine" | "enemy";

export type GtCellStatus =
  | "empty"
  | "ship"
  | "hit"
  | "hit-received"
  | "sunk"
  | "water"
  | "miss-received"
  | "unknown"
  | "preview-valid"
  | "preview-invalid";

export type GtCell = {
  row: number;
  col: number;
};

export type GtShip = {
  id: string;
  name: string;
  size: number;
  cells: GtCell[];
  hits: GtCell[];
  sunk: boolean;
};

export type GtShotResult = "water" | "hit" | "sunk";

export type GtShot = {
  id: string;
  attackerKey: string;
  attackerName: string;
  targetKey: string;
  targetName: string;
  cell: GtCell;
  result: GtShotResult;
  sunkShipName: string | null;
  createdAt: string;
};

export type GtPlayerBoard = {
  playerKey: string;
  playerName: string;
  ready: boolean;
  ships: GtShip[];
  shotsReceived: GtShot[];
};

export type GtGameState = {
  phase: GtPhase;
  variant: GtVariant;
  boardSize: number;
  currentTurnKey: string | null;
  currentTurnName: string | null;
  winnerKey: string | null;
  winnerName: string | null;
  boards: Record<string, GtPlayerBoard>;
  shots: GtShot[];
};

export type GtRoomPlayer = {
  id: string;
  room_code: string;
  user_id: string | null;
  player_name: string;
  is_host: boolean;
  is_guest: boolean;
  is_ready: boolean;
  created_at: string;
};

export type GtVariantTheme = {
  label: string;
  icon: string;
  unitIcons: Record<string, string>;
  emptyIcon: string;
  missIcon: string;
  hitIcon: string;
  sunkIcon: string;
  unitLabel: string;
  boardLabel: string;
  enemyLabel: string;
  waterLabel: string;
  hitLabel: string;
  sunkLabel: string;
  mineBoardClass: string;
  enemyBoardClass: string;
  shipCellClass: string;
  emptyCellClass: string;
  missCellClass: string;
  hitCellClass: string;
  sunkCellClass: string;
};