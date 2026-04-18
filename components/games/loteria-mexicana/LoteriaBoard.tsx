"use client";

import LoteriaCard from "./LoteriaCard";
import type { LoteriaDeckDefinition } from "./loteriaTypes";
import { getCardByKey } from "./loteriaUtils";

type LoteriaBoardProps = {
  deck: LoteriaDeckDefinition;
  boardCardKeys: string[];
  markedCardKeys: string[];
  calledCardKeys: string[];
  winningCardKeys?: string[];
  currentCardKey?: string | null;
  disabled?: boolean;
  onToggleCard?: (cardKey: string) => void;
};

export default function LoteriaBoard({
  deck,
  boardCardKeys,
  markedCardKeys,
  calledCardKeys,
  winningCardKeys = [],
  currentCardKey = null,
  disabled = false,
  onToggleCard,
}: LoteriaBoardProps) {
  return (
    <div className="rounded-[30px] border border-orange-500/15 bg-zinc-950/90 p-4 shadow-[0_0_35px_rgba(249,115,22,0.05)] md:p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-300/80">
            Tu tablero
          </p>
          <h2 className="mt-1 text-2xl font-bold text-white">Lotería 4x4</h2>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-right">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
            Marcadas
          </p>
          <p className="mt-1 text-lg font-extrabold text-orange-400">
            {markedCardKeys.length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {boardCardKeys.map((cardKey) => {
          const card = getCardByKey(deck, cardKey);
          if (!card) return null;

          const isMarked = markedCardKeys.includes(cardKey);
          const isCalled = calledCardKeys.includes(cardKey);
          const isWinningCard = winningCardKeys.includes(cardKey);
          const isCurrentCalled = currentCardKey === cardKey;

          return (
            <LoteriaCard
              key={cardKey}
              card={card}
              size="md"
              isMarked={isMarked}
              isCalled={isCalled}
              isWinningCard={isWinningCard}
              isCurrentCalled={isCurrentCalled}
              disabled={disabled}
              onClick={onToggleCard ? () => onToggleCard(cardKey) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
