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

function getRoomCodeFromPath(pathname: string) {
  const roomCode = pathname.split("/juego/")[1]?.split("?")[0]?.trim();

  if (!roomCode) return "";

  return roomCode.toUpperCase();
}

function getPresenceLabel(pathname: string) {
  if (pathname.includes("/juego/")) {
    if (pathname.includes("loteria")) {
      return "Lotería Mexicana";
    }

    if (pathname.includes("ppt")) {
      return "Piedra Papel o Tijera";
    }

    if (pathname.includes("gato")) {
      return "El Gato";
    }

    if (pathname.includes("pregunta")) {
      return "Pregunta Pregunta";
    }

    if (pathname.includes("guerra")) {
      return "Guerra Total";
    }

    if (pathname.includes("personaje")) {
      return "Personaje Secreto";
    }

    if (pathname.includes("domino")) {
      return "Dominó";
    }

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
    const roomCode = getRoomCodeFromPath(pathname);

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
          current_room_code: roomCode,
          current_game_slug: getPresenceLabel(pathname),
        })
        .eq("id", identity.user_id);
    }

    setCurrentGamePresence({
      roomCode,
      gameName: getPresenceLabel(pathname),
    });

    void updateGamePresence();

    const interval = window.setInterval(() => {
      void updateGamePresence();
    }, 45_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);

      // Importante:
      // No limpiamos current_room_code/current_game_slug aquí porque algunos juegos
      // desmontan/remontan el layout y eso borraba la presencia inmediatamente.
      // La limpieza correcta se hará al volver a sala.
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