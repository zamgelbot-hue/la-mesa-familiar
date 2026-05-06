// 📍 Ruta del archivo: components/games/gato/GatoPlayerCard.tsx

import PlayerAvatar from "@/components/PlayerAvatar";
import {
  GameBadge,
  GameInfoCard,
} from "@/components/games/core";
import { motion } from "framer-motion";

import {
  getAvatarByKey,
  getFrameByKey,
} from "@/lib/profile/profileCosmetics";

import type {
  GatoProfileMap,
  GatoRoomPlayer,
} from "./gatoTypes";

type Props = {
  player: GatoRoomPlayer;
  currentPlayerName: string;
  profileMap: GatoProfileMap;
  symbol: "X" | "O";
  score: number;
  isCurrentTurn: boolean;
  isChampion: boolean;
};

export default function GatoPlayerCard({
  player,
  currentPlayerName,
  profileMap,
  symbol,
  score,
  isCurrentTurn,
  isChampion,
}: Props) {
  const isMe = player.player_name === currentPlayerName;

  const profile = player.user_id
    ? profileMap[player.user_id]
    : null;

  const avatar = getAvatarByKey(
    player.is_guest
      ? "avatar_guest"
      : profile?.avatar_key ?? "avatar_sun",
  );

  const frame = getFrameByKey(
    player.is_guest
      ? "frame_guest"
      : profile?.frame_key ?? "frame_orange",
  );

  const cardToneClass = isChampion
    ? "border-yellow-400/40 bg-yellow-500/10"
    : isCurrentTurn
      ? "border-emerald-400/40 bg-emerald-500/10"
      : "border-white/10 bg-white/[0.05]";

  const roleText = isMe
    ? "Tú"
    : player.player_name.includes("Bot Familiar")
      ? "Rival automático"
      : player.is_guest
        ? "Invitado"
        : "Jugador";

  return (
    <motion.div layout>
      <GameInfoCard className={`transition ${cardToneClass}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <PlayerAvatar
              avatar={avatar}
              frame={frame}
              size="md"
            />

            <div className="min-w-0">
              <p className="truncate text-xl font-black text-white">
                {player.player_name}{" "}
                {player.is_host ? "👑" : ""}
              </p>

              <p className="text-sm text-white/55">
                {roleText}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <GameBadge tone="orange">
              Símbolo: {symbol}
            </GameBadge>

            <div className="rounded-2xl bg-black/30 px-4 py-3 text-center">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-white/35">
                Puntos
              </p>

              <p className="text-2xl font-black text-yellow-300">
                {score}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {isCurrentTurn && (
            <GameBadge tone="success">
              Turno actual
            </GameBadge>
          )}

          {isChampion && (
            <GameBadge tone="warning">
              Ganador
            </GameBadge>
          )}
        </div>
      </GameInfoCard>
    </motion.div>
  );
}