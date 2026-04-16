"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Room = {
  id: string;
  code: string;
  status: string;
  started_at: string | null;
  game_slug: string | null;
};

type RoomPlayer = {
  id: string;
  room_code: string;
  player_name: string;
  is_host: boolean;
  is_ready: boolean;
  created_at: string;
};

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

const readStoredPlayerName = (roomCode: string) => {
  if (typeof window === "undefined") return "";

  const canonical = localStorage.getItem(getPlayerStorageKey(roomCode));
  if (canonical) {
    try {
      const parsed = JSON.parse(canonical);
      if (parsed?.playerName) return String(parsed.playerName);
    } catch {}
  }

  const sessionCanonical = sessionStorage.getItem(getPlayerStorageKey(roomCode));
  if (sessionCanonical) {
    try {
      const parsed = JSON.parse(sessionCanonical);
      if (parsed?.playerName) return String(parsed.playerName);
    } catch {}
  }

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
    const value = localStorage.getItem(key);
    if (value?.trim()) return value.trim();
  }

  for (const key of legacyKeys) {
    const value = sessionStorage.getItem(key);
    if (value?.trim()) return value.trim();
  }

  return "";
};

export default function SalaPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const code = String(params.code ?? "").toUpperCase();

  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [game, setGame] = useState<Game | null>(null);
  const [currentPlayerName, setCurrentPlayerName] = useState("");
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      if (a.is_host && !b.is_host) return -1;
      if (!a.is_host && b.is_host) return 1;
      return a.created_at.localeCompare(b.created_at);
    });
  }, [players]);

  const allReady = useMemo(() => {
    return sortedPlayers.length >= 2 && sortedPlayers.every((p) => p.is_ready);
  }, [sortedPlayers]);

  const isHost = useMemo(() => {
    const me = sortedPlayers.find((p) => p.player_name === currentPlayerName);
    return !!me?.is_host;
  }, [sortedPlayers, currentPlayerName]);

  const fetchRoom = useCallback(async () => {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (error) {
      console.error("Error cargando room:", error);
      return null;
    }

    if (!data) return null;

    const currentRoom = data as Room;
    setRoom(currentRoom);
    return currentRoom;
  }, [supabase, code]);

  const fetchPlayers = useCallback(async () => {
    const { data, error } = await supabase
      .from("room_players")
      .select("*")
      .eq("room_code", code)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error cargando players:", error);
      return [];
    }

    const list = (data ?? []) as RoomPlayer[];
    setPlayers(list);

    const storedName = readStoredPlayerName(code);
    if (storedName && list.some((player) => player.player_name === storedName)) {
      setCurrentPlayerName(storedName);
    }

    return list;
  }, [supabase, code]);

  const fetchGame = useCallback(
    async (gameSlug?: string | null) => {
      const slugToLoad = gameSlug ?? room?.game_slug;
      if (!slugToLoad) return;

      const { data, error } = await supabase
        .from("games")
        .select("*")
        .eq("slug", slugToLoad)
        .maybeSingle();

      if (error) {
        console.error("Error cargando game:", error);
        return;
      }

      if (data) {
        setGame(data as Game);
      }
    },
    [supabase, room?.game_slug]
  );

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setLoading(true);

      const loadedRoom = await fetchRoom();
      await fetchPlayers();

      if (loadedRoom?.game_slug) {
        await fetchGame(loadedRoom.game_slug);
      }

      if (mounted) {
        setLoading(false);
      }
    };

    if (code) {
      init();
    }

    return () => {
      mounted = false;
    };
  }, [code, fetchRoom, fetchPlayers, fetchGame]);

  useEffect(() => {
    if (!code) return;

    const channel = supabase
      .channel(`sala-${code}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_players",
          filter: `room_code=eq.${code}`,
        },
        async () => {
          await fetchPlayers();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rooms",
          filter: `code=eq.${code}`,
        },
        async (payload) => {
          const nextRoom = payload.new as Room | null;

          if (nextRoom) {
            setRoom(nextRoom);

            if (nextRoom.game_slug) {
              await fetchGame(nextRoom.game_slug);
            }

            if (nextRoom.status === "playing") {
              if (nextRoom.game_slug === "piedra-papel-o-tijera") {
                router.push(`/juego/${code}`);
              }
            }
          } else {
            const freshRoom = await fetchRoom();
            if (freshRoom?.game_slug) {
              await fetchGame(freshRoom.game_slug);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, code, fetchPlayers, fetchRoom, fetchGame, router]);

  useEffect(() => {
    if (!code || !currentPlayerName || players.length === 0) return;

    const me = players.find((p) => p.player_name === currentPlayerName);
    if (!me) return;

    savePlayerIdentity(code, me.player_name, me.is_host);
  }, [code, players, currentPlayerName]);

  const handleSelectIdentity = (playerName: string) => {
    const me = players.find((p) => p.player_name === playerName);
    savePlayerIdentity(code, playerName, !!me?.is_host);
    setCurrentPlayerName(playerName);
  };

  const handleToggleReady = async () => {
    if (!currentPlayerName) return;

    const me = players.find((p) => p.player_name === currentPlayerName);
    if (!me) return;

    const { error } = await supabase
      .from("room_players")
      .update({ is_ready: !me.is_ready })
      .eq("id", me.id);

    if (error) {
      console.error("Error actualizando ready:", error);
    }
  };

  const handleStartGame = async () => {
    if (!room) return;
    if (!isHost) return;
    if (!allReady) return;
    if (sortedPlayers.length < 2) return;

    try {
      setStarting(true);

      const { error } = await supabase
        .from("rooms")
        .update({
          status: "playing",
          started_at: new Date().toISOString(),
        })
        .eq("code", code);

      if (error) {
        console.error("Error iniciando partida:", error);
        return;
      }

      if (room.game_slug === "piedra-papel-o-tijera") {
        router.push(`/juego/${code}`);
      }
    } finally {
      setStarting(false);
    }
  };

  const needsIdentitySelection =
    sortedPlayers.length > 0 &&
    (!currentPlayerName ||
      !sortedPlayers.some((player) => player.player_name === currentPlayerName));

  if (loading) {
    return (
      <main className="min-h-screen bg-black px-6 py-8 text-white">
        <div className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-zinc-950/80 p-8 text-center">
          <p className="text-2xl font-bold">Cargando sala...</p>
        </div>
      </main>
    );
  }

  if (!room) {
    return (
      <main className="min-h-screen bg-black px-6 py-8 text-white">
        <div className="mx-auto max-w-5xl rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-center">
          <p className="text-2xl font-bold text-red-300">No encontramos esta sala.</p>
          <button
            onClick={() => router.push("/")}
            className="mt-4 rounded-2xl bg-orange-500 px-5 py-3 font-bold text-black"
          >
            Volver al inicio
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <button
          onClick={() => router.push("/")}
          className="mb-6 rounded-2xl bg-orange-500 px-5 py-3 font-bold text-black transition hover:bg-orange-400"
        >
          ← Volver
        </button>

        <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-5xl font-extrabold">Sala</h1>
              <p className="mt-4 text-2xl font-semibold text-white/85">
                Jugadores ({sortedPlayers.length}) —{" "}
                {allReady ? "Todos listos" : "Esperando"}
              </p>
            </div>

            <div className="flex flex-col gap-3 lg:items-end">
              <div className="rounded-2xl bg-orange-500 px-5 py-3 text-xl font-extrabold text-black">
                {room.code}
              </div>

              {game && (
                <div className="rounded-2xl border border-orange-500/15 bg-orange-500/10 px-5 py-4 text-right">
                  <p className="text-sm uppercase tracking-[0.2em] text-orange-200">Juego seleccionado</p>
                  <p className="mt-1 text-2xl font-bold text-white">{game.name}</p>
                  <p className="mt-1 text-sm text-white/65">
                    {game.min_players}-{game.max_players} jugadores
                  </p>
                </div>
              )}
            </div>
          </div>

          {needsIdentitySelection && (
            <div className="mt-6 rounded-3xl border border-cyan-400/25 bg-cyan-500/10 p-5">
              <p className="text-lg font-semibold text-cyan-300">
                Este navegador todavía no sabe qué jugador eres
              </p>
              <p className="mt-1 text-white/70">
                Selecciona tu identidad una sola vez en este navegador.
              </p>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {sortedPlayers.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => handleSelectIdentity(player.player_name)}
                    className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4 text-left transition hover:bg-white/15"
                  >
                    <p className="text-lg font-bold">
                      {player.player_name} {player.is_host ? "👑" : ""}
                    </p>
                    <p className="text-sm text-white/60">
                      Usar esta identidad en este navegador
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 space-y-4">
            {sortedPlayers.map((player) => {
              const isMe = player.player_name === currentPlayerName;

              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between rounded-2xl border px-5 py-4 ${
                    isMe
                      ? "border-emerald-400/30 bg-emerald-500/10"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <div>
                    <p className="text-2xl font-bold">
                      {player.player_name} {player.is_host ? "👑" : ""}
                    </p>
                    <p className="mt-1 text-white/60">{isMe ? "Tú" : "Jugador en sala"}</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <span
                      className={`rounded-full px-4 py-2 text-sm font-bold ${
                        player.is_ready
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-white/10 text-white/60"
                      }`}
                    >
                      {player.is_ready ? "Listo" : "No listo"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={handleToggleReady}
              disabled={needsIdentitySelection || !currentPlayerName}
              className="rounded-2xl bg-orange-500 px-6 py-3 font-bold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {players.find((p) => p.player_name === currentPlayerName)?.is_ready
                ? "Quitar listo"
                : "Estoy listo"}
            </button>

            <button
              onClick={handleStartGame}
              disabled={!isHost || !allReady || sortedPlayers.length < 2 || starting}
              className="rounded-2xl bg-orange-900/70 px-6 py-3 font-bold text-orange-100 transition hover:bg-orange-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {starting ? "Iniciando..." : "Iniciar partida"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
