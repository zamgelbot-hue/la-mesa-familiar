// 📍 Ruta del archivo: components/tutorials/TutorialCard.tsx

import type { TutorialGuide } from "@/data/tutorials";
import TutorialStep from "./TutorialStep";

type Props = {
  guide: TutorialGuide;
  isOpen: boolean;
  onToggle: () => void;
};

export default function TutorialCard({ guide, isOpen, onToggle }: Props) {
  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition hover:bg-black/50 md:px-5"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl">
            {guide.emoji}
          </div>

          <div className="min-w-0">
            <h3 className="truncate font-black text-white">{guide.title}</h3>
            <p className="mt-1 text-xs text-white/45 md:text-sm">{guide.short}</p>

            <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-[0.12em]">
              <span className="rounded-full bg-orange-500/10 px-2 py-1 text-orange-200">
                {guide.difficulty}
              </span>
              <span className="rounded-full bg-white/5 px-2 py-1 text-white/45">
                {guide.time}
              </span>
            </div>
          </div>
        </div>

        <span className="shrink-0 text-2xl font-black text-orange-400">
          {isOpen ? "−" : "+"}
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-white/10 px-4 pb-5 pt-4 md:px-5">
          <div className="space-y-3">
            {guide.steps.map((step, index) => (
              <TutorialStep key={`${guide.id}-${step.label}`} step={step} index={index} />
            ))}
          </div>

          {guide.tip && (
            <div className="mt-4 rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4 text-sm text-orange-100">
              <span className="font-black">Tip:</span> {guide.tip}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
