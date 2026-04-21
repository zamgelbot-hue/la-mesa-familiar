"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getPlayerIdentity, type PlayerIdentity } from "@/lib/getPlayerIdentity";
import { getAvatarByKey, getFrameByKey } from "@/lib/profileCosmetics";
import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import HomeFooter from "@/components/site/HomeFooter";


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

type TopPlayer = {
  id: string;
  display_name: string | null;
  points: number | null;
  games_played: number | null;
  games_won: number | null;
  games_lost: number | null;
  total_points_earned: number | null;
  best_win_streak: number | null;
  avatar_key: string | null;
  frame_key: string | null;
};

type VariantOption = {
  key: string;
  label: string;
  description: string;
  available: boolean;
};

type GameConfig = {
  maxPlayersOptions: number[];
  variants: VariantOption[];
};

const DEFAULT_STATS: HomeStats = {
  activePlayers: 0,
  classicGames: 0,
  gamesPlayed: 0,
};

const getPlayerStorageKey = (roomCode: string) => `lmf:player:${roomCode}`;

const GAME_CONFIGS: Record<string, GameConfig> = {
"loteria-mexicana": {
  maxPlayersOptions: [2, 4, 6],
  variants: [
    {
      key: "clasica",
      label: "Clásica",
      description: "La versión tradicional de siempre.",
      available: true,
    },
    {
      key: "familia-palomares",
      label: "Familia Palomares",
      description: "Edición especial próximamente.",
      available: false,
    },
    {
      key: "comidas-mexicanas",
      label: "Comidas Mexicanas",
      description: "Nueva variante próximamente.",
      available: false,
    },
  ],
},
"piedra-papel-o-tijera": {
  maxPlayersOptions: [2],
  variants: [
    {
      key: "bo3",
      label: "Mejor 2 de 3",
      description: "Gana quien consiga 2 rondas primero.",
      available: true,
    },
    {
      key: "bo5",
      label: "Mejor 3 de 5",
      description: "Gana quien consiga 3 rondas primero.",
      available: true,
    },
    {
      key: "bo7",
      label: "Mejor 4 de 7",
      description: "Gana quien consiga 4 rondas primero.",
      available: true,
    },
  ],
},
};

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

function getDefaultVariantForGame(gameSlug: string) {
  return GAME_CONFIGS[gameSlug]?.variants[0]?.key ?? "default";
}

function getDefaultMaxPlayersForGame(gameSlug: string) {
  return GAME_CONFIGS[gameSlug]?.maxPlayersOptions[0] ?? 2;
}

function buildRoomSettings(gameSlug: string, variantKey: string, maxPlayers: number) {
  if (gameSlug === "loteria-mexicana") {
    return {
      mode: "standard",
      deck_variant: variantKey,
      board_size: 4,
      win_condition: "tabla",
      max_players: maxPlayers,
    };
  }

  if (gameSlug === "piedra-papel-o-tijera") {
    const variantMap: Record<string, { best_of: number; rounds_to_win: number }> = {
      bo3: { best_of: 3, rounds_to_win: 2 },
      bo5: { best_of: 5, rounds_to_win: 3 },
      bo7: { best_of: 7, rounds_to_win: 4 },
    };

    const selected = variantMap[variantKey] ?? variantMap.bo3;

    return {
      mode: "match_series",
      best_of: selected.best_of,
      rounds_to_win: selected.rounds_to_win,
      max_players: 2,
    };
  }

  return {
    max_players: maxPlayers,
  };
}

