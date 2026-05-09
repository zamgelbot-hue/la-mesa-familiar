// 📍 Ruta del archivo: components/games/secuencia-oculta/secuenciaOcultaTypes.ts

export type SecuenciaPhase = "playing" | "finished";

export type SecuenciaVariant = "3x3" | "4x4" | "5x5";

export type SecuenciaCell = {
  id: string;
  value: number;
  row: number;
  col: number;
  revealed: boolean;
  failed?: boolean;
};

export type SecuenciaPlayer = {
  key: string;
  name: string;
  isHost: boolean;
};

export type SecuenciaMove = {
  id: string;
  playerKey: string;
  playerName: string;
  value: number;
  correct: boolean;
  createdAt: string;
};

export type SecuenciaGameState = {
  phase: SecuenciaPhase;
  variant: SecuenciaVariant;
  boardSize: number;
  maxNumber: number;
  nextNumber: number;
  currentTurnKey: string | null;
  currentTurnName: string | null;
  winnerKey: string | null;
  winnerName: string | null;
  cells: SecuenciaCell[];
  moves: SecuenciaMove[];
  rewards_applied: boolean;
};