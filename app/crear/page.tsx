// 📍 Ruta del archivo: app/crear/page.tsx

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "@/components/site/SiteHeader";
import CreateRoomGamePicker from "@/components/create-room/CreateRoomGamePicker";
import CreateRoomConfigurator from "@/components/create-room/CreateRoomConfigurator";
import JoinRoomCard from "@/components/home/JoinRoomCard";
import {
  GAME_CONFIGS,
  getDefaultMaxPlayersForGame,
  getDefaultVariantForGame,
} from "@/lib/games/gameCatalog";
import { createClient } from "@/lib/supabase/client";
import {
  getPlayerIdentity,
  type PlayerIdentity,
} from "@/lib/profile/getPlayerIdentity";
import type { Game, OpenRoom, RoomVisibility } from "@/lib/home/homeTypes";
import { createHomeRoom, joinHomeRoom } from "@/lib/home/homeRoomActions";
import { loadFriendRooms, loadPublicRooms } from "@/lib/home/homeRoomQueries";

export default function CrearPage() {
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [games, setGames] = useState<Game[]>([]);
  const [playerIdentity, setPlayerIdentity] = useState<PlayerIdentity | null>(null);

  const [selectedGameSlug, setSelectedGameSlug] = useState("");
  const [selectedVariantKey, setSelectedVariantKey] = useState("default");
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [roomVisibility, setRoomVisibility] = useState<RoomVisibility>("private");

  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [publicRooms, setPublicRooms] = useState<OpenRoom[]>([]);
  const [loadingPublicRooms, setLoadingPublicRooms] = useState(true);
  const [friendRooms, setFriendRooms] = useState<OpenRoom[]>([]);
  const [loadingFriendRooms, setLoadingFriendRooms] = useState(true);

  const visibleGames = useMemo(() => {
    return [...games]
      .filter((game) => game.slug !== "loteria")
      .sort((a, b) => {
        const aAvailable = a.status === "available" ? 0 : 1;
        const bAvailable = b.status === "available" ? 0 : 1;

        if (aAvailable !== bAvailable) return aAvailable - bAvailable;
        return a.sort_order - b.sort_order;
      });
  }, [games]);

  const selectedGame = useMemo(() => {
    return visibleGames.find((game) => game.slug === selectedGameSlug) ?? null;
  }, [visibleGames, selectedGameSlug]);

  const selectedGameConfig = useMemo(() => {
    return GAME_CONFIGS[selectedGameSlug] ?? null;
  }, [selectedGameSlug]);

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
      console.error("Error cargando juegos:", error);
      return;
    }

    const list = (data ?? []) as Game[];
    setGames(list);

    const firstAvailable = list.find(
      (game) => game.status === "available" && game.slug !== "loteria",
    );

    if (firstAvailable) {
      setSelectedGameSlug(firstAvailable.slug);
      setSelectedVariantKey(getDefaultVariantForGame(firstAvailable.slug));
      setMaxPlayers(getDefaultMaxPlayersForGame(firstAvailable.slug));
    }
  }, [supabase]);

  const refreshPublicRooms = useCallback(async () => {
    try {
      setLoadingPublicRooms(true);
      const rooms = await loadPublicRooms(supabase);
      setPublicRooms(rooms);
    } finally {
      setLoadingPublicRooms(false);
    }
  }, [supabase]);

  const refreshFriendRooms = useCallback(async () => {
    try {
      setLoadingFriendRooms(true);
      const rooms = await loadFriendRooms({
        supabase,
        userId: playerIdentity?.user_id,
        isGuest: playerIdentity?.is_guest,
      });
      setFriendRooms(rooms);
    } finally {
      setLoadingFriendRooms(false);
    }
  }, [supabase, playerIdentity?.user_id, playerIdentity?.is_guest]);

  useEffect(() => {
    void loadGames();
    void loadPlayerIdentity();
    void refreshPublicRooms();
  }, [loadGames, loadPlayerIdentity, refreshPublicRooms]);

  useEffect(() => {
    void refreshFriendRooms();
  }, [refreshFriendRooms]);

  const handleSelectGame = (slug: string) => {
    setSelectedGameSlug(slug);
    setSelectedVariantKey(getDefaultVariantForGame(slug));
    setMaxPlayers(getDefaultMaxPlayersForGame(slug));
    setRoomVisibility("private");
  };

  const handleCreateRoom = async () => {
    try {
      setErrorMessage("");
      setCreating(true);

      await createHomeRoom({
        supabase,
        router,
        selectedGame,
        selectedVariantKey,
        maxPlayers,
        roomVisibility,
        playerIdentity,
        setErrorMessage,
      });
    } finally {
      setCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    try {
      setErrorMessage("");
      setJoining(true);

      await joinHomeRoom({
        supabase,
        router,
        joinCode,
        playerIdentity,
        setErrorMessage,
      });
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
        showHomeButton
        showProfileButton={!!playerIdentity}
        showLoginButton={!playerIdentity}
      />

      <section className="relative overflow-hidden px-6 py-14">
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute left-1/2 top-0 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-orange-500/10 blur-3xl" />
          <div className="absolute right-[10%] top-[20%] h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex rounded-full border border-orange-500/20 bg-orange-500/10 px-5 py-2 text-sm font-bold text-orange-200">
              🎲 Creador avanzado de salas
            </div>

            <h1 className="mt-6 text-5xl font-black leading-tight">
              Crea una partida más fácil, más clara y más divertida
            </h1>

            <p className="mt-5 text-lg text-white/65">
              Escoge un juego por categoría, configura la variante y comparte
              tu sala con familia o amigos.
            </p>
          </div>

          {!playerIdentity && (
            <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-5 py-4 text-center text-yellow-200">
              Para crear o unirte a una sala primero inicia sesión o entra como invitado.
            </div>
          )}

          {errorMessage && (
            <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-center text-red-300">
              {errorMessage}
            </div>
          )}

          <div className="mt-12 grid gap-6 xl:grid-cols-[1fr_390px]">
            <CreateRoomGamePicker
              games={visibleGames}
              selectedGameSlug={selectedGameSlug}
              onSelectGame={handleSelectGame}
            />

            <CreateRoomConfigurator
              selectedGame={selectedGame}
              selectedGameConfig={selectedGameConfig}
              selectedVariantKey={selectedVariantKey}
              maxPlayers={maxPlayers}
              roomVisibility={roomVisibility}
              creating={creating}
              canCreate={!!playerIdentity && !!selectedGame}
              onVariantChange={setSelectedVariantKey}
              onMaxPlayersChange={setMaxPlayers}
              onRoomVisibilityChange={setRoomVisibility}
              onCreateRoom={handleCreateRoom}
            />
          </div>

          <div className="mt-10">
            <JoinRoomCard
              playerIdentity={playerIdentity}
              joinCode={joinCode}
              joining={joining}
              games={games}
              friendRooms={friendRooms}
              loadingFriendRooms={loadingFriendRooms}
              publicRooms={publicRooms}
              loadingPublicRooms={loadingPublicRooms}
              onJoinCodeChange={setJoinCode}
              onJoinRoom={handleJoinRoom}
              onOpenRoomJoin={(code) => router.push(`/sala/${code}`)}
              onRefreshFriendRooms={() => void refreshFriendRooms()}
              onRefreshPublicRooms={() => void refreshPublicRooms()}
            />
          </div>
        </div>
      </section>
    </main>
  );
}