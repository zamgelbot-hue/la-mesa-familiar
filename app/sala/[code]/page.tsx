"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getPlayerIdentity, type PlayerIdentity } from "@/lib/getPlayerIdentity";
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
  max_players: number | null;
  game_variant: string | null;
  room_settings: Record<string, unknown> | null;
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

function LoadingView() {
  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl rounded-[34px] border border-white/10 bg-zinc-950/90 p-10 text-center shadow-[0_0_40px_rgba(249,115,22,0.04)]">
        <p className="text-3xl font-bold">Cargando sala...</p>
      </div>
    </main>
  );
}

function getVariantLabel(gameSlug?: string | null, variantKey?: string | null) {
  if (!variantKey) return "Sin variante";

  if (gameSlug === "loteria-mexicana") {
    const loteriaMap: Record<string, string> = {
      clasica: "Clásica",
      "familia-palomares": "Familia Palomares",
      "comidas-mexicanas": "Comidas Mexicanas",
    };

    return loteriaMap[variantKey] ?? variantKey;
  }

  if (gameSlug === "piedra-papel-o-tijera") {
    const pptMap: Record<string, string> = {
      bo3: "Mejor 2 de 3",
      bo5: "Mejor 3 de 5",
      bo7: "Mejor 4 de 7",
    };

    return pptMap[variantKey] ?? variantKey;
  }

  return variantKey;
}

