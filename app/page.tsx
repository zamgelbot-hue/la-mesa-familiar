// 📍 Ruta del archivo: app/page.tsx

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getPlayerIdentity, type PlayerIdentity } from "@/lib/profile/getPlayerIdentity";
import SiteHeader from "@/components/site/SiteHeader";
import HomeFooter from "@/components/site/HomeFooter";
import {
  GAME_CONFIGS,
  getDefaultMaxPlayersForGame,
  getDefaultVariantForGame,
} from "@/lib/games/gameCatalog";
import HomeHero from "@/components/home/HomeHero";
import TopPlayersSection from "@/components/home/TopPlayersSection";
import CreateRoomCard from "@/components/home/CreateRoomCard";
import JoinRoomCard from "@/components/home/JoinRoomCard";
import HomeStatsSection from "@/components/home/HomeStatsSection";
import GamesGridSection from "@/components/home/GamesGridSection";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import HomeFeaturesSection from "@/components/home/HomeFeaturesSection";
import type { Game, HomeStats, OpenRoom, RoomVisibility, TopPlayer } from "@/lib/home/homeTypes";
import { DEFAULT_STATS, loadHomeStats, loadTopPlayers } from "@/lib/home/homePlayerQueries";
import { loadFriendRooms, loadPublicRooms } from "@/lib/home/homeRoomQueries";
import { createHomeRoom, joinHomeRoom } from "@/lib/home/homeRoomActions";

export default function HomePage() {
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [games, setGames] = useState<Game[]>([]);
  const [stats, setStats] = useState<HomeStats>(DEFAULT_STATS);

  const [selectedGameSlug, setSelectedGameSlug] = useState("piedra-papel-o-tijera");
  const [selectedVariantKey, setSelectedVariantKey] = useState("bo3");
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [roomVisibility, setRoomVisibility] = useState<RoomVisibility>("private");

  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [playerIdentity, setPlayerIdentity] = useState<PlayerIdentity | null>(null);

  const [topPlayers, setTopPlayers] = useState<TopPlayer[]>([]);
  const [loadingTopPlayers, setLoadingTopPlayers] = useState(true);

  const [publicRooms, setPublicRooms] = useState<OpenRoom[]>([]);
  const [loadingPublicRooms, setLoadingPublicRooms] = useState(true);

  const [friendRooms, setFriendRooms] = useState<OpenRoom[]>([]);
  const [loadingFriendRooms, setLoadingFriendRooms] = useState(true);

  const selectedGame = useMemo(
    () => games.find((game) => game.slug === selectedGameSlug) ?? null,
    [games, selectedGameSlug],
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

  useEffect(() => {
    if (!selectedGameConfig) return;

    if (!selectedGameConfig.maxPlayersOptions.includes(maxPlayers)) {
      setMaxPlayers(selectedGameConfig.maxPlayersOptions[0]);
    }

    const availableVariants = selectedGameConfig.variants.filter(
      (variant) => variant.available,
    );

    const currentIsValid = availableVariants.some(
      (variant) => variant.key === selectedVariantKey,
    );

    if (!currentIsValid) {
      setSelectedVariantKey(availableVariants[0]?.key ?? "default");
    }
  }, [selectedGameConfig, maxPlayers, selectedVariantKey]);

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

    const firstAvailable = list.find(
      (game) => game.status === "available" && game.slug !== "loteria",
    );

    if (firstAvailable) {
      setSelectedGameSlug(firstAvailable.slug);
      setSelectedVariantKey(getDefaultVariantForGame(firstAvailable.slug));
      setMaxPlayers(getDefaultMaxPlayersForGame(firstAvailable.slug));
    }
  }, [supabase]);

  const refreshStats = useCallback(async () => {
    const nextStats = await loadHomeStats(supabase);
    setStats(nextStats);
  }, [supabase]);

  const refreshTopPlayers = useCallback(async () => {
    try {
      setLoadingTopPlayers(true);
      const players = await loadTopPlayers(supabase);
      setTopPlayers(players);
    } finally {
      setLoadingTopPlayers(false);
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
    loadGames();
    refreshStats();
    loadPlayerIdentity();
    refreshTopPlayers();
    refreshPublicRooms();
  }, [loadGames, refreshStats, loadPlayerIdentity, refreshTopPlayers, refreshPublicRooms]);

  useEffect(() => {
    refreshFriendRooms();
  }, [refreshFriendRooms]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadPlayerIdentity();
      refreshTopPlayers();
      refreshPublicRooms();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, loadPlayerIdentity, refreshTopPlayers, refreshPublicRooms]);

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

  const handleOpenRoomJoin = (code: string) => {
    router.push(`/sala/${code}`);
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
        showFriendsButton={!!playerIdentity && !playerIdentity.is_guest}
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

          <HomeHero
            playerIdentity={playerIdentity}
            onRankingClick={() => router.push("/ranking")}
          />

          <TopPlayersSection
            topPlayers={topPlayers}
            loadingTopPlayers={loadingTopPlayers}
            playerIdentity={playerIdentity}
            onRankingClick={() => router.push("/ranking")}
          />

          <div className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-2">
            <CreateRoomCard
              playerIdentity={playerIdentity}
              visibleGames={visibleGames}
              selectedGame={selectedGame}
              selectedGameConfig={selectedGameConfig}
              selectedVariantKey={selectedVariantKey}
              selectedVariantLabel={selectedVariant?.label ?? "Variante por defecto"}
              maxPlayers={maxPlayers}
              roomVisibility={roomVisibility}
              creating={creating}
              onCreateRoom={handleCreateRoom}
              onSelectedGameSlugChange={setSelectedGameSlug}
              onSelectedVariantKeyChange={setSelectedVariantKey}
              onMaxPlayersChange={setMaxPlayers}
              onRoomVisibilityChange={setRoomVisibility}
            />

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
              onOpenRoomJoin={handleOpenRoomJoin}
              onRefreshFriendRooms={() => void refreshFriendRooms()}
              onRefreshPublicRooms={() => void refreshPublicRooms()}
            />
          </div>

          {errorMessage && (
            <div className="mx-auto mt-6 max-w-4xl rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-center text-red-300">
              {errorMessage}
            </div>
          )}

          <HomeStatsSection stats={stats} />
        </div>
      </section>

      <GamesGridSection
        visibleGames={visibleGames}
        onSelectedGameSlugChange={setSelectedGameSlug}
        onSelectedVariantKeyChange={setSelectedVariantKey}
        onMaxPlayersChange={setMaxPlayers}
        onRoomVisibilityChange={setRoomVisibility}
      />

      <HowItWorksSection />
      <HomeFeaturesSection />
      <HomeFooter />
    </main>
  );
}
