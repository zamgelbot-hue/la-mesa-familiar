// 📍 Ruta del archivo: components/tutorials/TutorialCategory.tsx

import type { TutorialSection } from "@/data/tutorials";
import TutorialCard from "./TutorialCard";

type Props = {
  section: TutorialSection;
  openGuideId: string | null;
  onToggleGuide: (guideId: string) => void;
};

export default function TutorialCategory({
  section,
  openGuideId,
  onToggleGuide,
}: Props) {
  return (
    <section
      className={`rounded-[32px] border border-white/10 bg-gradient-to-br ${section.color} p-5 shadow-[0_0_50px_rgba(249,115,22,0.08)] md:p-8`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-200">
            Tutoriales
          </p>

          <h2 className="mt-3 text-2xl font-black md:text-3xl">{section.title}</h2>
        </div>

        <div className="shrink-0 rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-xs font-bold text-orange-300 md:text-sm">
          {section.guides.length} guías
        </div>
      </div>

      <p className="mt-5 text-sm text-white/70 md:text-base">{section.description}</p>

      <div className="mt-7 space-y-3">
        {section.guides.map((guide) => (
          <TutorialCard
            key={guide.id}
            guide={guide}
            isOpen={openGuideId === guide.id}
            onToggle={() => onToggleGuide(guide.id)}
          />
        ))}
      </div>
    </section>
  );
}
