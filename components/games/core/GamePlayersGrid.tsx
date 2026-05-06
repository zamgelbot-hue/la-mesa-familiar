// 📍 Ruta del archivo: components/games/core/GamePlayersGrid.tsx

import { ReactNode } from "react";

type GamePlayersGridProps = {
  children: ReactNode;
  className?: string;
};

export default function GamePlayersGrid({
  children,
  className = "",
}: GamePlayersGridProps) {
  return (
    <section
      className={`grid grid-cols-1 gap-4 md:grid-cols-2 ${className}`}
    >
      {children}
    </section>
  );
}