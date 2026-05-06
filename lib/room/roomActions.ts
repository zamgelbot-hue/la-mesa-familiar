// 📍 Ruta del archivo: lib/room/roomActions.ts

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { PlayerIdentity } from "@/lib/profile/getPlayerIdentity";
import { buildRoomSettings } from "@/lib/games/gameCatalog";
import { saveRoomPlayerIdentity } from "./roomStorage";
import { getUniquePlayerName } from "./roomPlayerIdentity";
import { fetchRoomPlayers, touchRoomActivity } from "./roomQueries";
import type { Room, RoomPlayer } from "./roomTypes";

export async function autoJoinRoomIfNeeded(params: {
  supabase: SupabaseClient;
  room: Room | null;
  players: RoomPlayer[];
  identity: PlayerIdentity | null;
  autoJoinAttemptedRef: React.MutableRefObject<boolean>;
  setJoiningInvite: (joining: boolean) => void;
  setCurrentPlayerName: (name: string) => void;
  resolveCurrentPlayerFromList: (
    players: RoomPlayer[],
    identity: PlayerIdentity | null,
  ) => string;
}) {
  const {
    supabase,
    room,
    players,
    identity,
    autoJoinAttemptedRef,
    setJoiningInvite,
    setCurrentPlayerName,
    resolveCurrentPlayerFromList,
  } = params;

  if (!room) return false;
  if (!identity) return false;
  if (room.status !== "waiting") return false;
  if (autoJoinAttemptedRef.current) return false;

  const alreadyInRoom = players.some((player) => {
    if (identity.user_id && player.user_id) {
      return player.user_id === identity.user_id;
    }

    if (identity.is_guest && !player.user_id) {
      return player.player_name === identity.name;
    }

    return false;
  });

  if (alreadyInRoom) {
    resolveCurrentPlayerFromList(players, identity);
    autoJoinAttemptedRef.current = true;
    return false;
  }

  const capacity = Number(room.max_players ?? 2);

  if (players.length >= capacity) {
    autoJoinAttemptedRef.current = true;
    return false;
  }

  try {
    setJoiningInvite(true);
    autoJoinAttemptedRef.current = true;

    const finalName = getUniquePlayerName({
      baseName: identity.name,
      players,
    });

    const { error } = await supabase.from("room_players").insert({
      room_code: room.code,
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

    await touchRoomActivity({
      supabase,
      code: room.code,
    });

    saveRoomPlayerIdentity(room.code, finalName, false);
    setCurrentPlayerName(finalName);

    return true;
  } finally {
    setJoiningInvite(false);
  }
}

export async function leaveRoom(params: {
  supabase: SupabaseClient;
  router: AppRouterInstance;
  code: string;
  room: Room | null;
  isHost: boolean;
  currentPlayer: RoomPlayer | null;
  currentPlayerName: string;
  players: RoomPlayer[];
  playerIdentityRef: React.MutableRefObject<PlayerIdentity | null>;
  fetchPlayers: (identityOverride?: PlayerIdentity | null) => Promise<RoomPlayer[]>;
}) {
  const {
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
  } = params;

  if (!room) {
    router.push("/");
    return;
  }

  try {
    const me =
      currentPlayer ??
      players.find((player) => player.player_name === currentPlayerName) ??
      null;

    if (isHost) {
      const { error: closeError } = await supabase
        .from("rooms")
        .update({
          status: "closed",
          last_activity_at: new Date().toISOString(),
        })
        .eq("code", code);

      if (closeError) {
        console.error("Error cerrando sala:", closeError);
      }

      const { error: deleteAllError } = await supabase
        .from("room_players")
        .delete()
        .eq("room_code", code);

      if (deleteAllError) {
        console.error("Error borrando jugadores de sala:", deleteAllError);
      }

      router.push("/");
      return;
    }

    if (me?.id) {
      const { error: deleteError } = await supabase
        .from("room_players")
        .delete()
        .eq("id", me.id);

      if (deleteError) {
        console.error("Error borrando jugador:", deleteError);
      }
    }

    const remainingPlayers = await fetchPlayers(playerIdentityRef.current);

    if (remainingPlayers.length === 0) {
      await supabase
        .from("rooms")
        .update({
          status: "closed",
          last_activity_at: new Date().toISOString(),
        })
        .eq("code", code);
    } else {
      await touchRoomActivity({
        supabase,
        code,
      });
    }

    router.push("/");
  } catch (error) {
    console.error("Error saliendo de la sala:", error);
    router.push("/");
  }
}

export async function togglePlayerReady(params: {
  supabase: SupabaseClient;
  code: string;
  currentPlayerName: string;
  players: RoomPlayer[];
}) {
  const { supabase, code, currentPlayerName, players } = params;

  if (!currentPlayerName) return;

  const me = players.find((player) => player.player_name === currentPlayerName);
  if (!me) return;

  const { error } = await supabase
    .from("room_players")
    .update({ is_ready: !me.is_ready })
    .eq("id", me.id);

  if (error) {
    console.error("Error actualizando ready:", error);
    return;
  }

  await touchRoomActivity({
    supabase,
    code,
  });
}

export async function changeRoomVariant(params: {
  supabase: SupabaseClient;
  code: string;
  room: Room | null;
  isHost: boolean;
  roomMaxPlayers: number;
  variantKey: string;
}) {
  const { supabase, code, room, isHost, roomMaxPlayers, variantKey } = params;

  if (!room || !isHost) return;
  if (room.status !== "waiting") return;
  if (!room.game_slug) return;

  const nextSettings = buildRoomSettings(
    room.game_slug,
    variantKey,
    roomMaxPlayers,
  );

  const nextMaxPlayers =
    typeof nextSettings.max_players === "number"
      ? nextSettings.max_players
      : roomMaxPlayers;

  const { error } = await supabase
    .from("rooms")
    .update({
      game_variant: variantKey,
      room_settings: nextSettings,
      max_players: nextMaxPlayers,
      last_activity_at: new Date().toISOString(),
    })
    .eq("code", code);

  if (error) {
    console.error("Error cambiando variante:", error);
  }
}

export async function startRoomGame(params: {
  supabase: SupabaseClient;
  router: AppRouterInstance;
  code: string;
  room: Room | null;
  isHost: boolean;
  allReady: boolean;
  players: RoomPlayer[];
  minPlayersToStart: number;
  setStarting: (starting: boolean) => void;
}) {
  const {
    supabase,
    router,
    code,
    room,
    isHost,
    allReady,
    players,
    minPlayersToStart,
    setStarting,
  } = params;

  if (!room || !isHost || !allReady || players.length < minPlayersToStart) {
    return;
  }

  try {
    setStarting(true);

    const { error } = await supabase
      .from("rooms")
      .update({
        status: "playing",
        started_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
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
}

export async function copyRoomCode(params: {
  code: string;
  setCopied: (copied: boolean) => void;
}) {
  const { code, setCopied } = params;

  try {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  } catch (error) {
    console.error("Error copiando código:", error);
  }
}

export async function loadPlayersWithProfiles(params: {
  supabase: SupabaseClient;
  code: string;
}) {
  return fetchRoomPlayers({
    supabase: params.supabase,
    code: params.code,
  });
}
