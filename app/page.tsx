"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Game = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  min_players: number;
  max_players: number;
  status: "available" | "coming_soon";
  sort_order: number;
};

type HomeStats = {
  activePlayers: number;
  classicGames: number;
  gamesPlayed: number;
};

const DEFAULT_STATS: HomeStats = {
  activePlayers: 0,
  classicGames: 0,
  gamesPlayed: 0,
};

const getPlayerStorageKey = (roomCode: string) => `lmf:player:${roomCode}`;

const savePlayerIdentity = (
  roomCode: string,
  playerName: string,
  isHost: boolean
) => {
  if (typeof window === "undefined") return;

  const payload = JSON.stringify({
    roomCode,
    playerName,
    isHost,
    savedAt: new Date().toISOString(),
  });

  localStorage.setItem(getPlayerStorageKey(roomCode), payload);
  sessionStorage.setItem(getPlayerStorageKey(roomCode), payload);

  const legacyKeys = [
    `la-mesa-player-name-${roomCode}`,
    `mesa-player-name-${roomCode}`,
    `player_name_${roomCode}`,
    `playerName_${roomCode}`,
    `room_player_name_${roomCode}`,
    `roomPlayerName_${roomCode}`,
    "player_name",
    "playerName",
    "nombreJugador",
  ];

  for (const key of legacyKeys) {
    localStorage.setItem(key, playerName);
    sessionStorage.setItem(key, playerName);
  }
};

