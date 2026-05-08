// 📍 Ruta del archivo: components/games/domino/DominoResultSummary.tsx

import type { DominoState } from "./dominoTypes";
import { getHandPipSum } from "./dominoUtils";

type Props = {
  state: DominoState;
};

export default function DominoResultSummary({ state }: Props) {
  if (state.status !== "finished") return null;

  return (
    <section className="rounded-[30px] border border-orange-500/20 bg-orange-500/10 p-5">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-200/70">
        Resultado
      </p>
      <h2 className="mt-2 text-3xl font-black text-white">
        {state.winner_name ? `Ganó ${state.winner_name}` : "Empate"}
      </h2>
      <p className="mt-2 text-white/60">{state.result_text}</p>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {state.players.map((player) => (
          <div
            key={player.key}
            className="rounded-2xl border border-white/10 bg-black/60 p-4"
          >
            <p className="font-black text-white">{player.name}</p>
            <p className="mt-1 text-sm text-white/45">
              {state.hands[player.key]?.length ?? 0} fichas restantes · suma {" "}
              {getHandPipSum(state.hands[player.key] ?? [])}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
