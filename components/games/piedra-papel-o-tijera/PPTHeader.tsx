// 📍 Ruta del archivo: components/games/piedra-papel-o-tijera/PPTHeader.tsx

import { motion } from "framer-motion";

import {
  GameBadge,
  GamePrimaryButton,
  GameTopBar,
} from "@/components/games/core";

type Props = {
  code: string;
  roomStatus: string;
  currentPlayerName: string;
  modeLabel: string;
  modeDescription: string;
  isVsBot: boolean;
  onBackToRoom: () => void;
};

export default function PPTHeader({
  code,
  roomStatus,
  currentPlayerName,
  modeLabel,
  modeDescription,
  isVsBot,
  onBackToRoom,
}: Props) {
  return (
    <motion.div layout>
      <GameTopBar
        title="Piedra, Papel o Tijera"
        subtitle="La Mesa Familiar"
        rightContent={
          <>
            <div className="flex flex-col items-end gap-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-right">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/40">
                  Modo
                </p>

                <p className="text-lg font-black text-yellow-300">
                  {modeLabel}
                </p>

                <p className="text-xs text-white/55">
                  {modeDescription}
                </p>
              </div>

              <GamePrimaryButton onClick={onBackToRoom}>
                Volver a sala
              </GamePrimaryButton>
            </div>
          </>
        }
      >
        <div />
      </GameTopBar>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <GameBadge tone="orange">
          Sala: {code}
        </GameBadge>

        <GameBadge tone="warning">
          Estado: {roomStatus}
        </GameBadge>

        <GameBadge tone="success">
          Jugador: {currentPlayerName || "Detectando..."}
        </GameBadge>

        {isVsBot && (
          <GameBadge className="border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
            VS BOT · 1 punto por victoria
          </GameBadge>
        )}
      </div>
    </motion.div>
  );
}