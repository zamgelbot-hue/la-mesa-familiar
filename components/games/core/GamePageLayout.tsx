// 📍 Ruta del archivo: components/games/core/GamePageLayout.tsx

"use client";

import { ReactNode, useEffect } from "react";
import { usePathname } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { getPlayerIdentity } from "@/lib/profile/getPlayerIdentity";
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
    const roomCode = pathname.split("/juego/")[1]?.split("?")[0];

    if (!roomCode) return;

    const supabase = createClient();
    let cancelled = false;

    async function updateGamePresence() {
      const identity = await getPlayerIdentity();

      if (cancelled) return;
      if (!identity?.user_id || identity.is_guest) return;

      await supabase
        .from("profiles")
        .update({
          last_seen_at: new Date().toISOString(),
          current_room_code: roomCode.toUpperCase(),
          current_game_slug: detectGameName(pathname),
        })
        .eq("id", identity.user_id);
    }

    setCurrentGamePresence({
      roomCode,
      gameName: detectGameName(pathname),
    });

    void updateGamePresence();

    const interval = window.setInterval(() => {
      void updateGamePresence();
    }, 45_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);

      clearCurrentGamePresence();

      void getPlayerIdentity().then((identity) => {
        if (!identity?.user_id || identity.is_guest) return;

        void supabase
          .from("profiles")
          .update({
            current_room_code: null,
            current_game_slug: null,
            last_seen_at: new Date().toISOString(),
          })
          .eq("id", identity.user_id);
      });
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