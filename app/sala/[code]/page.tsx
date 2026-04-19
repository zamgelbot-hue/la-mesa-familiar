"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getAvatarByKey, getFrameByKey } from "@/lib/profileCosmetics";
import RoomChat from "@/components/RoomChat";
import PlayerAvatar from "@/components/PlayerAvatar";
import ShareRoomButton from "@/components/room/ShareRoomButton";

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
  user_id: string | null;
  is_guest: boolean;
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

type ProfileMap = Record<
  string,
  {
    display_name: string | null;
    avatar_key: string | null;
    frame_key: string | null;
    points: number | null;
  }
>;

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
  const [profilesMap, setProfilesMap] = useState<ProfileMap>({});
  const [game, setGame] = useState<Game | null>(null);
  const [currentPlayerName, setCurrentPlayerName] = useState("");
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const currentPlayer = useMemo(() => {
    return sortedPlayers.find((p) => p.player_name === currentPlayerName) ?? null;
  }, [sortedPlayers, currentPlayerName]);

  const isHost = !!currentPlayer?.is_host;

  const fetchProfilesForPlayers = useCallback(
    async (playerList: RoomPlayer[]) => {
      const userIds = Array.from(
        new Set(playerList.map((p) => p.user_id).filter(Boolean))
      ) as string[];

      if (userIds.length === 0) {
        setProfilesMap({});
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_key, frame_key, points")
        .in("id", userIds);

      if (error) {
        console.error("Error cargando perfiles de jugadores:", error);
        return;
      }

      const nextMap: ProfileMap = {};
      for (const profile of data ?? []) {
        nextMap[profile.id] = {
          display_name: profile.display_name,
          avatar_key: profile.avatar_key,
          frame_key: profile.frame_key,
          points: profile.points,
        };
      }

      setProfilesMap(nextMap);
    },
    [supabase]
  );

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
    await fetchProfilesForPlayers(list);

    const storedName = readStoredPlayerName(code);
    if (storedName && list.some((player) => player.player_name === storedName)) {
      setCurrentPlayerName(storedName);
    }

    return list;
  }, [supabase, code, fetchProfilesForPlayers]);

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
              router.replace(`/juego/${code}`);
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
    if (!room) return;

    if (room.status === "playing") {
      router.replace(`/juego/${code}`);
    }
  }, [room?.status, room, router, code]);

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

      router.replace(`/juego/${code}`);
    } finally {
      setStarting(false);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      console.error("Error copiando código:", error);
    }
  };

  const needsIdentitySelection =
    sortedPlayers.length > 0 &&
    (!currentPlayerName ||
      !sortedPlayers.some((player) => player.player_name === currentPlayerName));

  if (loading) {
return (
  <main className="min-h-screen bg-[#0a0a0b] text-white px-4 py-6">
    <div className="mx-auto max-w-7xl">

      {/* BOTÓN VOLVER */}
      <button
        onClick={() => router.push("/")}
        className="mb-6 rounded-xl bg-orange-500 px-5 py-2 font-bold text-black hover:bg-orange-400"
      >
        ← Volver
      </button>

      {/* HEADER */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl mb-6">
        <div className="flex flex-col lg:flex-row lg:justify-between gap-6">

          {/* INFO */}
          <div>
            <h1 className="text-4xl font-extrabold">
              {game?.name ?? "Sala"}
            </h1>

            <p className="text-white/60 mt-1">
              {sortedPlayers.length}/2 jugadores
            </p>

            <div className="flex items-center gap-3 mt-4 flex-wrap">
              <div className="bg-orange-500 text-black px-4 py-2 rounded-xl font-black tracking-widest text-xl">
                {room.code}
              </div>

              <button
                onClick={handleCopyCode}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20"
              >
                {copied ? "Copiado" : "Copiar"}
              </button>

              {/* 🔥 NUEVO */}
              <ShareRoomButton roomCode={room.code} />
            </div>
          </div>

          {/* STATUS */}
          <div className="flex items-center">
            <div
              className={`rounded-2xl px-5 py-4 border ${
                allReady
                  ? "bg-emerald-500/10 border-emerald-400/30"
                  : "bg-orange-500/10 border-orange-400/30"
              }`}
            >
              <p className="font-bold">
                {starting
                  ? "Iniciando..."
                  : allReady
                  ? "Todos listos"
                  : "Esperando jugadores"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* IDENTIDAD */}
      {needsIdentitySelection && (
        <div className="mb-6 p-5 rounded-2xl bg-cyan-500/10 border border-cyan-400/30">
          <p className="font-bold text-cyan-300">
            Selecciona tu jugador
          </p>

          <div className="grid md:grid-cols-2 gap-3 mt-4">
            {sortedPlayers.map((player) => (
              <button
                key={player.id}
                onClick={() => handleSelectIdentity(player.player_name)}
                className="p-4 rounded-xl bg-white/10 hover:bg-white/20 text-left"
              >
                {player.player_name} {player.is_host && "👑"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* LOBBY */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* JUGADORES */}
        <div className="space-y-4">
          {sortedPlayers.map((player) => {
            const isMe = player.player_name === currentPlayerName;

            return (
              <div
                key={player.id}
                className={`rounded-2xl p-5 border transition ${
                  player.is_ready
                    ? "bg-orange-500/10 border-orange-400/30 shadow-[0_0_20px_rgba(249,115,22,0.15)]"
                    : "bg-white/5 border-white/10"
                }`}
              >
                <div className="flex justify-between items-center">

                  {/* INFO */}
                  <div className="flex items-center gap-4">
                    <PlayerAvatar
                      avatar={getAvatarByKey("avatar_sun")}
                      frame={getFrameByKey("frame_orange")}
                      size="md"
                    />

                    <div>
                      <p className="text-xl font-bold">
                        {player.player_name} {player.is_host && "👑"}
                      </p>

                      <p className="text-sm text-white/60">
                        {isMe ? "Tú" : "Jugador"}
                      </p>
                    </div>
                  </div>

                  {/* STATUS */}
                  <div
                    className={`px-4 py-2 rounded-full text-sm font-bold ${
                      player.is_ready
                        ? "bg-emerald-500/20 text-emerald-300 animate-pulse"
                        : "bg-white/10 text-white/60"
                    }`}
                  >
                    {player.is_ready ? "Listo" : "No listo"}
                  </div>
                </div>
              </div>
            );
          })}

          {/* SLOT VACÍO */}
          {sortedPlayers.length < 2 && (
            <div className="rounded-2xl p-6 border border-dashed border-white/10 text-center text-white/50">
              Esperando jugador...
            </div>
          )}
        </div>

        {/* PANEL DERECHO */}
        <div className="space-y-6">

          {/* PREVIEW */}
          <div className="rounded-2xl border border-white/10 p-5 bg-white/5">
            <p className="font-bold mb-3">Preview</p>

            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 16 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded bg-zinc-800"
                />
              ))}
            </div>
          </div>

          {/* ESTADO */}
          <div className="rounded-2xl border border-white/10 p-5 bg-white/5">
            <p className="font-bold">Estado</p>

            <p className="text-white/60 mt-2">
              {allReady
                ? "Todo listo para iniciar"
                : "Esperando que todos estén listos"}
            </p>
          </div>
        </div>
      </div>

      {/* BOTONES */}
      <div className="mt-6 flex gap-3 flex-col sm:flex-row">
        <button
          onClick={handleToggleReady}
          disabled={needsIdentitySelection}
          className="flex-1 py-3 rounded-xl bg-orange-500 text-black font-bold hover:bg-orange-400"
        >
          {players.find(p => p.player_name === currentPlayerName)?.is_ready
            ? "Quitar listo"
            : "Estoy listo"}
        </button>

        <button
          onClick={handleStartGame}
          disabled={!isHost || !allReady || starting}
          className="flex-1 py-3 rounded-xl bg-white text-black font-bold hover:bg-gray-200 disabled:opacity-50"
        >
          {starting ? "Iniciando..." : "Iniciar partida"}
        </button>
      </div>
    </div>

    {/* CHAT (NO SE TOCA) */}
    <RoomChat
      roomCode={code}
      context="lobby"
      currentPlayerName={currentPlayerName}
      currentUserId={currentPlayer?.user_id ?? null}
      isGuest={currentPlayer?.is_guest ?? true}
    />
  </main>
);
  }

  if (!room) {
    return (
      <main className="min-h-screen bg-black px-6 py-8 text-white">
        <div className="mx-auto max-w-6xl rounded-[34px] border border-red-500/20 bg-red-500/10 p-10 text-center">
          <p className="text-3xl font-bold text-red-300">No encontramos esta sala.</p>
          <button
            onClick={() => router.push("/")}
            className="mt-5 rounded-2xl bg-orange-500 px-5 py-3 font-bold text-black"
          >
            Volver al inicio
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <button
          onClick={() => router.push("/")}
          className="mb-6 rounded-2xl bg-orange-500 px-5 py-3 font-bold text-black transition hover:bg-orange-400"
        >
          ← Volver
        </button>

        <div className="rounded-[34px] border border-white/10 bg-zinc-950/90 p-8 shadow-[0_0_40px_rgba(249,115,22,0.05)] md:p-10">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h1 className="text-5xl font-extrabold md:text-6xl">Sala</h1>
              <p className="mt-5 text-2xl font-semibold text-white/90">
                Jugadores ({sortedPlayers.length}) — {allReady ? "Todos listos" : "Esperando"}
              </p>
            </div>

            <div className="flex flex-col gap-4 xl:items-end">
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-2xl bg-orange-500 px-5 py-3 text-2xl font-extrabold text-black shadow-[0_0_25px_rgba(249,115,22,0.18)]">
                  {room.code}
                </div>

                <button
                  onClick={handleCopyCode}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-bold text-white transition hover:bg-white/10"
                >
                  {copied ? "Copiado" : "Copiar código"}
                </button>
              </div>

              {game && (
                <div className="rounded-[28px] border border-orange-500/20 bg-orange-500/10 px-6 py-5 text-right shadow-[0_0_30px_rgba(249,115,22,0.06)]">
                  <p className="text-xs uppercase tracking-[0.3em] text-orange-200">
                    Juego seleccionado
                  </p>
                  <p className="mt-2 text-4xl font-extrabold text-white">
                    {game.name}
                  </p>
                  <p className="mt-2 text-sm text-white/70">
                    {game.min_players}-{game.max_players} jugadores
                  </p>
                </div>
              )}
            </div>
          </div>

          {needsIdentitySelection && (
            <div className="mt-8 rounded-[28px] border border-cyan-400/25 bg-cyan-500/10 p-6">
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
              const profile = player.user_id ? profilesMap[player.user_id] : null;
              const avatar = getAvatarByKey(
                player.is_guest ? "avatar_guest" : profile?.avatar_key ?? "avatar_sun"
              );
              const frame = getFrameByKey(
                player.is_guest ? "frame_guest" : profile?.frame_key ?? "frame_orange"
              );

              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between rounded-[26px] border px-5 py-5 transition ${
                    isMe
                      ? "border-emerald-400/35 bg-emerald-500/10 shadow-[0_0_25px_rgba(16,185,129,0.08)]"
                      : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <PlayerAvatar avatar={avatar} frame={frame} size="md" />

                    <div>
                      <p className="text-3xl font-extrabold">
                        {player.player_name} {player.is_host ? "👑" : ""}
                      </p>
                      <p className="mt-1 text-white/60">
                        {isMe ? "Tú" : player.is_guest ? "Invitado en sala" : "Jugador registrado"}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-5 py-2 text-sm font-bold ${
                      player.is_ready
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-white/10 text-white/60"
                    }`}
                  >
                    {player.is_ready ? "Listo" : "No listo"}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={handleToggleReady}
              disabled={needsIdentitySelection || !currentPlayerName}
              className="rounded-2xl bg-orange-500 px-6 py-3.5 font-bold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {players.find((p) => p.player_name === currentPlayerName)?.is_ready
                ? "Quitar listo"
                : "Estoy listo"}
            </button>

            <button
              onClick={handleStartGame}
              disabled={!isHost || !allReady || sortedPlayers.length < 2 || starting}
              className="rounded-2xl bg-orange-900/70 px-6 py-3.5 font-bold text-orange-100 transition hover:bg-orange-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {starting ? "Iniciando..." : "Iniciar partida"}
            </button>
          </div>
        </div>
      </div>

      <RoomChat
        roomCode={code}
        context="lobby"
        currentPlayerName={currentPlayerName}
        currentUserId={currentPlayer?.user_id ?? null}
        isGuest={currentPlayer?.is_guest ?? true}
      />
    </main>
  );
}
