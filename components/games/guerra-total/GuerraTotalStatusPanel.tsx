// 📍 Ruta del archivo: components/games/guerra-total/GuerraTotalStatusPanel.tsx

import type { GtGameState } from "./guerraTotalTypes";

type Props = {
  gameState: GtGameState;
  isMyTurn: boolean;
};

export default function GuerraTotalStatusPanel({ gameState, isMyTurn }: Props) {
  if (gameState.phase === "placing") {
    return (
      <div className="rounded-[28px] border border-yellow-500/20 bg-yellow-500/10 p-5">
        <h2 className="text-xl font-black text-yellow-200">
          ⏳ Preparando batalla
        </h2>

        <p className="mt-2 text-sm text-white/70">
          Ambos jugadores deben colocar todas sus unidades y confirmar formación.
        </p>
      </div>
    );
  }

  if (gameState.phase === "battle") {
    return (
      <div
        className={
          isMyTurn
            ? "rounded-[28px] border border-emerald-500/20 bg-emerald-500/10 p-5"
            : "rounded-[28px] border border-purple-500/20 bg-purple-500/10 p-5"
        }
      >
        <h2 className="text-xl font-black">
          {isMyTurn ? "🔥 Es tu turno de atacar" : "⏳ Esperando ataque rival"}
        </h2>

        <p className="mt-2 text-sm text-white/70">
          {isMyTurn
            ? "Elige una casilla en el territorio enemigo."
            : `Le toca a ${gameState.currentTurnName ?? "tu rival"}.`}
        </p>
      </div>
    );
  }

  return null;
}