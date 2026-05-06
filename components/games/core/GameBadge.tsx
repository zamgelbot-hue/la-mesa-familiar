// 📍 Ruta del archivo: components/games/core/GameBadge.tsx

import { ReactNode } from "react";

type GameBadgeTone = "default" | "success" | "error" | "warning" | "orange";

type GameBadgeProps = {
  children: ReactNode;
  tone?: GameBadgeTone;
  className?: string;
};

const toneClasses: Record<GameBadgeTone, string> = {
  default: "border-white/10 bg-white/5 text-zinc-300",
  success: "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
  error: "border-red-400/20 bg-red-500/10 text-red-300",
  warning: "border-yellow-400/20 bg-yellow-500/10 text-yellow-300",
  orange: "border-orange-400/20 bg-orange-500/10 text-orange-300",
};

export default function GameBadge({
  children,
  tone = "default",
  className = "",
}: GameBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide ${toneClasses[tone]} ${className}`}
    >
      {children}
    </span>
  );
}