function generateRoomCode(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function HomePage() {
  const router = useRouter();
  const supabase = createClient();

  const [games, setGames] = useState<Game[]>([]);
  const [stats, setStats] = useState<HomeStats>(DEFAULT_STATS);
  const [selectedGameSlug, setSelectedGameSlug] = useState("piedra-papel-o-tijera");
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const availableGames = useMemo(
    () => games.filter((game) => game.status === "available"),
    [games]
  );

  const selectedGame = useMemo(
    () => games.find((game) => game.slug === selectedGameSlug) ?? null,
    [games, selectedGameSlug]
  );

  const loadGames = useCallback(async () => {
    const { data, error } = await supabase
      .from("games")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error cargando games:", error);
      return;
    }

    const list = (data ?? []) as Game[];
    setGames(list);

    const firstAvailable = list.find((game) => game.status === "available");
    if (firstAvailable) {
      setSelectedGameSlug(firstAvailable.slug);
    }
  }, [supabase]);

  const loadStats = useCallback(async () => {
    const [
      activeRoomsRes,
      gamesCountRes,
      roomsCountRes,
    ] = await Promise.all([
      supabase
        .from("rooms")
        .select("code", { count: "exact" })
        .in("status", ["waiting", "playing"]),
      supabase.from("games").select("id", { count: "exact", head: true }),
      supabase.from("rooms").select("id", { count: "exact", head: true }),
    ]);

    if (activeRoomsRes.error) {
      console.error("Error cargando salas activas:", activeRoomsRes.error);
    }

    if (gamesCountRes.error) {
      console.error("Error contando games:", gamesCountRes.error);
    }

    if (roomsCountRes.error) {
      console.error("Error contando rooms:", roomsCountRes.error);
    }

    let activePlayers = 0;
    const activeRoomCodes = (activeRoomsRes.data ?? []).map((room) => room.code);

    if (activeRoomCodes.length > 0) {
      const roomPlayersRes = await supabase
        .from("room_players")
        .select("id", { count: "exact", head: true })
        .in("room_code", activeRoomCodes);

      if (roomPlayersRes.error) {
        console.error("Error contando jugadores activos:", roomPlayersRes.error);
      } else {
        activePlayers = roomPlayersRes.count ?? 0;
      }
    }

    setStats({
      activePlayers,
      classicGames: gamesCountRes.count ?? 0,
      gamesPlayed: roomsCountRes.count ?? 0,
    });
  }, [supabase]);

  useEffect(() => {
    loadGames();
    loadStats();
  }, [loadGames, loadStats]);

  const handleCreateRoom = async () => {
    if (!selectedGame) {
      setErrorMessage("Primero selecciona un juego disponible.");
      return;
    }

    if (selectedGame.status !== "available") {
      setErrorMessage("Ese juego todavía no está disponible.");
      return;
    }

    try {
      setErrorMessage("");
      setCreating(true);

      let roomCode = "";
      let created = false;
      let attempts = 0;

      while (!created && attempts < 5) {
        attempts += 1;
        roomCode = generateRoomCode();

        const { error: roomError } = await supabase.from("rooms").insert({
          code: roomCode,
          status: "waiting",
          started_at: null,
          game_slug: selectedGame.slug,
        });

        if (roomError) {
          console.error("Error creando room:", roomError);
          continue;
        }

        const { error: playerError } = await supabase.from("room_players").insert({
          room_code: roomCode,
          player_name: "Anfitrión",
          is_host: true,
          is_ready: false,
        });

        if (playerError) {
          console.error("Error creando host:", playerError);
          await supabase.from("rooms").delete().eq("code", roomCode);
          continue;
        }

        savePlayerIdentity(roomCode, "Anfitrión", true);
        created = true;
      }

      if (!created || !roomCode) {
        setErrorMessage("No se pudo crear la sala. Intenta de nuevo.");
        return;
      }

      router.push(`/sala/${roomCode}`);
    } finally {
      setCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    const normalizedCode = joinCode.trim().toUpperCase();

    if (!normalizedCode) {
      setErrorMessage("Ingresa un código de sala.");
      return;
    }

    try {
      setErrorMessage("");
      setJoining(true);

      const { data: room, error: roomError } = await supabase
        .from("rooms")
        .select("code, status, game_slug")
        .eq("code", normalizedCode)
        .maybeSingle();

      if (roomError || !room) {
        setErrorMessage("No encontramos esa sala.");
        return;
      }

      const { data: existingPlayers, error: playersError } = await supabase
        .from("room_players")
        .select("*")
        .eq("room_code", normalizedCode)
        .order("created_at", { ascending: true });

      if (playersError) {
        console.error("Error consultando jugadores:", playersError);
        setErrorMessage("No se pudo validar la sala.");
        return;
      }

      const list = existingPlayers ?? [];

      const guestPlayer = list.find((player) => !player.is_host && player.player_name === "Jugador 1");
      if (guestPlayer) {
        savePlayerIdentity(normalizedCode, "Jugador 1", false);
        router.push(`/sala/${normalizedCode}`);
        return;
      }

      if (list.length >= 2) {
        setErrorMessage("La sala ya está llena.");
        return;
      }

      const { error: insertError } = await supabase.from("room_players").insert({
        room_code: normalizedCode,
        player_name: "Jugador 1",
        is_host: false,
        is_ready: false,
      });

      if (insertError) {
        console.error("Error uniendo jugador:", insertError);
        setErrorMessage("No fue posible unirse a la sala.");
        return;
      }

      savePlayerIdentity(normalizedCode, "Jugador 1", false);
      router.push(`/sala/${normalizedCode}`);
    } finally {
      setJoining(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto max-w-7xl px-6 pb-16 pt-10">
        <div className="mx-auto mb-10 w-fit rounded-full border border-orange-500/20 bg-orange-500/10 px-5 py-2 text-sm text-orange-200">
          ✨ Noche de juegos en familia, donde sea
        </div>

        <div className="mx-auto max-w-5xl text-center">
          <h1 className="text-5xl font-extrabold leading-tight md:text-7xl">
            Jueguen juntos,
            <br />
            <span className="text-orange-500">sigan conectados</span>
          </h1>

          <p className="mx-auto mt-8 max-w-3xl text-xl text-white/70">
            La Mesa Familiar trae tus juegos clásicos favoritos en línea.
            Crea una sala, invita a tu familia y hagan recuerdos juntos—sin importar la distancia.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-3xl gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-orange-500/15 bg-zinc-950/80 p-6">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 text-3xl text-orange-500">
              +
            </div>

            <h2 className="text-3xl font-bold">Crear sala</h2>
            <p className="mt-3 text-white/65">
              Inicia una nueva sesión de juego e invita a tu familia a unirse.
            </p>

            <div className="mt-6">
              <label className="mb-2 block text-sm font-semibold text-white/70">
                Selecciona un juego
              </label>

              <select
                value={selectedGameSlug}
                onChange={(e) => setSelectedGameSlug(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-500/50"
              >
                {games.map((game) => (
                  <option
                    key={game.id}
                    value={game.slug}
                    disabled={game.status !== "available"}
                  >
                    {game.name} {game.status === "coming_soon" ? "— Próximamente" : ""}
                  </option>
                ))}
              </select>

              {selectedGame && (
                <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="font-bold">{selectedGame.name}</p>
                  <p className="mt-1 text-sm text-white/65">
                    {selectedGame.description}
                  </p>
                  <p className="mt-2 text-sm text-orange-300">
                    {selectedGame.min_players}-{selectedGame.max_players} jugadores
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={handleCreateRoom}
              disabled={creating || !selectedGame || selectedGame.status !== "available"}
              className="mt-6 w-full rounded-2xl bg-orange-500 px-5 py-3 text-lg font-bold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? "Creando sala..." : "Crear sala →"}
            </button>
          </div>

          <div className="rounded-3xl border border-orange-500/15 bg-zinc-950/80 p-6">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 text-3xl text-orange-500">
              →
            </div>

            <h2 className="text-3xl font-bold">Unirse a sala</h2>
            <p className="mt-3 text-white/65">
              Ingresa un código de sala para unirte a una sesión existente.
            </p>

            <div className="mt-6 flex gap-3">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="CÓDIGO"
                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black px-4 py-3 text-center tracking-[0.3em] text-white outline-none transition focus:border-orange-500/50"
              />

              <button
                onClick={handleJoinRoom}
                disabled={joining}
                className="rounded-2xl bg-white/10 px-5 py-3 font-bold transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {joining ? "Uniendo..." : "Unirse"}
              </button>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-center text-red-300">
            {errorMessage}
          </div>
        )}

        <div className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-6 border-t border-orange-500/20 pt-10 text-center sm:grid-cols-3">
          <div>
            <p className="text-5xl font-extrabold text-white">{stats.activePlayers}+</p>
            <p className="mt-1 text-white/70">Jugadores activos</p>
          </div>

          <div>
            <p className="text-5xl font-extrabold text-white">{stats.classicGames}</p>
            <p className="mt-1 text-white/70">Juegos clásicos</p>
          </div>

          <div>
            <p className="text-5xl font-extrabold text-white">{stats.gamesPlayed}+</p>
            <p className="mt-1 text-white/70">Partidas jugadas</p>
          </div>
        </div>
      </section>

      <section className="border-t border-orange-500/15 bg-black/70 px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h2 className="text-5xl font-extrabold">Juegos clásicos, experiencia moderna</h2>
            <p className="mx-auto mt-4 max-w-3xl text-xl text-white/65">
              Juega tus juegos tradicionales favoritos con familiares de todo el mundo.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {games.map((game) => (
              <div
                key={game.id}
                className="rounded-3xl border border-orange-500/15 bg-zinc-950/80 p-6"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-2xl font-bold">{game.name}</h3>
                    <p className="mt-2 text-white/65">{game.description}</p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${
                      game.status === "available"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-orange-500/15 text-orange-300"
                    }`}
                  >
                    {game.status === "available" ? "Disponible" : "Próximamente"}
                  </span>
                </div>

                <p className="text-sm text-white/60">
                  {game.min_players}-{game.max_players} jugadores
                </p>

                <div className="mt-5">
                  {game.status === "available" ? (
                    <button
                      onClick={() => {
                        setSelectedGameSlug(game.slug);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="rounded-2xl bg-orange-500 px-4 py-2 font-bold text-black transition hover:bg-orange-400"
                    >
                      Jugar ahora
                    </button>
                  ) : (
                    <div className="inline-flex rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60">
                      Próximamente
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-orange-500/15 px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h2 className="text-5xl font-extrabold">Cómo funciona</h2>
            <p className="mx-auto mt-4 max-w-3xl text-xl text-white/65">
              Empieza en minutos—sin descargas, sin configuración complicada.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                step: "01",
                title: "Crea tu sala",
                text: "Haz clic en 'Crear sala' para generar una sala privada con un código único.",
              },
              {
                step: "02",
                title: "Invita a tu familia",
                text: "Comparte el código de la sala por mensaje, correo o WhatsApp.",
              },
              {
                step: "03",
                title: "Elige un juego",
                text: "Selecciona entre nuestra colección de juegos clásicos y personaliza las opciones.",
              },
              {
                step: "04",
                title: "¡A jugar!",
                text: "Disfruta tiempo de calidad con gameplay en tiempo real.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-3xl border border-orange-500/15 bg-zinc-950/80 p-6"
              >
                <p className="text-sm font-bold tracking-[0.2em] text-orange-400">{item.step}</p>
                <h3 className="mt-6 text-2xl font-bold">{item.title}</h3>
                <p className="mt-4 text-white/65">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
