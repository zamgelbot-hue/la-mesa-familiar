// 📍 Ruta del archivo: components/games/loteria-mexicana/loteriaUtils.ts

import type {
  LoteriaCardData,
  LoteriaCardVisualState,
  LoteriaDeckDefinition,
  LoteriaValidationResult,
  LoteriaWinCondition,
  LoteriaWinningPattern,
} from "./loteriaTypes";

const BOARD_SIZE = 16;
const BOARD_DIMENSION = 4;
export const LOTERIA_MARK_WINDOW_TURNS = 2;

const WINNING_LINES: Array<{
  pattern: LoteriaWinningPattern;
  indexes: number[];
}> = [
  { pattern: "row", indexes: [0, 1, 2, 3] },
  { pattern: "row", indexes: [4, 5, 6, 7] },
  { pattern: "row", indexes: [8, 9, 10, 11] },
  { pattern: "row", indexes: [12, 13, 14, 15] },

  { pattern: "column", indexes: [0, 4, 8, 12] },
  { pattern: "column", indexes: [1, 5, 9, 13] },
  { pattern: "column", indexes: [2, 6, 10, 14] },
  { pattern: "column", indexes: [3, 7, 11, 15] },

  { pattern: "diagonal_main", indexes: [0, 5, 10, 15] },
  { pattern: "diagonal_anti", indexes: [3, 6, 9, 12] },
];

export function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

export function getDeckCardKeys(deck: LoteriaDeckDefinition): string[] {
  return deck.cards.map((card) => card.key);
}

export function getCardByKey(
  deck: LoteriaDeckDefinition,
  cardKey: string
): LoteriaCardData | null {
  return deck.cards.find((card) => card.key === cardKey) ?? null;
}

export function getCardsByKeys(
  deck: LoteriaDeckDefinition,
  cardKeys: string[]
): LoteriaCardData[] {
  return cardKeys
    .map((key) => getCardByKey(deck, key))
    .filter((card): card is LoteriaCardData => !!card);
}

export function generateDrawOrder(deck: LoteriaDeckDefinition): string[] {
  return shuffleArray(getDeckCardKeys(deck));
}

export function generateBoardCardKeys(
  deck: LoteriaDeckDefinition,
  size = BOARD_SIZE
): string[] {
  const keys = shuffleArray(getDeckCardKeys(deck));

  if (keys.length < size) {
    throw new Error(
      `El deck "${deck.slug}" no tiene suficientes cartas para generar un tablero de ${size}.`
    );
  }

  return keys.slice(0, size);
}

export function markCard(
  markedCardKeys: string[],
  cardKey: string
): string[] {
  if (markedCardKeys.includes(cardKey)) {
    return markedCardKeys;
  }

  return [...markedCardKeys, cardKey];
}

export function isCardCalled(
  calledCardKeys: string[],
  cardKey: string
): boolean {
  return calledCardKeys.includes(cardKey);
}

export function isCardMarked(
  markedCardKeys: string[],
  cardKey: string
): boolean {
  return markedCardKeys.includes(cardKey);
}

export function getCalledBoardCardKeys(
  boardCardKeys: string[],
  calledCardKeys: string[]
): string[] {
  return boardCardKeys.filter((cardKey) => calledCardKeys.includes(cardKey));
}

export function getMarkedAndCalledCardKeys(
  markedCardKeys: string[],
  calledCardKeys: string[]
): string[] {
  return markedCardKeys.filter((cardKey) => calledCardKeys.includes(cardKey));
}

export function getBoardMatrix(boardCardKeys: string[]): string[][] {
  if (boardCardKeys.length !== BOARD_SIZE) {
    throw new Error(
      `El tablero debe tener exactamente ${BOARD_SIZE} cartas, pero recibió ${boardCardKeys.length}.`
    );
  }

  const matrix: string[][] = [];

  for (let row = 0; row < BOARD_DIMENSION; row += 1) {
    const start = row * BOARD_DIMENSION;
    const end = start + BOARD_DIMENSION;
    matrix.push(boardCardKeys.slice(start, end));
  }

  return matrix;
}

export function getWinningLineCardKeys(
  boardCardKeys: string[],
  indexes: number[]
): string[] {
  return indexes.map((index) => boardCardKeys[index]).filter(Boolean);
}

