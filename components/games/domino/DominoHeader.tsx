// 📍 Ruta del archivo: components/games/domino/DominoHeader.tsx

import type { DominoState } from "./dominoTypes";
import { getDominoPlayerName, getDominoVariantLabel } from "./dominoUtils";

type Props = {
  roomCode: string;
  state: DominoState;
  variant?: string | null;
  currentPlayerName?: string;
  onBackToRoom?: () => void;
};

export default function DominoHeader({
  roomCode,
  state,
  variant,
  currentPlayerName,
  onBackToRoom,
}: Props) {
  const turnName = getDominoPlayerName(state, state.current_turn_key);

  return (
    <header className="rounded-[34px] border border-orange-500/20 bg-zinc-950/90 p-6 shadow-[0_0_45px_rgba(249,115,22,0.08)] md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-300">
            La Mesa Familiar
          </p>
          <h1 className="mt-2 text-4xl font-black text-white md:text-5xl">
            Dominó
          </h1>
          <p className="mt-2 text-sm text-white/55">
            Sala {roomCode} · {getDominoVariantLabel(variant ?? state.variant)}
          </p>
        </div>

        <button
          type="button"
          onClick={onBackToRoom}
          className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-black hover:bg-orange-400"
        >
          Volver a sala
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-black/60 p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-white/35">
            Tú
          </p>
          <p className="mt-2 text-xl font-black text-white">
            {currentPlayerName || "Jugador"}
          </p>
        </div>

        <div className="rounded-3xl border border-orange-500/20 bg-orange-500/10 p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-200/60">
            Turno
          </p>
          <p className="mt-2 text-xl font-black text-orange-100">
            {turnName || "Esperando"}
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/60 p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-white/35">
            Pozo
          </p>
          <p className="mt-2 text-xl font-black text-white">
            {state.boneyard.length} fichas
          </p>
        </div>
      </div>
    </header>
  );
}
