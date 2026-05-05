// 📍 Ruta del archivo: components/games/memorama/utils.ts

import type { MemoramaCard, MemoramaGameState } from "./types";

export const MEMORAMA_TURN_SECONDS = 5;
export const MEMORAMA_RESOLVE_MS = 1200;

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

export const shuffleCards = <T,>(items: T[]): T[] => {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
};

export const createMemoramaDeck = (pairs = 8): MemoramaCard[] => {
  const selected = MEMORAMA_EMOJIS.slice(0, pairs);

  return shuffleCards(
    selected.flatMap((emoji, index) => {
      const pairId = `pair-${index}`;

      return [
        { id: `${pairId}-a`, pairId, emoji },
        { id: `${pairId}-b`, pairId, emoji },
      ];
    }),
  );
};

export const getTurnTimes = () => {
  const now = new Date();
  const end = new Date(now.getTime() + MEMORAMA_TURN_SECONDS * 1000);

  return {
    turnStartedAt: now.toISOString(),
    turnEndsAt: end.toISOString(),
  };
};

export const createInitialMemoramaState = (): MemoramaGameState => {
  const now = new Date().toISOString();

  return {
    phase: "waiting",
    cards: createMemoramaDeck(8),

    selectedCardIds: [],
    matchedCardIds: [],
    matchedPairOwners: {},

    currentTurnKey: null,
    currentTurnName: null,

    scores: {},

    isResolving: false,
    lastResult: null,

    turnStartedAt: null,
    turnEndsAt: null,

    winnerKey: null,
    winnerName: null,

    createdAt: now,
    updatedAt: now,
  };
};

export const getCardById = (cards: MemoramaCard[], cardId: string) => {
  return cards.find((card) => card.id === cardId) ?? null;
};

export const isCardVisible = (
  card: MemoramaCard,
  selectedCardIds: string[],
  matchedCardIds: string[],
) => {
  return selectedCardIds.includes(card.id) || matchedCardIds.includes(card.id);
};

export const areAllPairsMatched = (
  cards: MemoramaCard[],
  matchedCardIds: string[],
) => {
  return matchedCardIds.length >= cards.length;
};

export const getWinnerFromScores = (
  scores: MemoramaGameState["scores"],
): { winnerKey: string | null; winnerName: string | null } => {
  const scoreList = Object.values(scores);

  if (scoreList.length === 0) {
    return { winnerKey: null, winnerName: null };
  }

  const sorted = [...scoreList].sort((a, b) => b.pairs - a.pairs);
  const top = sorted[0];
  const second = sorted[1];

  if (second && second.pairs === top.pairs) {
    return { winnerKey: null, winnerName: "Empate" };
  }

  return {
    winnerKey: top.playerKey,
    winnerName: top.playerName,
  };
};