export function getCalledTurnIndex(
  calledCardKeys: string[],
  cardKey: string
): number {
  return calledCardKeys.indexOf(cardKey);
}

export function getTurnsSinceCalled(
  calledCardKeys: string[],
  cardKey: string
): number {
  const calledIndex = getCalledTurnIndex(calledCardKeys, cardKey);
  if (calledIndex < 0) return -1;
  return calledCardKeys.length - 1 - calledIndex;
}

export function isCardExpired(
  calledCardKeys: string[],
  markedCardKeys: string[],
  cardKey: string,
  markWindowTurns = LOTERIA_MARK_WINDOW_TURNS
): boolean {
  if (!calledCardKeys.includes(cardKey)) return false;
  if (markedCardKeys.includes(cardKey)) return false;

  return getTurnsSinceCalled(calledCardKeys, cardKey) > markWindowTurns;
}

export function isCardMarkable(
  boardCardKeys: string[],
  calledCardKeys: string[],
  markedCardKeys: string[],
  cardKey: string,
  markWindowTurns = LOTERIA_MARK_WINDOW_TURNS
): boolean {
  if (!boardCardKeys.includes(cardKey)) return false;
  if (!calledCardKeys.includes(cardKey)) return false;
  if (markedCardKeys.includes(cardKey)) return false;
  if (isCardExpired(calledCardKeys, markedCardKeys, cardKey, markWindowTurns)) {
    return false;
  }

  return true;
}

export function resolveCardVisualState(params: {
  cardKey: string;
  currentCardKey?: string | null;
  boardCardKeys: string[];
  calledCardKeys: string[];
  markedCardKeys: string[];
  winningCardKeys?: string[];
  markWindowTurns?: number;
}): LoteriaCardVisualState {
  const {
    cardKey,
    currentCardKey = null,
    boardCardKeys,
    calledCardKeys,
    markedCardKeys,
    winningCardKeys = [],
    markWindowTurns = LOTERIA_MARK_WINDOW_TURNS,
  } = params;

  const isWinning = winningCardKeys.includes(cardKey);
  if (isWinning) return "winning";

  const isMarkedNow = markedCardKeys.includes(cardKey);
  if (isMarkedNow) return "marked";

  const isCalledNow = calledCardKeys.includes(cardKey);
  if (!isCalledNow) return "idle";

  const expired = isCardExpired(
    calledCardKeys,
    markedCardKeys,
    cardKey,
    markWindowTurns
  );

  if (expired) return "expired";

  const isBoardCard = boardCardKeys.includes(cardKey);
  if (!isBoardCard) return "idle";

  if (currentCardKey === cardKey) {
    return "just_called";
  }

  return "markable";
}

// 📍 Ruta del archivo: components/games/loteria-mexicana/loteriaUtils.ts

export function validateLoteriaWin(
  boardCardKeys: string[],
  markedCardKeys: string[],
  calledCardKeys: string[],
  winCondition: LoteriaWinCondition = "line"
): LoteriaValidationResult {
  if (boardCardKeys.length !== BOARD_SIZE) {
    return {
      isWinner: false,
      pattern: null,
      winningCardKeys: [],
    };
  }

  const validMarkedKeys = new Set(
    markedCardKeys.filter((cardKey) => calledCardKeys.includes(cardKey))
  );

  if (winCondition === "corners") {
    const cornerIndexes = [0, 3, 12, 15];
    const cornerCardKeys = getWinningLineCardKeys(boardCardKeys, cornerIndexes);

    const isComplete = cornerCardKeys.every((cardKey) =>
      validMarkedKeys.has(cardKey)
    );

    return {
      isWinner: isComplete,
      pattern: isComplete ? "corners" : null,
      winningCardKeys: isComplete ? cornerCardKeys : [],
    };
  }

  if (winCondition === "full_card") {
    const isComplete = boardCardKeys.every((cardKey) =>
      validMarkedKeys.has(cardKey)
    );

    return {
      isWinner: isComplete,
      pattern: isComplete ? "full_card" : null,
      winningCardKeys: isComplete ? boardCardKeys : [],
    };
  }

  for (const line of WINNING_LINES) {
    const lineCardKeys = getWinningLineCardKeys(boardCardKeys, line.indexes);

    const isComplete = lineCardKeys.every((cardKey) =>
      validMarkedKeys.has(cardKey)
    );

    if (isComplete) {
      return {
        isWinner: true,
        pattern: line.pattern,
        winningCardKeys: lineCardKeys,
      };
    }
  }

  return {
    isWinner: false,
    pattern: null,
    winningCardKeys: [],
  };
}

