// 📍 Ruta del archivo: components/games/piedra-papel-o-tijera/PPTLiveSummary.tsx

import { motion } from "framer-motion";
import type { GameState, RoomPlayer } from "./pptTypes";

type Props = {
  players: RoomPlayer[];
  gameState: GameState;
  modeLabel: string;
  shouldRevealChoices: boolean;
};

const choiceLabels: Record<string, string> = {
  piedra: "Piedra ✊",
  papel: "Papel ✋",
  tijera: "Tijera ✌️",
};

export default function PPTLiveSummary({
  players,
  gameState,
  modeLabel,
  shouldRevealChoices,
}: Props) {
  return (
    <motion.div
      layout
      className="rounded-3xl border border-white/10 bg-white/[0.05] p-5"
    >
      <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-200">
        Resumen en vivo
      </p>

      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between rounded-2xl bg-black/25 px-4 py-3">
          <span className="text-sm text-white/60">Modo</span>
          <span className="font-bold text-white">{modeLabel}</span>
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-black/25 px-4 py-3">
          <span className="text-sm text-white/60">Ronda</span>
          <span className="font-bold text-white">{gameState.round}</span>
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-black/25 px-4 py-3">
          <span className="text-sm text-white/60">Estado</span>
          <span className="font-bold text-white">
            {gameState.matchOver
              ? "Partida terminada"
              : shouldRevealChoices
                ? "Mostrando resultado"
                : "Esperando jugadas"}
          </span>
        </div>

        <div className="rounded-2xl bg-black/25 px-4 py-3">
          <p className="text-sm text-white/60">Jugadas</p>

          <div className="mt-3 space-y-2">
            {players.map((player) => {
              const choice = gameState.playerChoices?.[player.player_name];

              return (
                <div
                  key={player.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.04] px-3 py-2"
                >
                  <span className="truncate text-sm font-semibold text-white">
                    {player.player_name}
                  </span>

                  <span className="text-sm font-bold text-orange-200">
                    {choice
                      ? shouldRevealChoices || gameState.matchOver
                        ? choiceLabels[choice] ?? choice
                        : "Lista"
                      : "Pendiente"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {gameState.roundWinner && (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200/70">
              Última ronda
            </p>
            <p className="mt-1 text-sm font-bold text-emerald-200">
              Ganó {gameState.roundWinner}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}