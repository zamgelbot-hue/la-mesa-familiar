// 📍 components/games/guerra-total/gtTypes.ts

export type GtPhase = "placing" | "battle" | "finished";

export type GtVariant = "mar" | "aire" | "tierra";

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
