// 📍 Ruta del archivo: lib/home/homeRoomActions.ts

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { PlayerIdentity } from "@/lib/profile/getPlayerIdentity";
import {
  buildRoomSettings,
  getDefaultVariantForGame,
} from "@/lib/games/gameCatalog";
import { savePlayerIdentity } from "./homeStorage";
import type { Game, RoomVisibility } from "./homeTypes";

function generateRoomCode(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";

  for (let i = 0; i < length; i += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

export async function createHomeRoom(params: {
  supabase: SupabaseClient;
  router: AppRouterInstance;
  selectedGame: Game | null;
  selectedVariantKey: string;
  maxPlayers: number;
  roomVisibility: RoomVisibility;
  playerIdentity: PlayerIdentity | null;
  setErrorMessage: (message: string) => void;
}) {
  const {
    supabase,
    router,
    selectedGame,
    selectedVariantKey,
    maxPlayers,
    roomVisibility,
    playerIdentity,
    setErrorMessage,
  } = params;

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

  if (roomVisibility === "friends" && playerIdentity.is_guest) {
    setErrorMessage(
      "Las salas de amigos solo están disponibles para cuentas registradas.",
    );
    return;
  }

  let roomCode = "";
  let created = false;
  let attempts = 0;

  const finalVariantKey =
    selectedVariantKey || getDefaultVariantForGame(selectedGame.slug);

  const finalMaxPlayers =
    selectedGame.slug === "piedra-papel-o-tijera" ? 2 : maxPlayers;

  const roomSettings = buildRoomSettings(
    selectedGame.slug,
    finalVariantKey,
    finalMaxPlayers,
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
      visibility: roomVisibility,
      created_by: playerIdentity.user_id,
      last_activity_at: new Date().toISOString(),
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
}

export async function joinHomeRoom(params: {
  supabase: SupabaseClient;
  router: AppRouterInstance;
  joinCode: string;
  playerIdentity: PlayerIdentity | null;
  setErrorMessage: (message: string) => void;
}) {
  const { supabase, router, joinCode, playerIdentity, setErrorMessage } = params;

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
    savePlayerIdentity(
      normalizedCode,
      existingMe.player_name,
      !!existingMe.is_host,
    );

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

  await supabase
    .from("rooms")
    .update({ last_activity_at: new Date().toISOString() })
    .eq("code", normalizedCode);

  savePlayerIdentity(normalizedCode, finalName, false);

  router.push(`/sala/${normalizedCode}`);
}
