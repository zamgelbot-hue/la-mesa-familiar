import type { LoteriaDeckDefinition } from "./loteriaTypes";

export const LOTERIA_TRADICIONAL_DECK: LoteriaDeckDefinition = {
  id: "deck-tradicional",
  slug: "tradicional",
  name: "Lotería Mexicana Tradicional",
  description: "La versión clásica de la lotería mexicana.",
  theme: "tradicional",
  cards: [
    // aquí luego van las 54 cartas
  ],
};

export const LOTERIA_DECKS: LoteriaDeckDefinition[] = [
  LOTERIA_TRADICIONAL_DECK,
];

export function getLoteriaDeckBySlug(slug: string) {
  return LOTERIA_DECKS.find((deck) => deck.slug === slug) ?? LOTERIA_TRADICIONAL_DECK;
}
