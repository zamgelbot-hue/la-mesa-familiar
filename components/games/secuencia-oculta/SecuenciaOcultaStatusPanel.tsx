// 📍 Ruta del archivo: components/games/secuencia-oculta/SecuenciaOcultaStatusPanel.tsx

import type { SecuenciaGameState } from "./secuenciaOcultaTypes";

type Props = {
  gameState: SecuenciaGameState;
  isMyTurn: boolean;
};

export default function SecuenciaOcultaStatusPanel({
  gameState,
  isMyTurn,
}: Props) {
  if (gameState.phase === "finished") {
    return null;
  }

  return (
    <section
      className={
        isMyTurn
          ? "rounded-[28px] border border-emerald-500/20 bg-emerald-500/10 p-5"
          : "rounded-[28px] border border-purple-500/20 bg-purple-500/10 p-5"
      }
    >
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/45">
        Siguiente número
      </p>

      <h2 className="mt-2 text-5xl font-black text-white">
        #{gameState.nextNumber}
      </h2>

      <p className="mt-3 text-white/65">
        {isMyTurn
          ? "Encuentra este número para continuar tu turno."
          : `Le toca a ${gameState.currentTurnName ?? "otro jugador"}.`}
      </p>
    </section>
  );
}