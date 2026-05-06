// 📍 Ruta del archivo: components/room/PlayersList.tsx

import PlayerAvatar from "@/components/PlayerAvatar";
import { getAvatarByKey, getFrameByKey } from "@/lib/profile/profileCosmetics";
import type { ProfileMap, RoomPlayer } from "@/lib/room/roomTypes";

type Props = {
  players: RoomPlayer[];
  profilesMap: ProfileMap;
  currentPlayerName: string;
  roomMaxPlayers: number;
  isVsBot: boolean;
};

export default function PlayersList({
  players,
  profilesMap,
  currentPlayerName,
  roomMaxPlayers,
  isVsBot,
}: Props) {
  return (
    <div className="space-y-4">
      {players.map((player) => {
        const isMe = player.player_name === currentPlayerName;
        const profile = player.user_id ? profilesMap[player.user_id] : null;

        const avatar = getAvatarByKey(
          player.is_guest ? "avatar_guest" : profile?.avatar_key ?? "avatar_sun",
        );

        const frame = getFrameByKey(
          player.is_guest ? "frame_guest" : profile?.frame_key ?? "frame_orange",
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

      {isVsBot && (
        <div className="rounded-[26px] border border-cyan-400/20 bg-cyan-500/10 px-5 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-2xl font-extrabold md:text-3xl">
                Bot Familiar 🤖
              </p>
              <p className="mt-1 text-sm text-cyan-100/70 md:text-base">
                Rival automático
              </p>
            </div>

            <span className="rounded-full bg-cyan-500/15 px-5 py-2 text-sm font-bold text-cyan-200">
              Listo
            </span>
          </div>
        </div>
      )}

      {!isVsBot &&
        Array.from({
          length: Math.max(roomMaxPlayers - players.length, 0),
        }).map((_, index) => (
          <div
            key={`empty-slot-${index}`}
            className="rounded-[26px] border border-dashed border-white/10 bg-white/[0.03] px-5 py-8 text-center text-white/50"
          >
            Esperando jugador...
          </div>
        ))}
    </div>
  );
}
