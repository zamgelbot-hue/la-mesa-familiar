// 📍 Ruta del archivo: components/games/pregunta/QuestionFinal.tsx

import type { QuestionPlayerSummary } from "@/lib/games/pregunta/questionTypes";

type Props = {
  players: QuestionPlayerSummary[];
  isHost: boolean;
  leavingToRoom: boolean;
  onTerminateMatch: () => void;
  onBackToRoom: () => void;
};

export default function QuestionFinal({
  players,
  isHost,
  leavingToRoom,
  onTerminateMatch,
  onBackToRoom,
}: Props) {
  const winner = players[0];

  return (
    <div className="rounded-[30px] border border-emerald-500/20 bg-emerald-500/10 p-6">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300/80">
        Resultado final
      </p>

      <h2 className="mt-2 text-3xl font-extrabold text-white">
        {winner ? `${winner.name} ganó la partida` : "Partida terminada"}
      </h2>

      <p className="mt-3 text-white/65">
        Ya puedes volver a la sala o iniciar otra partida.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        {isHost && (
          <button
            type="button"
            onClick={onTerminateMatch}
            disabled={leavingToRoom}
            className="rounded-2xl bg-red-500/90 px-4 py-3 font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {leavingToRoom ? "Terminando..." : "Terminar partida"}
          </button>
        )}

        <button
          type="button"
          onClick={onBackToRoom}
          disabled={leavingToRoom}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {leavingToRoom ? "Volviendo..." : "Volver a sala"}
        </button>
      </div>
    </div>
  );
}