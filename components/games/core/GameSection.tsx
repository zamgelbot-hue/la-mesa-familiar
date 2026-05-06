// 📍 Ruta del archivo: components/games/core/GameSection.tsx

import { ReactNode } from "react";

type GameSectionProps = {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export default function GameSection({
  title,
  description,
  children,
  className = "",
}: GameSectionProps) {
  return (
    <section
      className={`rounded-[30px] border border-white/10 bg-zinc-950/60 p-5 shadow-2xl shadow-black/30 ${className}`}
    >
      {(title || description) && (
        <div className="mb-5">
          {title && (
            <h2 className="text-xl font-black tracking-tight text-white">
              {title}
            </h2>
          )}

          {description && (
            <p className="mt-1 text-sm font-medium text-zinc-400">
              {description}
            </p>
          )}
        </div>
      )}

      {children}
    </section>
  );
}