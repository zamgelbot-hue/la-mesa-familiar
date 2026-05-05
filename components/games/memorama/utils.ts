// 📍 Ruta del archivo: components/games/memorama/utils.ts

import type { MemoramaCard, MemoramaGameState } from "./types";

export const MEMORAMA_EMOJIS = [
  "🎲",
  "🃏",
  "🎯",
  "🏆",
  "⭐",
  "🔥",
  "🍕",
  "🌮",
  "🍔",
  "🎮",
  "🐱",
  "🐶",
];

export const createMemoramaDeck = (pairs = 8): MemoramaCard[] => {
  const selected = MEMORAMA_EMOJIS.slice(0, pairs);

  const cards = selected.flatMap((emoji, index) => {
    const pairId = `pair-${index}`;

    return [
      {
        id: `${pairId}-a`,
        pairId,
        emoji,
        isMatched: false,
      },
      {
        id: `${pairId}-b`,
        pairId,
        emoji,
        isMatched: false,
      },
    ];
  });

  return shuffleCards(cards);
};

export const shuffleCards = <T,>(items: T[]): T[] => {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
};

export const createInitialMemoramaState = (): MemoramaGameState => {
  const now = new Date().toISOString();

  return {
    phase: "waiting",
    cards: createMemoramaDeck(8),
    flippedCardIds: [],
    matchedCardIds: [],
    currentTurnKey: null,
    currentTurnName: null,
    scores: {},
    lastMatch: null,
    winnerKey: null,
    winnerName: null,
    createdAt: now,
    updatedAt: now,
  };
};

export const isCardVisible = (
  card: MemoramaCard,
  flippedCardIds: string[],
  matchedCardIds: string[],
) => {
  return flippedCardIds.includes(card.id) || matchedCardIds.includes(card.id);
};

export const getCardById = (cards: MemoramaCard[], cardId: string) => {
  return cards.find((card) => card.id === cardId) ?? null;
};

export const getWinnerFromScores = (
  scores: MemoramaGameState["scores"],
): { winnerKey: string | null; winnerName: string | null } => {
  const scoreList = Object.values(scores);

  if (scoreList.length === 0) {
    return {
      winnerKey: null,
      winnerName: null,
    };
  }

  const sorted = [...scoreList].sort((a, b) => b.pairs - a.pairs);
  const top = sorted[0];
  const second = sorted[1];

  if (second && second.pairs === top.pairs) {
    return {
      winnerKey: null,
      winnerName: "Empate",
    };
  }

  return {
    winnerKey: top.playerKey,
    winnerName: top.playerName,
  };
};

export const areAllPairsMatched = (
  cards: MemoramaCard[],
  matchedCardIds: string[],
) => {
  return matchedCardIds.length >= cards.length;
};
