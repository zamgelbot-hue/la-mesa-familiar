// 📍 Ruta del archivo: components/games/core/GamePageLayout.tsx

"use client";

import { ReactNode, useEffect } from "react";
import { usePathname } from "next/navigation";

import {
  clearCurrentGamePresence,
  setCurrentGamePresence,
} from "@/lib/games/gameNavigation";

type GamePageLayoutProps = {
  children: ReactNode;
  className?: string;
};

function detectGameName(pathname: string) {
  if (pathname.includes("/juego/")) {
    return "En partida";
  }

  return "Jugando";
}

export default function GamePageLayout({
  children,
  className = "",
}: GamePageLayoutProps) {
  const pathname = usePathname();

  useEffect(() => {
    const roomCode = pathname.split("/juego/")[1];

    if (!roomCode) return;

    setCurrentGamePresence({
      roomCode,
      gameName: detectGameName(pathname),
    });

    return () => {
      clearCurrentGamePresence();
    };
  }, [pathname]);

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