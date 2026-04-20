"use client";

import type { LoteriaDeckDefinition } from "./loteriaTypes";
import { getCardByKey } from "./loteriaUtils";

type LoteriaCurrentCardProps = {
  deck: LoteriaDeckDefinition;
  currentCardKey: string | null;
  remainingCount?: number;
  phaseLabel?: string;
};

export default function LoteriaCurrentCard({
  deck,
  currentCardKey,
  remainingCount = 0,
  phaseLabel = "Carta actual",
}: LoteriaCurrentCardProps) {
  const currentCard = currentCardKey ? getCardByKey(deck, currentCardKey) : null;

  return (
    <div className="rounded-[30px] border border-yellow-400/20 bg-yellow-500/10 p-5 shadow-[0_0_35px_rgba(250,204,21,0.08)]">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-yellow-300/80">
            {phaseLabel}
          </p>
          <h2 className="mt-1 text-2xl font-bold text-white">
            {currentCard ? currentCard.name : "Esperando inicio"}
          </h2>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-right">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
            Restantes
          </p>
          <p className="mt-1 text-lg font-extrabold text-yellow-300">
            {remainingCount}
          </p>
        </div>
      </div>

      <div className="flex min-h-[240px] items-center justify-center rounded-[28px] border border-white/8 bg-black/25 p-5">
        {currentCard ? (
          <div className="flex w-full max-w-sm flex-col items-center text-center">
            <div className="flex h-40 w-full items-center justify-center rounded-[28px] border border-white/8 bg-white/[0.03] shadow-[0_0_30px_rgba(250,204,21,0.08)]">
              {currentCard.image ? (
                <img
                  src={currentCard.image}
                  alt={currentCard.name}
                  className="h-28 w-28 object-contain"
                />
              ) : (
                <span className="text-5xl font-black text-yellow-300">?</span>
              )}
            </div>

            <p className="mt-5 text-3xl font-extrabold text-white">
              {currentCard.name}
            </p>

            {currentCard.callout && (
              <p className="mt-2 text-sm italic text-white/55">
                {currentCard.callout}
              </p>
            )}
          </div>
        ) : (
          <div className="text-center">
            <p className="text-2xl font-bold text-white/85">
              La partida aún no comienza
            </p>
            <p className="mt-2 text-sm text-white/55">
              En cuanto inicie, aquí aparecerá la carta cantada actual.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