export default function SalaPage() {
  const params = useParams();
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const code = String(params.code ?? "").toUpperCase();

  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [profilesMap, setProfilesMap] = useState<ProfileMap>({});
  const [game, setGame] = useState<Game | null>(null);
  const [playerIdentity, setPlayerIdentity] = useState<PlayerIdentity | null>(null);
  const [currentPlayerName, setCurrentPlayerName] = useState("");
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [joiningInvite, setJoiningInvite] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const autoJoinAttemptedRef = useRef(false);

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      if (a.is_host && !b.is_host) return -1;
      if (!a.is_host && b.is_host) return 1;
      return a.created_at.localeCompare(b.created_at);
    });
  }, [players]);

  const currentPlayer = useMemo(() => {
    return sortedPlayers.find((p) => p.player_name === currentPlayerName) ?? null;
  }, [sortedPlayers, currentPlayerName]);

  const isHost = !!currentPlayer?.is_host;
  const roomMaxPlayers = room?.max_players ?? game?.max_players ?? 2;
  const minPlayersToStart = game?.min_players ?? 2;
  const variantLabel = getVariantLabel(room?.game_slug, room?.game_variant);

  const allReady = useMemo(() => {
    return (
      sortedPlayers.length >= minPlayersToStart &&
      sortedPlayers.every((p) => p.is_ready)
    );
  }, [sortedPlayers, minPlayersToStart]);

  const loadPlayerIdentity = useCallback(async () => {
    try {
      const identity = await getPlayerIdentity();
      setPlayerIdentity(identity);
      return identity;
    } catch (error) {
      console.error("Error cargando identidad:", error);
      setPlayerIdentity(null);
      return null;
    }
  }, []);

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

    const nextRoom = (data ?? null) as Room | null;
    setRoom(nextRoom);
    return nextRoom;
  }, [supabase, code]);

  const fetchGame = useCallback(
    async (gameSlug?: string | null) => {
      const slugToLoad = gameSlug ?? room?.game_slug;
      if (!slugToLoad) return null;

      const { data, error } = await supabase
        .from("games")
        .select("*")
        .eq("slug", slugToLoad)
        .maybeSingle();

      if (error) {
        console.error("Error cargando game:", error);
        return null;
      }

      const nextGame = (data ?? null) as Game | null;
      setGame(nextGame);
      return nextGame;
    },
    [supabase, room?.game_slug]
  );

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
        console.error("Error cargando perfiles:", error);
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

  const resolveCurrentPlayerFromList = useCallback(
    (playerList: RoomPlayer[], identity: PlayerIdentity | null) => {
      if (identity?.user_id) {
        const authMatched = playerList.find((p) => p.user_id === identity.user_id);
        if (authMatched) {
          setCurrentPlayerName(authMatched.player_name);
          savePlayerIdentity(code, authMatched.player_name, authMatched.is_host);
          return authMatched.player_name;
        }
      }

      if (identity?.is_guest && identity.name) {
        const guestMatched = playerList.find(
          (p) => p.is_guest && !p.user_id && p.player_name === identity.name
        );
        if (guestMatched) {
          setCurrentPlayerName(guestMatched.player_name);
          savePlayerIdentity(code, guestMatched.player_name, guestMatched.is_host);
          return guestMatched.player_name;
        }
      }

      const storedName = readStoredPlayerName(code);
      if (storedName && playerList.some((p) => p.player_name === storedName)) {
        setCurrentPlayerName(storedName);
        return storedName;
      }

      setCurrentPlayerName("");
      return "";
    },
    [code]
  );

  const fetchPlayers = useCallback(
    async (identityOverride?: PlayerIdentity | null) => {
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
      resolveCurrentPlayerFromList(list, identityOverride ?? playerIdentity);

      return list;
    },
    [supabase, code, fetchProfilesForPlayers, resolveCurrentPlayerFromList, playerIdentity]
  );

  const autoJoinIfNeeded = useCallback(
    async (currentRoom: Room | null, currentPlayers: RoomPlayer[], identity: PlayerIdentity | null) => {
      if (!currentRoom) return false;
      if (!identity) return false;
      if (currentRoom.status !== "waiting") return false;
      if (autoJoinAttemptedRef.current) return false;

      const alreadyInRoom = currentPlayers.some((player) => {
        if (identity.user_id && player.user_id) {
          return player.user_id === identity.user_id;
        }

        if (identity.is_guest && !player.user_id) {
          return player.player_name === identity.name;
        }

        return false;
      });

      if (alreadyInRoom) {
        resolveCurrentPlayerFromList(currentPlayers, identity);
        autoJoinAttemptedRef.current = true;
        return false;
      }

      const capacity = Number(currentRoom.max_players ?? 2);
      if (currentPlayers.length >= capacity) {
        autoJoinAttemptedRef.current = true;
        return false;
      }

      try {
        setJoiningInvite(true);
        autoJoinAttemptedRef.current = true;

        let finalName = identity.name;
        let suffix = 2;
        while (currentPlayers.some((p) => p.player_name === finalName)) {
          finalName = `${identity.name} ${suffix}`;
          suffix += 1;
        }

        const { error } = await supabase.from("room_players").insert({
          room_code: currentRoom.code,
          player_name: finalName,
          is_host: false,
          is_ready: false,
          user_id: identity.user_id,
          is_guest: identity.is_guest,
        });

        if (error) {
          console.error("Error auto-uniendo jugador:", error);
          return false;
        }

        savePlayerIdentity(currentRoom.code, finalName, false);
        setCurrentPlayerName(finalName);
        return true;
      } finally {
        setJoiningInvite(false);
      }
    },
    [supabase, resolveCurrentPlayerFromList]
  );

  useEffect(() => {
    let active = true;

    const timeout = window.setTimeout(() => {
      if (active) {
        setLoading(false);
        setErrorMessage("La sala tardó demasiado en cargar. Intenta recargar.");
      }
    }, 10000);

    const init = async () => {
      setLoading(true);
      setErrorMessage("");
      autoJoinAttemptedRef.current = false;

      try {
        const identity = await loadPlayerIdentity();
        if (!active) return;

        const loadedRoom = await fetchRoom();
        if (!active) return;

        const loadedPlayers = await fetchPlayers(identity);
        if (!active) return;

        if (loadedRoom?.game_slug) {
          await fetchGame(loadedRoom.game_slug);
        }

        const joined = await autoJoinIfNeeded(loadedRoom, loadedPlayers, identity);
        if (!active) return;

        if (joined) {
          await fetchPlayers(identity);
        }
      } catch (error) {
        console.error("Error inicializando sala:", error);
        if (active) {
          setErrorMessage("No se pudo cargar la sala correctamente.");
        }
      } finally {
        if (active) {
          window.clearTimeout(timeout);
          setLoading(false);
        }
      }
    };

    if (code) {
      void init();
    }

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [code, loadPlayerIdentity, fetchRoom, fetchPlayers, fetchGame, autoJoinIfNeeded]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async () => {
      const identity = await loadPlayerIdentity();
      await fetchPlayers(identity);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, loadPlayerIdentity, fetchPlayers]);

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
          await fetchPlayers(playerIdentity);
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
  }, [supabase, code, fetchPlayers, fetchRoom, fetchGame, router, playerIdentity]);

  useEffect(() => {
    if (room?.status === "playing") {
      router.replace(`/juego/${code}`);
    }
  }, [room?.status, router, code]);

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
    if (!room || !isHost || !allReady || sortedPlayers.length < minPlayersToStart) return;

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

  const needsAccess = !playerIdentity && !currentPlayerName;

  const needsIdentitySelection =
    !needsAccess &&
    sortedPlayers.length > 0 &&
    (!currentPlayerName ||
      !sortedPlayers.some((player) => player.player_name === currentPlayerName));

  if (loading) {
    return <LoadingView />;
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
    <main className="min-h-screen bg-[#0a0a0b] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <button
          onClick={() => router.push("/")}
          className="mb-6 rounded-2xl bg-orange-500 px-5 py-3 font-bold text-black transition hover:bg-orange-400"
        >
          ← Volver
        </button>

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-300">
            {errorMessage}
          </div>
        )}

        <div className="relative overflow-hidden rounded-[34px] border border-white/10 bg-zinc-950/90 p-6 shadow-[0_0_40px_rgba(249,115,22,0.05)] md:p-8">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-[-120px] h-[260px] w-[260px] -translate-x-1/2 rounded-full bg-orange-500/10 blur-3xl" />
            <div className="absolute bottom-[-80px] right-[-40px] h-[220px] w-[220px] rounded-full bg-orange-400/10 blur-3xl" />
          </div>

          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="inline-flex items-center rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-200">
                Lobby
              </div>

              <h1 className="mt-4 text-4xl font-extrabold md:text-5xl">
                {game?.name ?? "Sala"}
              </h1>

              <p className="mt-3 text-base text-white/70 md:text-lg">
                {sortedPlayers.length}/{roomMaxPlayers} jugadores —{" "}
                {joiningInvite
                  ? "Uniéndote a la sala..."
                  : starting
                  ? "Iniciando partida..."
                  : allReady
                  ? "Todos listos"
                  : sortedPlayers.length < minPlayersToStart
                  ? "Esperando jugadores..."
                  : "Esperando confirmación"}
              </p>

              <p className="mt-2 text-sm text-orange-200">
                Variante activa: <span className="font-bold text-white">{variantLabel}</span>
              </p>
            </div>

            <div className="flex flex-col gap-4 xl:items-end">
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-2xl bg-orange-500 px-5 py-3 text-xl font-extrabold tracking-[0.25em] text-black shadow-[0_0_25px_rgba(249,115,22,0.18)] sm:text-2xl">
                  {room.code}
                </div>

                <button
                  onClick={handleCopyCode}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-bold text-white transition hover:bg-white/10"
                >
                  {copied ? "Copiado" : "Copiar código"}
                </button>

                <ShareRoomButton
                  roomCode={room.code}
                  roomUrl={
                    typeof window !== "undefined"
                      ? `${window.location.origin}/sala/${room.code}`
                      : undefined
                  }
                  gameName={game?.name ?? "La Mesa Familiar"}
                />
              </div>
            </div>
          </div>

          {needsAccess && (
            <div className="relative mt-8 rounded-[28px] border border-cyan-400/25 bg-cyan-500/10 p-6">
              <p className="text-lg font-semibold text-cyan-300">
                Para unirte a esta sala primero necesitas una identidad activa
              </p>
              <p className="mt-1 text-white/70">
                Puedes iniciar sesión, crear tu cuenta o entrar como invitado.
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href={`/acceso?next=${encodeURIComponent(`/sala/${code}`)}`}
                  className="rounded-2xl bg-orange-500 px-5 py-3 font-bold text-black transition hover:bg-orange-400"
                >
                  Continuar
                </Link>

                <Link
                  href="/"
                  className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-bold text-white transition hover:bg-white/10"
                >
                  Volver al inicio
                </Link>
              </div>
            </div>
          )}

          {needsIdentitySelection && (
            <div className="relative mt-8 rounded-[28px] border border-cyan-400/25 bg-cyan-500/10 p-6">
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

          <div className="relative mt-8 grid gap-6 xl:grid-cols-[1.25fr_0.85fr]">
            <div className="space-y-4">
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
                    className={`rounded-[26px] border px-5 py-5 transition ${
                      player.is_ready
                        ? "border-orange-400/30 bg-orange-500/10 shadow-[0_0_25px_rgba(249,115,22,0.12)]"
                        : isMe
                        ? "border-emerald-400/35 bg-emerald-500/10 shadow-[0_0_25px_rgba(16,185,129,0.08)]"
                        : "border-white/10 bg-white/[0.03]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-4">
                        <PlayerAvatar avatar={avatar} frame={frame} size="md" />

                        <div className="min-w-0">
                          <p className="truncate text-2xl font-extrabold md:text-3xl">
                            {player.player_name} {player.is_host ? "👑" : ""}
                          </p>
                          <p className="mt-1 text-sm text-white/60 md:text-base">
                            {isMe
                              ? "Tú"
                              : player.is_guest
                              ? "Invitado en sala"
                              : "Jugador registrado"}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-5 py-2 text-sm font-bold ${
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

              {Array.from({
                length: Math.max(roomMaxPlayers - sortedPlayers.length, 0),
              }).map((_, index) => (
                <div
                  key={`empty-slot-${index}`}
                  className="rounded-[26px] border border-dashed border-white/10 bg-white/[0.03] px-5 py-8 text-center text-white/50"
                >
                  Esperando jugador...
                </div>
              ))}
            </div>

            <div className="space-y-6">
              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-200">
                  Preview
                </p>

                <div className="mt-4 rounded-2xl border border-white/10 bg-zinc-800/60 p-6 text-center">
                  <p className="text-lg font-bold text-white">
                    {game?.name ?? "Juego"}
                  </p>
                  <p className="mt-2 text-sm text-white/60">
                    Variante activa: {variantLabel}
                  </p>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-200">
                  Estado
                </p>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                    <span className="text-sm text-white/60">Jugadores conectados</span>
                    <span className="font-bold">
                      {sortedPlayers.length}/{roomMaxPlayers}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                    <span className="text-sm text-white/60">Juego</span>
                    <span className="font-bold">{game?.name ?? "Sin seleccionar"}</span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                    <span className="text-sm text-white/60">Variante</span>
                    <span className="font-bold">{variantLabel}</span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                    <span className="text-sm text-white/60">Mínimo para iniciar</span>
                    <span className="font-bold">{minPlayersToStart}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {!needsAccess && (
            <div className="relative mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handleToggleReady}
                disabled={needsIdentitySelection || !currentPlayerName || joiningInvite}
                className="rounded-2xl bg-orange-500 px-6 py-3.5 font-bold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {players.find((p) => p.player_name === currentPlayerName)?.is_ready
                  ? "Quitar listo"
                  : "Estoy listo"}
              </button>

              <button
                onClick={handleStartGame}
                disabled={!isHost || !allReady || sortedPlayers.length < minPlayersToStart || starting}
                className="rounded-2xl bg-orange-900/70 px-6 py-3.5 font-bold text-orange-100 transition hover:bg-orange-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {starting ? "Iniciando..." : "Iniciar partida"}
              </button>
            </div>
          )}
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
