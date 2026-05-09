// 📍 Ruta del archivo: components/tutorials/TutorialStep.tsx

import type { TutorialStep as TutorialStepType } from "@/data/tutorials";

type Props = {
  step: TutorialStepType;
  index: number;
};

export default function TutorialStep({ step, index }: Props) {
  return (
    <div className="flex gap-3 rounded-2xl border border-white/10 bg-black/35 p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500 text-sm font-black text-black">
        {index + 1}
      </div>

      <div>
        <p className="font-black text-white">{step.label}</p>
        <p className="mt-1 text-sm leading-relaxed text-white/65 md:text-base">
          {step.detail}
        </p>
      </div>
    </div>
  );
}
