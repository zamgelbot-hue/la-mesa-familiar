"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PPTGame from "@/components/games/piedra-papel-o-tijera/PPTGame";
import LoteriaGame from "@/components/games/loteria-mexicana/LoteriaGame";

type RoomRow = {
  code: string;
  status: string;
  game_slug: string | null;
  game_variant: string | null;
  room_settings: Record<string, any> | null;
};

export default function JuegoPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const code = String(params.code ?? "").toUpperCase();

  const [room, setRoom] = useState<RoomRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadRoom = async () => {
      try {
        setLoading(true);
        setErrorMessage("");

        if (!code) {
          setErrorMessage("Código de sala inválido.");
          return;
        }

        const { data, error } = await supabase
          .from("rooms")
          .select("code, status, game_slug, game_variant, room_settings")
          .eq("code", code)
          .maybeSingle();

        if (error) {
          console.error("Error cargando room:", error);
          if (!cancelled) {
            setErrorMessage("No se pudo cargar la sala.");
          }
          return;
        }

        if (!data) {
          if (!cancelled) {
            setErrorMessage("No encontramos esta sala.");
          }
          return;
        }

        if (!cancelled) {
          setRoom(data as RoomRow);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadRoom();

    const channel = supabase
      .channel(`juego-room-dispatcher-${code}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rooms",
          filter: `code=eq.${code}`,
        },
        async () => {
          const { data, error } = await supabase
            .from("rooms")
            .select("code, status, game_slug, game_variant, room_settings")
            .eq("code", code)
            .maybeSingle();

          if (error) {
            console.error("Error refrescando room:", error);
            return;
          }

          if (!cancelled) {
            setRoom((data ?? null) as RoomRow | null);
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [supabase, code]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black px-6 py-12 text-white">
        <div className="mx-auto max-w-4xl rounded-[32px] border border-orange-500/15 bg-zinc-950/90 p-10 text-center shadow-[0_0_40px_rgba(249,115,22,0.05)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-300/80">
            La Mesa Familiar
          </p>
          <h1 className="mt-3 text-3xl font-extrabold">Cargando partida...</h1>
        </div>
      </main>
    );
  }

  if (errorMessage || !room) {
    return (
      <main className="min-h-screen bg-black px-6 py-12 text-white">
        <div className="mx-auto max-w-4xl rounded-[32px] border border-red-500/20 bg-zinc-950/90 p-10 text-center shadow-[0_0_40px_rgba(239,68,68,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-300/80">
            Error
          </p>
          <h1 className="mt-3 text-3xl font-extrabold">
            {errorMessage || "No se pudo abrir la partida."}
          </h1>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              Ir al inicio
            </button>

            <button
              type="button"
              onClick={() => router.push(`/sala/${code}`)}
              className="rounded-2xl bg-orange-500 px-5 py-3 font-bold text-black transition hover:bg-orange-400"
            >
              Volver a sala
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (room.game_slug === "piedra-papel-o-tijera") {
    return (
      <PPTGame
        roomCode={code}
        roomVariant={room.game_variant}
        roomSettings={room.room_settings}
      />
    );
  }

  if (room.game_slug === "loteria-mexicana") {
    return <LoteriaGame roomCode={code} />;
  }

  return (
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto max-w-4xl rounded-[32px] border border-yellow-500/20 bg-zinc-950/90 p-10 text-center shadow-[0_0_40px_rgba(234,179,8,0.06)]">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-yellow-300/80">
          Juego no disponible
        </p>
        <h1 className="mt-3 text-3xl font-extrabold">
          Este juego aún no está conectado al sistema de partidas.
        </h1>

        <p className="mt-4 text-white/65">
          Sala: <span className="font-bold text-orange-300">{code}</span>
        </p>

        <p className="mt-2 text-white/65">
          game_slug:{" "}
          <span className="font-bold text-white">
            {room.game_slug ?? "sin definir"}
          </span>
        </p>

        <div className="mt-6">
          <button
            type="button"
            onClick={() => router.push(`/sala/${code}`)}
            className="rounded-2xl bg-orange-500 px-5 py-3 font-bold text-black transition hover:bg-orange-400"
          >
            Volver a sala
          </button>
        </div>
      </div>
    </main>
  );
}
