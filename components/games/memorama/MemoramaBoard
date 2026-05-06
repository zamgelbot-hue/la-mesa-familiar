// 📍 Ruta del archivo: components/games/memorama/MemoramaBoard.tsx

import type { MemoramaGameState } from "./types";
import { isCardVisible } from "./utils";
import MemoramaCard from "./MemoramaCard";

type Props = {
  gameState: MemoramaGameState;
  saving: boolean;
  isMyTurn: boolean;
  currentPlayerKey: string | null;
  onCardClick: (cardId: string) => void;
};

export default function MemoramaBoard({
  gameState,
  saving,
  isMyTurn,
  currentPlayerKey,
  onCardClick,
}: Props) {
  return (
    <section className="rounded-[32px] border border-white/10 bg-zinc-950/90 p-4 md:p-6">
      <div
        className={
          gameState.variant.pairs > 8
            ? "grid grid-cols-4 gap-3 lg:grid-cols-6"
            : "grid grid-cols-4 gap-3"
        }
      >
        {gameState.cards.map((card) => {
          const visible = isCardVisible(
            card,
            gameState.selectedCardIds,
            gameState.matchedCardIds,
          );

          const matched = gameState.matchedCardIds.includes(card.id);
          const selected = gameState.selectedCardIds.includes(card.id);
          const ownerKey = gameState.matchedPairOwners?.[card.pairId] ?? null;
          const isMineMatchedPair = ownerKey === currentPlayerKey;

          const disabled =
            saving ||
            gameState.phase !== "playing" ||
            !isMyTurn ||
            gameState.isResolving ||
            visible;

          return (
            <MemoramaCard
              key={card.id}
              card={card}
              visible={visible}
              matched={matched}
              selected={selected}
              isResolving={gameState.isResolving}
              isMineMatchedPair={isMineMatchedPair}
              disabled={disabled}
              onClick={onCardClick}
            />
          );
        })}
      </div>
    </section>
  );
}