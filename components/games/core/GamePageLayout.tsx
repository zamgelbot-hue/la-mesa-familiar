// 📍 Ruta del archivo: components/games/core/GamePageLayout.tsx

import { ReactNode } from "react";

type GamePageLayoutProps = {
  children: ReactNode;
  className?: string;
};

export default function GamePageLayout({
  children,
  className = "",
}: GamePageLayoutProps) {
  return (
    <main
      className={`min-h-screen bg-zinc-950 px-4 py-6 text-white sm:px-6 lg:px-8 ${className}`}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        {children}
      </div>
    </main>
  );
}