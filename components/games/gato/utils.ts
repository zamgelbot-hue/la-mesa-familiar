// 📍 Ruta del archivo: components/games/gato/utils.ts

export type GatoGameProps = {
  roomCode: string;
  roomVariant?: string | null;
  roomSettings?: Record<string, any> | null;
};

export type RoomPlayer = {
  id: string;
  room_code: string;
  player_name: string;
  is_host: boolean;
  is_ready: boolean;
  created_at: string;
  user_id: string | null;
  is_guest: boolean;
};

export type CellValue = "X" | "O" | null;
export type BoardCell = CellValue;

export type GatoState = {
  game_slug: "gato";
  match_id: string;
  board_size: number;
  win_length: number;
  bonus_win_length: number | null;
  board: CellValue[];
  current_turn: string | null;
  symbols: Record<string, "X" | "O">;
  winner: string | null;
  winner_symbol: "X" | "O" | null;
  winning_line: number[];
  is_draw: boolean;
  match_over: boolean;
  result_text: string | null;
  is_bonus_win: boolean;
  rewards_applied: boolean;
  rematch_votes: string[];
};

export type GatoSound = "tap" | "error" | "win" | "draw" | "bonus";

export const DEFAULT_STATE: GatoState = {
  game_slug: "gato",
  match_id: "",
  board_size: 3,
  win_length: 3,
  bonus_win_length: null,
  board: Array(9).fill(null),
  current_turn: null,
  symbols: {},
  winner: null,
  winner_symbol: null,
  winning_line: [],
  is_draw: false,
  match_over: false,
  result_text: null,
  is_bonus_win: false,
  rewards_applied: false,
  rematch_votes: [],
};

export function getPlayerStorageKey(roomCode: string) {
  return `lmf:player:${roomCode}`;
}

