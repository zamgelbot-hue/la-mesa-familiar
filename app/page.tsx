"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getPlayerIdentity, type PlayerIdentity } from "@/lib/getPlayerIdentity";

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
  const [signingOut, setSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [playerIdentity, setPlayerIdentity] = useState<PlayerIdentity | null>(null);

  const selectedGame = useMemo(
    () => games.find((game) => game.slug === selectedGameSlug) ?? null,
    [games, selectedGameSlug]
  );

  const loadPlayerIdentity = useCallback(async () => {
    const identity = await getPlayerIdentity();
    setPlayerIdentity(identity);
  }, []);

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
    const [activeRoomsRes, gamesCountRes, roomsCountRes] = await Promise.all([
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
    loadPlayerIdentity();
  }, [loadGames, loadStats, loadPlayerIdentity]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadPlayerIdentity();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, loadPlayerIdentity]);

  const handleCreateRoom = async () => {
    if (!selectedGame) {
      setErrorMessage("Primero selecciona un juego disponible.");
      return;
    }

    if (selectedGame.status !== "available") {
      setErrorMessage("Ese juego todavía no está disponible.");
      return;
    }

    if (!playerIdentity) {
      setErrorMessage("Primero inicia sesión o entra como invitado.");
      router.push("/acceso");
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
          player_name: playerIdentity.name,
          is_host: true,
          is_ready: false,
          user_id: playerIdentity.user_id,
          is_guest: playerIdentity.is_guest,
        });

        if (playerError) {
          console.error("Error creando host:", playerError);
          await supabase.from("rooms").delete().eq("code", roomCode);
          continue;
        }

        savePlayerIdentity(roomCode, playerIdentity.name, true);
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

    if (!playerIdentity) {
      setErrorMessage("Primero inicia sesión o entra como invitado.");
      router.push("/acceso");
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

      const existingMe = list.find((player) => {
        if (player.user_id && playerIdentity.user_id) {
          return player.user_id === playerIdentity.user_id;
        }
        return !player.user_id && player.player_name === playerIdentity.name;
      });

      if (existingMe) {
        savePlayerIdentity(normalizedCode, existingMe.player_name, !!existingMe.is_host);
        router.push(`/sala/${normalizedCode}`);
        return;
      }

      if (list.length >= 2) {
        setErrorMessage("La sala ya está llena.");
        return;
      }

      let finalName = playerIdentity.name;

      const nameAlreadyUsed = list.some((player) => player.player_name === finalName);
      if (nameAlreadyUsed) {
        finalName = `${playerIdentity.name} 2`;
      }

      const { error: insertError } = await supabase.from("room_players").insert({
        room_code: normalizedCode,
        player_name: finalName,
        is_host: false,
        is_ready: false,
        user_id: playerIdentity.user_id,
        is_guest: playerIdentity.is_guest,
      });

      if (insertError) {
        console.error("Error uniendo jugador:", insertError);
        setErrorMessage("No fue posible unirse a la sala.");
        return;
      }

      savePlayerIdentity(normalizedCode, finalName, false);
      router.push(`/sala/${normalizedCode}`);
    } finally {
      setJoining(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setSigningOut(true);

      await supabase.auth.signOut();

      if (typeof window !== "undefined") {
        localStorage.removeItem("lmf:guest-profile");
        sessionStorage.removeItem("lmf:guest-profile");
      }

      setPlayerIdentity(null);
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-50 border-b border-orange-500/10 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500 text-black shadow-[0_0_30px_rgba(249,115,22,0.25)]">
              <span className="text-lg font-black">◌</span>
            </div>
            <span className="text-xl font-bold">La Mesa Familiar</span>
          </div>

          <nav className="hidden items-center gap-10 text-white/70 md:flex">
            <a href="#juegos" className="transition hover:text-white">
              Juegos
            </a>
            <a href="#como-funciona" className="transition hover:text-white">
              Cómo funciona
            </a>
            <a href="#funciones" className="transition hover:text-white">
              Funciones
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {!playerIdentity ? (
              <>
                <button
                  type="button"
                  onClick={() => router.push("/acceso")}
                  className="hidden rounded-2xl px-4 py-2 font-semibold text-white transition hover:bg-white/5 md:block"
                >
                  Iniciar sesión
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/acceso")}
                  className="rounded-2xl bg-orange-500 px-5 py-2.5 font-bold text-black transition hover:bg-orange-400"
                >
                  Empezar
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push("/perfil")}
                  className="hidden rounded-2xl border border-white/10 bg-white/5 px-4 py-2 font-semibold text-white transition hover:bg-white/10 md:block"
                >
                  👤 {playerIdentity.name} {playerIdentity.is_guest ? "(Invitado)" : ""}
                </button>

                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="rounded-2xl bg-orange-500 px-5 py-2.5 font-bold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {signingOut ? "Saliendo..." : "Cerrar sesión"}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden px-6 pb-14 pt-16">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-orange-500/10 blur-3xl" />
          <div className="absolute left-[15%] top-[20%] h-40 w-40 rounded-full bg-red-500/10 blur-3xl" />
          <div className="absolute right-[10%] top-[18%] h-48 w-48 rounded-full bg-amber-500/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl">
          <div className="mx-auto mb-8 w-fit rounded-full border border-orange-500/20 bg-orange-500/10 px-5 py-2 text-sm text-orange-200 shadow-[0_0_25px_rgba(249,115,22,0.08)]">
            ✨ Noche de juegos en familia, donde sea
          </div>

          <div className="mx-auto max-w-5xl text-center">
            <h1 className="text-5xl font-extrabold leading-tight md:text-7xl">
              Jueguen juntos,
              <br />
              <span className="text-orange-500">sigan conectados</span>
            </h1>

            <p className="mx-auto mt-8 max-w-3xl text-xl leading-relaxed text-white/70">
              La Mesa Familiar trae tus juegos clásicos favoritos en línea. Crea una sala,
              invita a tu familia y hagan recuerdos juntos sin importar la distancia.
            </p>

            {playerIdentity && (
              <div className="mx-auto mt-6 inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
                Jugando como: {playerIdentity.name} {playerIdentity.is_guest ? "(Invitado)" : ""}
              </div>
            )}
          </div>

          <div className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-2">
            <div className="rounded-[30px] border border-orange-500/15 bg-zinc-950/90 p-7 shadow-[0_0_40px_rgba(249,115,22,0.05)] transition hover:border-orange-500/25 hover:shadow-[0_0_60px_rgba(249,115,22,0.08)]">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-500/10 text-4xl text-orange-500">
                +
              </div>

              <h2 className="text-3xl font-bold">Crear sala</h2>
              <p className="mt-3 text-base leading-relaxed text-white/65">
                Inicia una nueva sesión de juego e invita a tu familia a unirse.
              </p>

              {!playerIdentity && (
                <div className="mt-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
                  Para crear una sala primero inicia sesión o entra como invitado.
                </div>
              )}

              <div className="mt-6">
                <label className="mb-2 block text-sm font-semibold uppercase tracking-[0.18em] text-white/60">
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
                  <div className="mt-4 rounded-3xl border border-orange-500/15 bg-orange-500/5 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xl font-bold">{selectedGame.name}</p>
                        <p className="mt-2 text-sm leading-relaxed text-white/65">
                          {selectedGame.description}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${
                          selectedGame.status === "available"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-orange-500/15 text-orange-300"
                        }`}
                      >
                        {selectedGame.status === "available" ? "Disponible" : "Próximamente"}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-orange-300">
                      {selectedGame.min_players}-{selectedGame.max_players} jugadores
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={handleCreateRoom}
                disabled={
                  creating ||
                  !selectedGame ||
                  selectedGame.status !== "available" ||
                  !playerIdentity
                }
                className="mt-6 w-full rounded-2xl bg-orange-500 px-5 py-3.5 text-lg font-bold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating ? "Creando sala..." : "Crear sala →"}
              </button>
            </div>

            <div className="rounded-[30px] border border-orange-500/15 bg-zinc-950/90 p-7 shadow-[0_0_40px_rgba(249,115,22,0.05)] transition hover:border-orange-500/25 hover:shadow-[0_0_60px_rgba(249,115,22,0.08)]">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-500/10 text-4xl text-orange-500">
                →
              </div>

              <h2 className="text-3xl font-bold">Unirse a sala</h2>
              <p className="mt-3 text-base leading-relaxed text-white/65">
                Ingresa un código de sala para unirte a una sesión existente.
              </p>

              {!playerIdentity && (
                <div className="mt-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
                  Para unirte a una sala primero inicia sesión o entra como invitado.
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="CÓDIGO"
                  className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black px-4 py-3 text-center tracking-[0.3em] text-white outline-none transition focus:border-orange-500/50"
                />

                <button
                  onClick={handleJoinRoom}
                  disabled={joining || !playerIdentity}
                  className="rounded-2xl bg-white/10 px-5 py-3 font-bold transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {joining ? "Uniendo..." : "Unirse"}
                </button>
              </div>

              <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-sm uppercase tracking-[0.18em] text-white/50">
                  Consejo rápido
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/65">
                  Comparte el código exacto de la sala con tu familia. En cuanto entren,
                  podrán marcarse como listos y comenzar la partida.
                </p>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="mx-auto mt-6 max-w-4xl rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-center text-red-300">
              {errorMessage}
            </div>
          )}

          <div className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-6 border-t border-orange-500/15 pt-10 text-center sm:grid-cols-3">
            <div className="rounded-3xl bg-white/[0.02] px-4 py-6">
              <p className="text-5xl font-extrabold text-white">{stats.activePlayers}+</p>
              <p className="mt-1 text-white/70">Jugadores activos</p>
            </div>

            <div className="rounded-3xl bg-white/[0.02] px-4 py-6">
              <p className="text-5xl font-extrabold text-white">{stats.classicGames}</p>
              <p className="mt-1 text-white/70">Juegos clásicos</p>
            </div>

            <div className="rounded-3xl bg-white/[0.02] px-4 py-6">
              <p className="text-5xl font-extrabold text-white">{stats.gamesPlayed}+</p>
              <p className="mt-1 text-white/70">Partidas jugadas</p>
            </div>
          </div>
        </div>
      </section>

      <section id="juegos" className="border-t border-orange-500/10 px-6 py-16">
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
                className="group rounded-[28px] border border-orange-500/15 bg-zinc-950/90 p-6 transition hover:-translate-y-1 hover:border-orange-500/30 hover:shadow-[0_0_40px_rgba(249,115,22,0.06)]"
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-400">
                    {game.status === "available" ? "▶" : "◻"}
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${
                      game.status === "available"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-orange-500/15 text-orange-300"
                    }`}
                  >
                    {game.status === "available" ? "Disponible" : "Próximamente"}
                  </span>
                </div>

                <h3 className="text-2xl font-bold">{game.name}</h3>
                <p className="mt-3 min-h-[52px] text-white/65">{game.description}</p>

                <div className="mt-4 inline-flex rounded-full bg-white/[0.04] px-3 py-1 text-sm text-white/60">
                  {game.min_players}-{game.max_players} jugadores
                </div>

                <div className="mt-6">
                  {game.status === "available" ? (
                    <button
                      onClick={() => {
                        setSelectedGameSlug(game.slug);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="rounded-2xl bg-orange-500 px-4 py-2.5 font-bold text-black transition hover:bg-orange-400"
                    >
                      Jugar ahora
                    </button>
                  ) : (
                    <div className="inline-flex rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/60">
                      Próximamente
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="como-funciona" className="border-t border-orange-500/10 bg-black/60 px-6 py-16">
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
                text: "Comparte el código de la sala con tu familia por mensaje, correo o WhatsApp.",
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
                className="rounded-[28px] border border-orange-500/15 bg-zinc-950/90 p-6"
              >
                <p className="text-sm font-bold tracking-[0.25em] text-orange-400">{item.step}</p>
                <div className="mt-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-400">
                  ◆
                </div>
                <h3 className="mt-5 text-2xl font-bold">{item.title}</h3>
                <p className="mt-3 text-white/65">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="funciones" className="border-t border-orange-500/10 px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h2 className="text-5xl font-extrabold">Hecho para la diversión familiar</h2>
            <p className="mx-auto mt-4 max-w-3xl text-xl text-white/65">
              Todo lo que necesitas para la noche de juegos perfecta.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[
              {
                title: "Videollamada integrada",
                text: "Ve a tus seres queridos mientras juegas con videollamada incluida.",
              },
              {
                title: "Juega desde cualquier lugar",
                text: "Funciona en cualquier dispositivo con navegador—sin descargar nada.",
              },
              {
                title: "Privado y seguro",
                text: "Tus salas familiares son privadas y encriptadas de extremo a extremo.",
              },
              {
                title: "Optimizado para móvil",
                text: "Diseñado para celulares y tablets para jugar donde sea.",
              },
              {
                title: "Empieza al instante",
                text: "No necesitas cuenta para unirte. Solo entra y juega.",
              },
              {
                title: "Hecho para familias",
                text: "Juegos para todas las edades en un ambiente seguro.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[28px] border border-orange-500/15 bg-zinc-950/90 p-6"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-400">
                  ●
                </div>
                <h3 className="mt-5 text-2xl font-bold">{item.title}</h3>
                <p className="mt-3 text-white/65">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-orange-500/10 px-6 py-12 text-white/60">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500 text-black">
                <span className="text-lg font-black">◌</span>
              </div>
              <span className="text-xl font-bold text-white">La Mesa Familiar</span>
            </div>
            <p className="mt-4 leading-relaxed">
              Uniéndo familias a través de la alegría de los juegos clásicos, sin importar la distancia.
            </p>
          </div>

          <div>
            <p className="mb-4 font-bold text-white">Juegos</p>
            <div className="space-y-2">
              {games.slice(0, 4).map((game) => (
                <p key={game.id}>{game.name}</p>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-4 font-bold text-white">Ayuda</p>
            <div className="space-y-2">
              <p>Centro de ayuda</p>
              <p>Contáctanos</p>
              <p>Preguntas frecuentes</p>
            </div>
          </div>

          <div>
            <p className="mb-4 font-bold text-white">Legal</p>
            <div className="space-y-2">
              <p>Política de privacidad</p>
              <p>Términos de servicio</p>
              <p>Política de cookies</p>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-3 border-t border-white/10 pt-6 text-sm md:flex-row md:items-center md:justify-between">
          <p>© 2026 La Mesa Familiar. Todos los derechos reservados.</p>
          <div className="flex gap-5">
            <span>Twitter</span>
            <span>Instagram</span>
            <span>Facebook</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