export default function HomePage() {
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [games, setGames] = useState<Game[]>([]);
  const [stats, setStats] = useState<HomeStats>(DEFAULT_STATS);
  const [selectedGameSlug, setSelectedGameSlug] = useState("piedra-papel-o-tijera");
  const [selectedVariantKey, setSelectedVariantKey] = useState("bo3");
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [playerIdentity, setPlayerIdentity] = useState<PlayerIdentity | null>(null);
  const [topPlayers, setTopPlayers] = useState<TopPlayer[]>([]);
  const [loadingTopPlayers, setLoadingTopPlayers] = useState(true);

  const selectedGame = useMemo(
    () => games.find((game) => game.slug === selectedGameSlug) ?? null,
    [games, selectedGameSlug]
  );

  const selectedGameConfig = useMemo(() => {
    return GAME_CONFIGS[selectedGameSlug] ?? null;
  }, [selectedGameSlug]);

  const selectedVariant = useMemo(() => {
    return (
      selectedGameConfig?.variants.find((variant) => variant.key === selectedVariantKey) ??
      selectedGameConfig?.variants[0] ??
      null
    );
  }, [selectedGameConfig, selectedVariantKey]);

  const selectedAvatar = getAvatarByKey(playerIdentity?.avatar_key);
  const selectedFrame = getFrameByKey(playerIdentity?.frame_key);

useEffect(() => {
  if (!selectedGameConfig) return;

  if (!selectedGameConfig.maxPlayersOptions.includes(maxPlayers)) {
    setMaxPlayers(selectedGameConfig.maxPlayersOptions[0]);
  }

  const availableVariants = selectedGameConfig.variants.filter((variant) => variant.available);
  const currentIsValid = availableVariants.some(
    (variant) => variant.key === selectedVariantKey
  );

  if (!currentIsValid) {
    setSelectedVariantKey(availableVariants[0]?.key ?? "default");
  }
}, [selectedGameConfig, maxPlayers, selectedVariantKey]);

  const renderProfileAvatar = (
    avatar: { emoji?: string; image?: string; label?: string },
    frame: { className?: string; image?: string; label?: string },
    size: "sm" | "md" = "sm"
  ) => {
    const wrapperSize = size === "sm" ? "h-10 w-10" : "h-16 w-16";
    const avatarSize = size === "sm" ? "h-7 w-7" : "h-10 w-10";
    const textSize = size === "sm" ? "text-lg" : "text-2xl";
    const borderSize = size === "sm" ? "border-2" : "border-4";

    return (
      <div className={`relative flex ${wrapperSize} items-center justify-center rounded-full bg-black`}>
        {frame.image ? (
          <img
            src={frame.image}
            alt={frame.label ?? "Frame"}
            className="absolute inset-0 h-full w-full object-contain"
          />
        ) : (
          <div
            className={`absolute inset-0 rounded-full ${borderSize} ${frame.className ?? ""}`}
          />
        )}

        {avatar.image ? (
          <img
            src={avatar.image}
            alt={avatar.label ?? "Avatar"}
            className={`relative z-10 ${avatarSize} object-contain`}
          />
        ) : (
          <span className={`relative z-10 ${textSize}`}>{avatar.emoji}</span>
        )}
      </div>
    );
  };

  const getTopPositionBadge = (position: number) => {
    if (position === 1) return "👑";
    if (position === 2) return "🥈";
    return "🥉";
  };

  const getTopPositionStyles = (position: number) => {
    if (position === 1) {
      return "border-yellow-400/30 bg-yellow-500/10 shadow-[0_0_25px_rgba(250,204,21,0.10)]";
    }

    if (position === 2) {
      return "border-slate-300/20 bg-slate-200/5 shadow-[0_0_20px_rgba(226,232,240,0.06)]";
    }

    return "border-orange-400/25 bg-orange-500/10 shadow-[0_0_20px_rgba(251,146,60,0.06)]";
  };

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
      setSelectedVariantKey(getDefaultVariantForGame(firstAvailable.slug));
      setMaxPlayers(getDefaultMaxPlayersForGame(firstAvailable.slug));
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

  const loadTopPlayers = useCallback(async () => {
    try {
      setLoadingTopPlayers(true);

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, display_name, points, games_played, games_won, games_lost, total_points_earned, best_win_streak, avatar_key, frame_key"
        )
        .not("display_name", "is", null)
        .order("points", { ascending: false })
        .order("games_won", { ascending: false })
        .order("best_win_streak", { ascending: false })
        .limit(3);

      if (error) {
        console.error("Error cargando top players:", error);
        setTopPlayers([]);
        return;
      }

      setTopPlayers((data ?? []) as TopPlayer[]);
    } finally {
      setLoadingTopPlayers(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadGames();
    loadStats();
    loadPlayerIdentity();
    loadTopPlayers();
  }, [loadGames, loadStats, loadPlayerIdentity, loadTopPlayers]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadPlayerIdentity();
      loadTopPlayers();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, loadPlayerIdentity, loadTopPlayers]);

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

      const finalVariantKey = selectedVariantKey || getDefaultVariantForGame(selectedGame.slug);
      const finalMaxPlayers =
        selectedGame.slug === "piedra-papel-o-tijera" ? 2 : maxPlayers;

      const roomSettings = buildRoomSettings(
        selectedGame.slug,
        finalVariantKey,
        finalMaxPlayers
      );

      while (!created && attempts < 5) {
        attempts += 1;
        roomCode = generateRoomCode();

        const { error: roomError } = await supabase.from("rooms").insert({
          code: roomCode,
          status: "waiting",
          started_at: null,
          game_slug: selectedGame.slug,
          game_variant: finalVariantKey,
          max_players: finalMaxPlayers,
          room_settings: roomSettings,
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
        .select("code, status, game_slug, max_players, game_variant, room_settings")
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

      const roomCapacity = Number(room.max_players ?? 2);

      if (list.length >= roomCapacity) {
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
<SiteHeader
  playerIdentity={playerIdentity}
  onSignOut={playerIdentity ? handleSignOut : undefined}
  signingOut={signingOut}
  showMainNav
  showRankingButton={!!playerIdentity}
  showProfileButton={!!playerIdentity}
  showLoginButton={!playerIdentity}
  showStartButton={!playerIdentity}
/>

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
              <div className="mt-6 flex flex-col items-center gap-4">
                <div className="inline-flex items-center gap-3 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
                  {renderProfileAvatar(selectedAvatar, selectedFrame, "sm")}
                  <span>
                    Jugando como: {playerIdentity.name} {playerIdentity.is_guest ? "(Invitado)" : ""}
                  </span>
                </div>

                {!playerIdentity.is_guest && (
                  <button
                    type="button"
                    onClick={() => router.push("/ranking")}
                    className="rounded-2xl border border-orange-500/20 bg-orange-500/10 px-5 py-3 font-bold text-orange-200 transition hover:bg-orange-500/15"
                  >
                    Ver ranking global
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="mx-auto mt-12 max-w-5xl rounded-[30px] border border-orange-500/15 bg-zinc-950/90 p-6 shadow-[0_0_40px_rgba(249,115,22,0.05)]">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-300/80">
                  Top jugadores
                </p>
                <h2 className="mt-2 text-2xl font-bold text-white">Los mejores de la mesa</h2>
                <p className="mt-1 text-sm text-white/60">
                  Los 3 jugadores con más puntos actuales.
                </p>
              </div>

              <button
                type="button"
                onClick={() => router.push("/ranking")}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 font-semibold text-white transition hover:bg-white/10"
              >
                Ver ranking
              </button>
            </div>

            {loadingTopPlayers ? (
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-10 text-center text-white/70">
                Cargando top jugadores...
              </div>
            ) : topPlayers.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-10 text-center text-white/70">
                Aún no hay jugadores suficientes para mostrar el Top 3.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                {topPlayers.map((player, index) => {
                  const position = index + 1;
                  const avatar = getAvatarByKey(player.avatar_key);
                  const frame = getFrameByKey(player.frame_key);
                  const gamesPlayed = player.games_played ?? 0;
                  const gamesWon = player.games_won ?? 0;
                  const winRate =
                    gamesPlayed > 0 ? ((gamesWon / gamesPlayed) * 100).toFixed(1) : null;
                  const isMe = !!playerIdentity?.user_id && player.id === playerIdentity.user_id;

                  return (
                    <div
                      key={player.id}
                      className={`rounded-[28px] border p-5 transition hover:border-orange-500/30 hover:bg-white/[0.05] ${getTopPositionStyles(position)} ${
                        isMe ? "ring-2 ring-emerald-400/50 shadow-[0_0_25px_rgba(16,185,129,0.12)]" : ""
                      }`}
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black/30 text-lg font-extrabold">
                          {getTopPositionBadge(position)}
                        </div>

                        {isMe && (
                          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-300">
                            Tú
                          </span>
                        )}
                      </div>

                      <div className="flex justify-center">
                        {renderProfileAvatar(avatar, frame, "md")}
                      </div>

                      <div className="mt-4 text-center">
                        <p className="truncate text-lg font-bold text-white">
                          {player.display_name || "Jugador"}
                        </p>

                        <p className="mt-2 text-3xl font-extrabold text-orange-400">
                          {player.points ?? 0}
                        </p>

                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">
                          pts
                        </p>

                        <p className="mt-3 text-sm text-white/65">
                          {gamesPlayed === 0
                            ? "Sin partidas registradas"
                            : `${gamesPlayed} jugadas · ${gamesWon} ganadas · ${winRate}% WR`}
                        </p>
                      </div>
                    </div>
                  );
                })}
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
                  onChange={(e) => {
                    const nextSlug = e.target.value;
                    setSelectedGameSlug(nextSlug);
                    setSelectedVariantKey(getDefaultVariantForGame(nextSlug));
                    setMaxPlayers(getDefaultMaxPlayersForGame(nextSlug));
                  }}
                  className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-500/50"
                >
                  {games.map((game) => (
                    <option key={game.id} value={game.slug} disabled={game.status !== "available"}>
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

                    <div className="mt-4 space-y-4">
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
                          Jugadores
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {(selectedGameConfig?.maxPlayersOptions ?? [selectedGame.min_players]).map(
                            (num) => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => setMaxPlayers(num)}
                                className={`rounded-2xl px-4 py-2 text-sm font-bold transition ${
                                  maxPlayers === num
                                    ? "bg-orange-500 text-black"
                                    : "bg-white/10 text-white/70 hover:bg-white/15"
                                }`}
                              >
                                {num}
                              </button>
                            )
                          )}
                        </div>

                        <p className="mt-2 text-sm text-orange-300">
                          Hasta {maxPlayers} jugadores
                        </p>
                      </div>

                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
                          Variante
                        </p>

                        <div className="grid gap-2">
{(selectedGameConfig?.variants ?? []).map((variant) => {
  const isSelected = selectedVariantKey === variant.key;
  const isAvailable = variant.available;

  return (
    <button
      key={variant.key}
      type="button"
      onClick={() => {
        if (!isAvailable) return;
        setSelectedVariantKey(variant.key);
      }}
      disabled={!isAvailable}
      className={`rounded-2xl border px-4 py-3 text-left transition ${
        !isAvailable
          ? "cursor-not-allowed border-white/10 bg-white/[0.03] opacity-60"
          : isSelected
          ? "border-orange-500/40 bg-orange-500/10"
          : "border-white/10 bg-white/5 hover:bg-white/10"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-white">{variant.label}</p>
          <p className="mt-1 text-sm text-white/60">{variant.description}</p>
        </div>

        {!isAvailable && (
          <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/60">
            Próximamente
          </span>
        )}
      </div>
    </button>
  );
})}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                        Configuración seleccionada
                      </p>
                      <p className="mt-2 text-sm text-white/75">
                        <span className="font-bold text-white">{selectedGame.name}</span>
                        {" · "}
                        <span>{selectedVariant?.label ?? "Variante por defecto"}</span>
                        {" · "}
                        <span>{maxPlayers} jugador{maxPlayers !== 1 ? "es" : ""}</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleCreateRoom}
                disabled={creating || !selectedGame || selectedGame.status !== "available" || !playerIdentity}
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
                  {game.slug === "piedra-papel-o-tijera"
                    ? "2 jugadores"
                    : `${game.min_players}-${game.max_players} jugadores`}
                </div>

                <div className="mt-6">
                  {game.status === "available" ? (
                    <button
                      onClick={() => {
                        setSelectedGameSlug(game.slug);
                        setSelectedVariantKey(getDefaultVariantForGame(game.slug));
                        setMaxPlayers(getDefaultMaxPlayersForGame(game.slug));
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
                className="rounded-[28px] border border-white/10 bg-zinc-950/80 p-6 transition hover:border-orange-500/30"
              >
                <div className="text-sm font-bold uppercase tracking-[0.18em] text-orange-400">
                  {item.step}
                </div>
                <h3 className="mt-4 text-2xl font-bold">{item.title}</h3>
                <p className="mt-4 text-white/65">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="funciones" className="border-t border-orange-500/10 px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h2 className="text-5xl font-extrabold">Diseñado para jugar en familia</h2>
            <p className="mx-auto mt-4 max-w-3xl text-xl text-white/65">
              Todo lo que necesitas para crear momentos inolvidables en línea.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[
              {
                title: "Salas privadas",
                text: "Genera códigos únicos para jugar solo con tus invitados.",
              },
              {
                title: "Tiempo real",
                text: "Movimientos sincronizados y reacciones instantáneas durante la partida.",
              },
              {
                title: "Fácil de usar",
                text: "Interfaz simple para niños, padres y abuelos.",
              },
              {
                title: "Sin descargas",
                text: "Todo corre directo desde tu navegador.",
              },
              {
                title: "Diseño cálido",
                text: "Una experiencia visual inspirada en reuniones familiares y noches de juego.",
              },
              {
                title: "Más juegos pronto",
                text: "Seguiremos agregando clásicos para que la mesa siga creciendo.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-[28px] border border-white/10 bg-zinc-950/80 p-6 transition hover:border-orange-500/30"
              >
                <h3 className="text-2xl font-bold">{feature.title}</h3>
                <p className="mt-4 text-white/65">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      <HomeFooter />
      
    </main>
  );
}
