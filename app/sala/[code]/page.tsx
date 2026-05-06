// 📍 Ruta del archivo: app/sala/[code]/page.tsx

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import RoomChat from "@/components/RoomChat";
import RoomAccessNotice from "@/components/room/RoomAccessNotice";
import RoomHeader from "@/components/room/RoomHeader";
import RoomStatusCard from "@/components/room/RoomStatusCard";
import PlayersList from "@/components/room/PlayersList";
import { createClient } from "@/lib/supabase/client";
import { getPlayerIdentity, type PlayerIdentity } from "@/lib/profile/getPlayerIdentity";
import {
  GAME_CONFIGS,
  getAvailableVariantsForGame,
  getVariantLabel,
} from "@/lib/games/gameCatalog";
import {
  autoJoinRoomIfNeeded,
  changeRoomVariant,
  copyRoomCode,
  leaveRoom,
  startRoomGame,
  togglePlayerReady,
} from "@/lib/room/roomActions";
import {
  fetchGameBySlug,
  fetchProfilesMapForPlayers,
  fetchRoomByCode,
  fetchRoomPlayers,
} from "@/lib/room/roomQueries";
import {
  findCurrentPlayer,
  resolveCurrentPlayerName,
  sortRoomPlayers,
} from "@/lib/room/roomPlayerIdentity";
import { subscribeToRoomRealtime } from "@/lib/room/roomRealtime";
import { saveRoomPlayerIdentity } from "@/lib/room/roomStorage";
import type { Game, ProfileMap, Room, RoomPlayer } from "@/lib/room/roomTypes";

