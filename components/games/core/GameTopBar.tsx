// 📍 Ruta del archivo: components/games/core/GameTopBar.tsx

import { ReactNode } from "react";

type GameTopBarProps = {
  title: string;
  subtitle?: string;
  leftContent?: ReactNode;
  rightContent?: ReactNode;
  className?: string;
};

export default function GameTopBar({
  title,
  subtitle,
  leftContent,
  rightContent,
  className = "",
}: GameTopBarProps) {
  return (
    <header
      className={`rounded-[28px] border border-orange-500/20 bg-zinc-900/80 p-5 shadow-[0_0_35px_rgba(249,115,22,0.08)] backdrop-blur ${className}`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          {leftContent}

          <div>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              {title}
            </h1>

            {subtitle && (
              <p className="mt-1 text-sm font-medium text-zinc-400">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {rightContent && <div className="flex flex-wrap gap-2">{rightContent}</div>}
      </div>
    </header>
  );
}