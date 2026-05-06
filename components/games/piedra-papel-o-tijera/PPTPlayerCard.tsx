// 📍 Ruta del archivo: components/games/piedra-papel-o-tijera/PPTPlayerCard.tsx

import PlayerAvatar from "@/components/PlayerAvatar";
import { GameInfoCard } from "@/components/games/core";
import { getAvatarByKey, getFrameByKey } from "@/lib/profile/profileCosmetics";
import { motion } from "framer-motion";

import type { Choice, ProfileMap, RoomPlayer } from "./pptTypes";

type Props = {
  player: RoomPlayer;
  currentPlayerName: string;
  profileMap: ProfileMap;
  score: number;
  currentChoice: Choice;
  shouldRevealChoices: boolean;
  isChampion: boolean;
};

const choiceLabels: Record<Exclude<Choice, null>, string> = {
  piedra: "Piedra",
  papel: "Papel",
  tijera: "Tijera",
};

export default function PPTPlayerCard({
  player,
  currentPlayerName,
  profileMap,
  score,
  currentChoice,
  shouldRevealChoices,
  isChampion,
}: Props) {
  const isMe = player.player_name === currentPlayerName;
  const profile = player.user_id ? profileMap[player.user_id] : null;

  const avatar = getAvatarByKey(
    player.is_guest ? "avatar_guest" : profile?.avatar_key ?? "avatar_sun",
  );

  const frame = getFrameByKey(
    player.is_guest ? "frame_guest" : profile?.frame_key ?? "frame_orange",
  );

  const roleLabel = isMe
    ? "Tú"
    : player.player_name.includes("Bot Familiar")
      ? "Rival automático"
      : player.is_guest
        ? "Invitado"
        : "Jugador";

  const choiceText = currentChoice
    ? shouldRevealChoices || isMe
      ? choiceLabels[currentChoice]
      : "Oculta"
    : "Sin jugar";

  const cardToneClass = isChampion
    ? "border-yellow-400/40 bg-yellow-500/10"
    : isMe
      ? "border-emerald-400/40 bg-emerald-500/10"
      : "border-white/10 bg-white/[0.05]";

  return (
    <motion.div layout>
      <GameInfoCard className={`transition ${cardToneClass}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <PlayerAvatar avatar={avatar} frame={frame} size="md" />

            <div className="min-w-0">
              <p className="truncate text-xl font-black text-white">
                {player.player_name} {player.is_host ? "👑" : ""}
              </p>

              <p className="text-sm text-white/55">{roleLabel}</p>
            </div>
          </div>

          <div className="rounded-2xl bg-black/30 px-4 py-3 text-center">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-white/35">
              Marcador
            </p>

            <p className="text-2xl font-black text-yellow-300">{score}</p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-black/25 px-4 py-3">
          <p className="text-xs text-white/45">Jugada actual</p>

          <p className="mt-1 text-base font-black text-white">{choiceText}</p>
        </div>
      </GameInfoCard>
    </motion.div>
  );
}