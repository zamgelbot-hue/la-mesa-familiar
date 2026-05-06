// 📍 Ruta del archivo: lib/room/roomRealtime.ts

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { Game, Room, RoomPlayer } from "./roomTypes";

export function subscribeToRoomRealtime(params: {
  supabase: SupabaseClient;
  code: string;
  router: AppRouterInstance;
  players: RoomPlayer[];
  currentPlayerName: string;
  setRoom: (room: Room) => void;
  fetchPlayers: () => Promise<RoomPlayer[]>;
  fetchRoom: () => Promise<Room | null>;
  fetchGame: (gameSlug?: string | null) => Promise<Game | null>;
}) {
  const {
    supabase,
    code,
    router,
    players,
    currentPlayerName,
    setRoom,
    fetchPlayers,
    fetchRoom,
    fetchGame,
  } = params;

  if (!code) return null;

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
      },
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

          if (nextRoom.status === "closed") {
            const me = players.find(
              (player) => player.player_name === currentPlayerName,
            );

            if (!me?.is_host) {
              window.alert("El host cerró la sala. Serás enviado al inicio.");
            }

            setTimeout(() => {
              router.replace("/");
            }, 100);

            return;
          }

          if (nextRoom.status === "playing") {
            router.replace(`/juego/${code}`);
          }

          return;
        }

        const freshRoom = await fetchRoom();

        if (freshRoom?.game_slug) {
          await fetchGame(freshRoom.game_slug);
        }
      },
    )
    .subscribe();

  return channel;
}

export function unsubscribeFromRoomRealtime(params: {
  supabase: SupabaseClient;
  channel: ReturnType<SupabaseClient["channel"]> | null;
}) {
  const { supabase, channel } = params;

  if (!channel) return;

  supabase.removeChannel(channel);
}
