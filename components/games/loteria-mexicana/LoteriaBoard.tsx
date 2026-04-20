"use client";

import LoteriaCard from "./LoteriaCard";
import type { LoteriaDeckDefinition } from "./loteriaTypes";
import { getCardByKey, resolveCardVisualState } from "./loteriaUtils";

type LoteriaBoardProps = {
  deck: LoteriaDeckDefinition;
  boardCardKeys: string[];
  markedCardKeys: string[];
  calledCardKeys: string[];
  winningCardKeys?: string[];
  currentCardKey?: string | null;
  disabled?: boolean;
  feedbackPulseCardKey?: string | null;
  feedbackInvalidCardKey?: string | null;
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
  feedbackPulseCardKey = null,
  feedbackInvalidCardKey = null,
  onToggleCard,
}: LoteriaBoardProps) {
  const expiredCount = boardCardKeys.filter((cardKey) =>
    resolveCardVisualState({
      cardKey,
      currentCardKey,
      boardCardKeys,
      calledCardKeys,
      markedCardKeys,
      winningCardKeys,
    }) === "expired"
  ).length;

  return (
    <div className="rounded-[30px] border border-orange-500/15 bg-zinc-950/90 p-4 shadow-[0_0_35px_rgba(249,115,22,0.05)] md:p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-300/80">
            Tu tablero
          </p>
          <h2 className="mt-1 text-2xl font-bold text-white">Lotería 4x4</h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
              Marcadas
            </p>
            <p className="mt-1 text-lg font-extrabold text-orange-400">
              {markedCardKeys.length}
            </p>
          </div>

          <div className="rounded-2xl border border-red-500/15 bg-red-500/10 px-3 py-2 text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
              Perdidas
            </p>
            <p className="mt-1 text-lg font-extrabold text-red-300">
              {expiredCount}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {boardCardKeys.map((cardKey) => {
          const card = getCardByKey(deck, cardKey);
          if (!card) return null;

          const visualState = resolveCardVisualState({
            cardKey,
            currentCardKey,
            boardCardKeys,
            calledCardKeys,
            markedCardKeys,
            winningCardKeys,
          });

          return (
            <LoteriaCard
              key={cardKey}
              card={card}
              size="md"
              visualState={visualState}
              isMarked={visualState === "marked"}
              isCalled={calledCardKeys.includes(cardKey)}
              isWinningCard={winningCardKeys.includes(cardKey)}
              isCurrentCalled={currentCardKey === cardKey}
              disabled={disabled}
              showPulse={feedbackPulseCardKey === cardKey}
              showInvalidShake={feedbackInvalidCardKey === cardKey}
              onClick={onToggleCard ? () => onToggleCard(cardKey) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
