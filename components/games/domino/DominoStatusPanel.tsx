// 📍 Ruta del archivo: components/games/domino/DominoStatusPanel.tsx

import type { DominoState } from "./dominoTypes";
import { getDominoPlayerName } from "./dominoUtils";

type Props = {
  state: DominoState;
  isMyTurn: boolean;
  canPass: boolean;
  saving?: boolean;
  message?: string;
  onPass?: () => void;
};

export default function DominoStatusPanel({
  state,
  isMyTurn,
  canPass,
  saving = false,
  message,
  onPass,
}: Props) {
  const turnName = getDominoPlayerName(state, state.current_turn_key);

  return (
    <section className="rounded-[30px] border border-white/10 bg-zinc-950/90 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-300/70">
            Estado
          </p>
          <h2 className="mt-1 text-2xl font-black text-white">
            {state.status === "finished"
              ? "Partida terminada"
              : isMyTurn
                ? "Es tu turno"
                : `Turno de ${turnName || "jugador"}`}
          </h2>
          <p className="mt-1 text-sm text-white/45">
            {state.last_action_text ?? "Partida lista"}
          </p>
        </div>

        <button
          type="button"
          disabled={!isMyTurn || !canPass || saving || state.status !== "playing"}
          onClick={onPass}
          className={`rounded-2xl px-5 py-3 text-sm font-black transition ${
            isMyTurn && canPass && state.status === "playing"
              ? "bg-orange-500 text-black hover:bg-orange-400"
              : "border border-white/10 bg-black text-white/25"
          }`}
        >
          {saving ? "Guardando..." : "Pasar turno"}
        </button>
      </div>

      {message && (
        <p className="mt-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-sm font-bold text-yellow-200">
          {message}
        </p>
      )}
    </section>
  );
}