export function createMatchId() {
  return `gato_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getModeConfig(
  roomVariant?: string | null,
  roomSettings?: Record<string, any> | null,
) {
  const isVsBot = roomSettings?.vs_bot === true || roomVariant === "bot_clasico";

  const boardSizeFromSettings = Number(roomSettings?.board_size ?? 0);
  const winLengthFromSettings = Number(roomSettings?.win_length ?? 0);
  const bonusWinLengthFromSettings =
    roomSettings?.bonus_win_length === null ||
    roomSettings?.bonus_win_length === undefined
      ? null
      : Number(roomSettings?.bonus_win_length ?? 0);

  if (isVsBot) {
    return {
      boardSize: 3,
      winLength: 3,
      bonusWinLength: null,
      modeLabel: "Vs Bot 3x3",
    };
  }

  if (boardSizeFromSettings > 0 && winLengthFromSettings > 0) {
    return {
      boardSize: boardSizeFromSettings,
      winLength: winLengthFromSettings,
      bonusWinLength:
        bonusWinLengthFromSettings && bonusWinLengthFromSettings > 0
          ? bonusWinLengthFromSettings
          : null,
      modeLabel:
        boardSizeFromSettings === 3
          ? "Clásico 3x3"
          : boardSizeFromSettings === 5
            ? "Grande 5x5"
            : "Épico 7x7",
    };
  }

  if (roomVariant === "grande") {
    return {
      boardSize: 5,
      winLength: 4,
      bonusWinLength: null,
      modeLabel: "Grande 5x5",
    };
  }

  if (roomVariant === "epico") {
    return {
      boardSize: 7,
      winLength: 5,
      bonusWinLength: 7,
      modeLabel: "Épico 7x7",
    };
  }

  return {
    boardSize: 3,
    winLength: 3,
    bonusWinLength: null,
    modeLabel: "Clásico 3x3",
  };
}

export function sortGatoPlayers(players: RoomPlayer[]) {
  return [...players].sort((a, b) => {
    if (a.is_host && !b.is_host) return -1;
    if (!a.is_host && b.is_host) return 1;
    return a.created_at.localeCompare(b.created_at);
  });
}

export function buildFreshState(
  players: RoomPlayer[],
  boardSize: number,
  winLength: number,
  bonusWinLength: number | null,
): GatoState {
  const sorted = sortGatoPlayers(players);
  const p1 = sorted[0]?.player_name ?? null;
  const p2 = sorted[1]?.player_name ?? null;

  return {
    ...DEFAULT_STATE,
    match_id: createMatchId(),
    board_size: boardSize,
    win_length: winLength,
    bonus_win_length: bonusWinLength,
    board: Array(boardSize * boardSize).fill(null),
    current_turn: p1,
    symbols: {
      ...(p1 ? { [p1]: "X" as const } : {}),
      ...(p2 ? { [p2]: "O" as const } : {}),
    },
  };
}

export function normalizeGatoState(params: {
  incoming?: Partial<GatoState> | null;
  boardSize: number;
  winLength: number;
  bonusWinLength: number | null;
}): GatoState {
  const { incoming, boardSize, winLength, bonusWinLength } = params;
  const expectedCells = boardSize * boardSize;

  return {
    ...DEFAULT_STATE,
    ...incoming,
    game_slug: "gato",
    board_size: boardSize,
    win_length: winLength,
    bonus_win_length: bonusWinLength,
    board:
      Array.isArray(incoming?.board) && incoming.board.length === expectedCells
        ? incoming.board
        : Array(expectedCells).fill(null),
    symbols: incoming?.symbols ?? {},
    winning_line: incoming?.winning_line ?? [],
    rematch_votes: incoming?.rematch_votes ?? [],
  };
}

export function checkGatoWinner(
  board: CellValue[],
  boardSize: number,
  winLength: number,
  bonusWinLength: number | null,
) {
  const directions = [
    { row: 0, col: 1 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
    { row: 1, col: -1 },
  ];

  let normalWin: {
    symbol: "X" | "O";
    line: number[];
    isBonus: boolean;
  } | null = null;

  for (let index = 0; index < board.length; index += 1) {
    const symbol = board[index];
    if (!symbol) continue;

    const startRow = Math.floor(index / boardSize);
    const startCol = index % boardSize;

    for (const direction of directions) {
      const line: number[] = [];
      let row = startRow;
      let col = startCol;

      while (
        row >= 0 &&
        row < boardSize &&
        col >= 0 &&
        col < boardSize &&
        board[row * boardSize + col] === symbol
      ) {
        line.push(row * boardSize + col);
        row += direction.row;
        col += direction.col;
      }

      if (bonusWinLength && line.length >= bonusWinLength) {
        return {
          symbol,
          line,
          isBonus: true,
        };
      }

      if (!normalWin && line.length >= winLength) {
        normalWin = {
          symbol,
          line: line.slice(0, winLength),
          isBonus: false,
        };
      }
    }
  }

  return normalWin;
}

export function playGatoSound(type: GatoSound) {
  if (typeof window === "undefined") return;

  const AudioCtx =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioCtx) return;

  const ctx = new AudioCtx();
  const now = ctx.currentTime;

  const tone = (
    frequency: number,
    start: number,
    duration: number,
    oscType: OscillatorType = "sine",
    gainValue = 0.05,
  ) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = oscType;
    osc.frequency.setValueAtTime(frequency, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(start + duration);
  };

  if (type === "tap") {
    tone(520, now, 0.08, "triangle", 0.04);
    tone(720, now + 0.05, 0.08, "triangle", 0.035);
  }

  if (type === "error") {
    tone(180, now, 0.09, "square", 0.035);
    tone(130, now + 0.08, 0.12, "square", 0.03);
  }

  if (type === "win") {
    tone(440, now, 0.11, "triangle", 0.045);
    tone(554, now + 0.12, 0.11, "triangle", 0.05);
    tone(659, now + 0.24, 0.18, "triangle", 0.055);
  }

  if (type === "draw") {
    tone(280, now, 0.1, "sine", 0.035);
    tone(280, now + 0.14, 0.1, "sine", 0.035);
  }

  if (type === "bonus") {
    tone(523, now, 0.1, "triangle", 0.045);
    tone(659, now + 0.1, 0.1, "triangle", 0.05);
    tone(784, now + 0.2, 0.12, "triangle", 0.055);
    tone(1046, now + 0.34, 0.2, "sine", 0.06);
  }

  window.setTimeout(() => {
    ctx.close().catch(() => {});
  }, 900);
}