function LoadingView() {
  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl rounded-[34px] border border-white/10 bg-zinc-950/90 p-10 text-center shadow-[0_0_40px_rgba(249,115,22,0.04)]">
        <p className="text-3xl font-bold">Cargando sala...</p>
      </div>
    </main>
  );
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
  const playerIdentityRef = useRef<PlayerIdentity | null>(null);
  const lastProfilesKeyRef = useRef("");

  const sortedPlayers = useMemo(() => sortRoomPlayers(players), [players]);

  const currentPlayer = useMemo(() => {
    return findCurrentPlayer({
      players: sortedPlayers,
      currentPlayerName,
    });
  }, [sortedPlayers, currentPlayerName]);

  const isHost = !!currentPlayer?.is_host;
  const isVsBot = room?.room_settings?.vs_bot === true;
  const roomMaxPlayers = isVsBot ? 1 : room?.max_players ?? game?.max_players ?? 2;
  const minPlayersToStart = isVsBot ? 1 : game?.min_players ?? 2;
  const variantLabel = getVariantLabel(room?.game_slug, room?.game_variant);

  const tutorialSteps = useMemo(() => {
    if (!room?.game_slug) return [];
    return GAME_CONFIGS[room.game_slug]?.tutorial ?? [];
  }, [room?.game_slug]);

  const availableVariants = useMemo(() => {
    if (!room?.game_slug) return [];
    return getAvailableVariantsForGame(room.game_slug);
  }, [room?.game_slug]);

  const allReady = useMemo(() => {
    return (
      sortedPlayers.length >= minPlayersToStart &&
      sortedPlayers.every((player) => player.is_ready)
    );
  }, [sortedPlayers, minPlayersToStart]);

  const loadPlayerIdentity = useCallback(async () => {
    try {
      const identity = await getPlayerIdentity();
      playerIdentityRef.current = identity;
      setPlayerIdentity(identity);
      return identity;
    } catch (error) {
      console.error("Error cargando identidad:", error);
      playerIdentityRef.current = null;
      setPlayerIdentity(null);
      return null;
    }
  }, []);

  const fetchRoom = useCallback(async () => {
    const nextRoom = await fetchRoomByCode({
      supabase,
      code,
    });

    setRoom(nextRoom);
    return nextRoom;
  }, [supabase, code]);

  const fetchGame = useCallback(
    async (gameSlug?: string | null) => {
      const slugToLoad = gameSlug ?? room?.game_slug;
      const nextGame = await fetchGameBySlug({
        supabase,
        gameSlug: slugToLoad,
      });

      setGame(nextGame);
      return nextGame;
    },
    [supabase, room?.game_slug],
  );

  const fetchProfilesForPlayers = useCallback(
    async (playerList: RoomPlayer[]) => {
      const userIds = Array.from(
        new Set(playerList.map((player) => player.user_id).filter(Boolean)),
      ) as string[];

      const requestKey = userIds.sort().join("|");

      if (!requestKey) {
        lastProfilesKeyRef.current = "";
        setProfilesMap({});
        return;
      }

      if (lastProfilesKeyRef.current === requestKey) return;

      lastProfilesKeyRef.current = requestKey;

      const nextMap = await fetchProfilesMapForPlayers({
        supabase,
        players: playerList,
      });

      setProfilesMap(nextMap);
    },
    [supabase],
  );

  const resolveCurrentPlayerFromList = useCallback(
    (playerList: RoomPlayer[], identity: PlayerIdentity | null) => {
      const resolvedName = resolveCurrentPlayerName({
        code,
        players: playerList,
        identity,
      });

      setCurrentPlayerName(resolvedName);
      return resolvedName;
    },
    [code],
  );

  const fetchPlayers = useCallback(
    async (identityOverride?: PlayerIdentity | null) => {
      const list = await fetchRoomPlayers({
        supabase,
        code,
      });

      setPlayers((prev) => {
        const prevSerialized = JSON.stringify(prev);
        const nextSerialized = JSON.stringify(list);
        return prevSerialized === nextSerialized ? prev : list;
      });

      await fetchProfilesForPlayers(list);

      const identityToUse =
        identityOverride !== undefined ? identityOverride : playerIdentityRef.current;

      resolveCurrentPlayerFromList(list, identityToUse);

      return list;
    },
    [supabase, code, fetchProfilesForPlayers, resolveCurrentPlayerFromList],
  );

  const autoJoinIfNeeded = useCallback(
    async (
      currentRoom: Room | null,
      currentPlayers: RoomPlayer[],
      identity: PlayerIdentity | null,
    ) => {
      return autoJoinRoomIfNeeded({
        supabase,
        room: currentRoom,
        players: currentPlayers,
        identity,
        autoJoinAttemptedRef,
        setJoiningInvite,
        setCurrentPlayerName,
        resolveCurrentPlayerFromList,
      });
    },
    [supabase, resolveCurrentPlayerFromList],
  );

  useEffect(() => {
    let active = true;

    const timeout = window.setTimeout(() => {
      if (active) {
        setLoading(false);
        setErrorMessage("La sala tardó demasiado en cargar. Intenta recargar.");
      }
    }, 12000);

    const init = async () => {
      setLoading(true);
      setErrorMessage("");
      autoJoinAttemptedRef.current = false;

      try {
        const loadedRoom = await fetchRoom();
        if (!active) return;

        if (!loadedRoom) {
          setErrorMessage("No se pudo encontrar esta sala.");
          setLoading(false);
          return;
        }

        const identity = await loadPlayerIdentity();
        if (!active) return;

        const loadedPlayers = await fetchPlayers(identity);
        if (!active) return;

        if (loadedRoom.game_slug) {
          await fetchGame(loadedRoom.game_slug);
        }

        const joined = await autoJoinIfNeeded(loadedRoom, loadedPlayers, identity);
        if (!active) return;

        if (joined) {
          await fetchRoom();
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
  }, [
    code,
    loadPlayerIdentity,
    fetchRoom,
    fetchPlayers,
    fetchGame,
    autoJoinIfNeeded,
  ]);

  useEffect(() => {
    let active = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async () => {
      if (!active) return;

      const identity = await loadPlayerIdentity();
      if (!active) return;

      await fetchPlayers(identity);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase, loadPlayerIdentity, fetchPlayers]);

  useEffect(() => {
    if (!code) return;

    const channel = subscribeToRoomRealtime({
      supabase,
      code,
      router,
      players,
      currentPlayerName,
      setRoom,
      fetchPlayers: async () => fetchPlayers(playerIdentityRef.current),
      fetchRoom,
      fetchGame,
    });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [
    supabase,
    code,
    router,
    players,
    currentPlayerName,
    fetchPlayers,
    fetchRoom,
    fetchGame,
  ]);

  useEffect(() => {
    if (room?.status === "playing") {
      router.replace(`/juego/${code}`);
    }
  }, [room?.status, router, code]);

  useEffect(() => {
    if (!code || !currentPlayerName || players.length === 0) return;

    const me = players.find((player) => player.player_name === currentPlayerName);
    if (!me) return;

    saveRoomPlayerIdentity(code, me.player_name, me.is_host);
  }, [code, players, currentPlayerName]);

  const handleSelectIdentity = (playerName: string) => {
    const me = players.find((player) => player.player_name === playerName);
    saveRoomPlayerIdentity(code, playerName, !!me?.is_host);
    setCurrentPlayerName(playerName);
  };

  const handleBackHome = async () => {
    await leaveRoom({
      supabase,
      router,
      code,
      room,
      isHost,
      currentPlayer,
      currentPlayerName,
      players,
      playerIdentityRef,
      fetchPlayers,
    });
  };

  const handleToggleReady = async () => {
    await togglePlayerReady({
      supabase,
      code,
      currentPlayerName,
      players,
    });
  };

  const handleChangeVariant = async (variantKey: string) => {
    await changeRoomVariant({
      supabase,
      code,
      room,
      isHost,
      roomMaxPlayers,
      variantKey,
    });
  };

  const handleStartGame = async () => {
    await startRoomGame({
      supabase,
      router,
      code,
      room,
      isHost,
      allReady,
      players: sortedPlayers,
      minPlayersToStart,
      setStarting,
    });
  };

  const handleCopyCode = async () => {
    await copyRoomCode({
      code,
      setCopied,
    });
  };

  const needsAccess = !playerIdentity && !currentPlayerName;

  const needsIdentitySelection =
    !needsAccess &&
    sortedPlayers.length > 0 &&
    (!currentPlayerName ||
      !sortedPlayers.some((player) => player.player_name === currentPlayerName));

  if (loading) return <LoadingView />;

  if (!room) {
    return (
      <main className="min-h-screen bg-black px-6 py-8 text-white">
        <div className="mx-auto max-w-6xl rounded-[34px] border border-red-500/20 bg-red-500/10 p-10 text-center">
          <p className="text-3xl font-bold text-red-300">No encontramos esta sala.</p>

          <button
            onClick={() => void handleBackHome()}
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
          onClick={() => void handleBackHome()}
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

          <div className="relative">
            <RoomHeader
              code={code}
              room={room}
              game={game}
              copied={copied}
              joiningInvite={joiningInvite}
              starting={starting}
              allReady={allReady}
              sortedPlayersCount={sortedPlayers.length}
              roomMaxPlayers={roomMaxPlayers}
              minPlayersToStart={minPlayersToStart}
              isVsBot={isVsBot}
              variantLabel={variantLabel}
              onCopyCode={handleCopyCode}
            />
          </div>

          <RoomAccessNotice
            code={code}
            needsAccess={needsAccess}
            needsIdentitySelection={needsIdentitySelection}
            players={sortedPlayers}
            onSelectIdentity={handleSelectIdentity}
          />

          <div className="relative mt-8 grid gap-6 xl:grid-cols-[1.25fr_0.85fr]">
            <PlayersList
              players={sortedPlayers}
              profilesMap={profilesMap}
              currentPlayerName={currentPlayerName}
              roomMaxPlayers={roomMaxPlayers}
              isVsBot={isVsBot}
            />

            <div className="space-y-6">
              <RoomStatusCard
                room={room}
                game={game}
                variantLabel={variantLabel}
                roomMaxPlayers={roomMaxPlayers}
                sortedPlayersCount={sortedPlayers.length}
                minPlayersToStart={minPlayersToStart}
                availableVariants={availableVariants}
                isHost={isHost}
                onChangeVariant={handleChangeVariant}
              />

              {tutorialSteps.length > 0 && (
                <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-200">
                    Cómo jugar
                  </p>

                  <ul className="mt-4 space-y-2">
                    {tutorialSteps.map((step, index) => (
                      <li
                        key={index}
                        className="rounded-xl bg-white/5 px-4 py-3 text-sm text-white/80"
                      >
                        {index + 1}. {step}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {!needsAccess && (
            <div className="relative mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handleToggleReady}
                disabled={needsIdentitySelection || !currentPlayerName || joiningInvite}
                className="rounded-2xl bg-orange-500 px-6 py-3.5 font-bold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {players.find((player) => player.player_name === currentPlayerName)?.is_ready
                  ? "Quitar listo"
                  : "Estoy listo"}
              </button>

              <button
                onClick={handleStartGame}
                disabled={
                  !isHost ||
                  !allReady ||
                  sortedPlayers.length < minPlayersToStart ||
                  starting
                }
                className="rounded-2xl bg-orange-900/70 px-6 py-3.5 font-bold text-orange-100 transition hover:bg-orange-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {starting ? "Iniciando..." : isVsBot ? "Iniciar contra bot" : "Iniciar partida"}
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
