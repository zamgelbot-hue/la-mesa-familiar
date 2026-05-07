// 📍 Ruta del archivo: components/games/pregunta/QuestionHeader.tsx

import type { QuestionCategory, QuestionGamePhase } from "@/lib/games/pregunta/questionTypes";
import { categoryLabel } from "@/lib/games/pregunta/questionUtils";

type Props = {
  roomCode: string;
  categoryMode: QuestionCategory;
  currentPlayerName: string;
  phase: QuestionGamePhase;
  timeLeftMs: number;
  isHost: boolean;
  leavingToRoom: boolean;
  onTerminateMatch: () => void;
  onBackToRoom: () => void;
};

export default function QuestionHeader({
  roomCode,
  categoryMode,
  currentPlayerName,
  phase,
  timeLeftMs,
  isHost,
  leavingToRoom,
  onTerminateMatch,
  onBackToRoom,
}: Props) {
  return (
    <div className="mb-6 flex flex-col gap-4 rounded-[32px] border border-orange-500/15 bg-zinc-950/90 p-5 shadow-[0_0_40px_rgba(249,115,22,0.05)] md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-300/80">
          La Mesa Familiar
        </p>

        <h1 className="mt-1 text-3xl font-extrabold text-white">
          Pregunta Pregunta
        </h1>

        <p className="mt-2 text-sm text-white/60">
          Sala: <span className="font-bold text-orange-300">{roomCode}</span>
        </p>

        <p className="mt-1 text-sm text-white/60">
          Modo: <span className="font-bold text-white">{categoryLabel(categoryMode)}</span>
        </p>

        <p className="mt-1 text-sm text-white/60">
          Jugando como: <span className="font-bold text-white">{currentPlayerName}</span>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
            Fase
          </p>
          <p className="mt-1 font-bold text-white">{phase}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
            Tiempo
          </p>
          <p className="mt-1 font-bold text-orange-300">
            {Math.max(0, Math.ceil(timeLeftMs / 1000))}
          </p>
        </div>

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