"use client";

import LoteriaCard from "./LoteriaCard";
import type { LoteriaDeckDefinition } from "./loteriaTypes";
import { getCardsByKeys } from "./loteriaUtils";

type LoteriaCalledCardsProps = {
  deck: LoteriaDeckDefinition;
  calledCardKeys: string[];
  currentCardKey?: string | null;
};

export default function LoteriaCalledCards({
  deck,
  calledCardKeys,
  currentCardKey = null,
}: LoteriaCalledCardsProps) {
  const calledCards = getCardsByKeys(deck, calledCardKeys);

  return (
    <div className="rounded-[30px] border border-sky-400/15 bg-zinc-950/90 p-4 shadow-[0_0_30px_rgba(56,189,248,0.05)] md:p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-300/80">
            Historial
          </p>
          <h2 className="mt-1 text-2xl font-bold text-white">Cartas cantadas</h2>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-right">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
            Total
          </p>
          <p className="mt-1 text-lg font-extrabold text-sky-300">
            {calledCards.length}
          </p>
        </div>
      </div>

      {calledCards.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-10 text-center text-white/60">
          Aún no se han cantado cartas.
        </div>
      ) : (
        <div className="max-h-[300px] overflow-y-auto pr-2">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-5">
            {[...calledCards].reverse().map((card) => (
              <LoteriaCard
                key={card.key}
                card={card}
                size="sm"
                isCalled
                isCurrentCalled={currentCardKey === card.key}
                disabled
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