// 📍 Ruta del archivo: components/games/loteria-mexicana/loteriaUtils.ts

export function canClaimLoteria(
  boardCardKeys: string[],
  markedCardKeys: string[],
  calledCardKeys: string[],
  winCondition: LoteriaWinCondition = "line"
): boolean {
  return validateLoteriaWin(
    boardCardKeys,
    markedCardKeys,
    calledCardKeys,
    winCondition
  ).isWinner;
}

export function getNextCalledCardKeys(
  currentCalledCardKeys: string[],
  nextCardKey: string
): string[] {
  if (currentCalledCardKeys.includes(nextCardKey)) {
    return currentCalledCardKeys;
  }

  return [...currentCalledCardKeys, nextCardKey];
}

export function getCurrentCardKeyFromDrawOrder(
  drawOrder: string[],
  calledCardKeys: string[]
): string | null {
  if (calledCardKeys.length === 0) return null;

  const latestCalledKey = calledCardKeys[calledCardKeys.length - 1];
  return drawOrder.includes(latestCalledKey) ? latestCalledKey : null;
}

export function getRemainingCardCount(
  deck: LoteriaDeckDefinition,
  calledCardKeys: string[]
): number {
  return Math.max(deck.cards.length - calledCardKeys.length, 0);
}

export function getUncalledCardKeys(
  drawOrder: string[],
  calledCardKeys: string[]
): string[] {
  const calledSet = new Set(calledCardKeys);
  return drawOrder.filter((cardKey) => !calledSet.has(cardKey));
}

export function getNextCardToCall(
  drawOrder: string[],
  calledCardKeys: string[]
): string | null {
  const calledSet = new Set(calledCardKeys);

  for (const cardKey of drawOrder) {
    if (!calledSet.has(cardKey)) {
      return cardKey;
    }
  }

  return null;
}

export function areBoardKeysValid(
  deck: LoteriaDeckDefinition,
  boardCardKeys: string[]
): boolean {
  const validKeys = new Set(deck.cards.map((card) => card.key));

  if (boardCardKeys.length !== BOARD_SIZE) return false;

  const uniqueKeys = new Set(boardCardKeys);
  if (uniqueKeys.size !== BOARD_SIZE) return false;

  return boardCardKeys.every((cardKey) => validKeys.has(cardKey));
}

export function areMarkedKeysValidForBoard(
  boardCardKeys: string[],
  markedCardKeys: string[]
): boolean {
  const boardSet = new Set(boardCardKeys);
  return markedCardKeys.every((cardKey) => boardSet.has(cardKey));
}

export function buildResolvedBoardCards(
  deck: LoteriaDeckDefinition,
  boardCardKeys: string[],
  markedCardKeys: string[],
  calledCardKeys: string[],
  winningCardKeys: string[] = []
) {
  const markedSet = new Set(markedCardKeys);
  const calledSet = new Set(calledCardKeys);
  const winningSet = new Set(winningCardKeys);

  return boardCardKeys
    .map((cardKey) => {
      const card = getCardByKey(deck, cardKey);
      if (!card) return null;

      return {
        ...card,
        isMarked: markedSet.has(cardKey),
        isCalled: calledSet.has(cardKey),
        isWinningCard: winningSet.has(cardKey),
      };
    })
    .filter(Boolean);
}

export function formatWinningPatternLabel(
  pattern: LoteriaWinningPattern | null
): string {
  switch (pattern) {
    case "row":
      return "Línea horizontal";
    case "column":
      return "Línea vertical";
    case "diagonal_main":
      return "Diagonal principal";
    case "diagonal_anti":
      return "Diagonal invertida";
    case "corners":
      return "4 esquinas";
    case "full_card":
      return "Cartón lleno";
    default:
      return "Sin patrón";
  }
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
