// 📍 Ruta del archivo: components/games/gato/GatoTurnPanel.tsx

import type { GatoState } from "./utils";

type Props = {
  state: GatoState;
  currentPlayerName: string;
  isVsBot: boolean;
};

export default function GatoTurnPanel({
  state,
  currentPlayerName,
  isVsBot,
}: Props) {
  const isMyTurn = state.current_turn === currentPlayerName;

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-5 text-center">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-200">
        Turno actual
      </p>

      <p className="mt-3 text-2xl font-black text-white">
        {state.match_over
          ? "Partida terminada"
          : state.current_turn ?? "Esperando jugadores"}
      </p>

      {!state.match_over && (
        <p
          className={`mt-3 rounded-2xl px-4 py-3 text-sm font-bold ${
            isMyTurn
              ? "bg-emerald-500/10 text-emerald-300"
              : "bg-black/25 text-white/55"
          }`}
        >
          {isMyTurn
            ? "Es tu turno. Elige una casilla."
            : isVsBot && state.current_turn?.includes("Bot Familiar")
              ? "El bot está pensando..."
              : "Espera tu turno."}
        </p>
      )}
    </div>
  );
}