// 📍 Ruta del archivo: components/games/core/GameInfoCard.tsx

import { ReactNode } from "react";

type GameInfoCardProps = {
  title?: string;
  children: ReactNode;
  className?: string;
};

export default function GameInfoCard({
  title,
  children,
  className = "",
}: GameInfoCardProps) {
  return (
    <div
      className={`rounded-[26px] border border-white/10 bg-zinc-900/75 p-5 shadow-xl shadow-black/20 ${className}`}
    >
      {title && (
        <h3 className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-orange-400">
          {title}
        </h3>
      )}

      {children}
    </div>
  );
}