// 📍 Ruta del archivo: components/games/domino/DominoPlayersPanel.tsx

import type { DominoState } from "./dominoTypes";
import { getHandPipSum } from "./dominoUtils";

type Props = {
  state: DominoState;
  currentPlayerKey?: string | null;
};

export default function DominoPlayersPanel({ state, currentPlayerKey }: Props) {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      {state.players.map((player) => {
        const hand = state.hands[player.key] ?? [];
        const isTurn = state.current_turn_key === player.key;
        const isMe = currentPlayerKey === player.key;

        return (
          <article
            key={player.key}
            className={`rounded-[28px] border p-5 transition ${
              isTurn
                ? "border-orange-500/50 bg-orange-500/10 shadow-[0_0_28px_rgba(249,115,22,0.12)]"
                : "border-white/10 bg-zinc-950/90"
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/35">
                  {isMe ? "Tú" : player.isHost ? "Host" : "Invitado"}
                </p>
                <h3 className="mt-1 text-xl font-black text-white">
                  {player.name}
                </h3>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-right">
                <p className="text-2xl font-black text-orange-200">
                  {hand.length}
                </p>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
                  fichas
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm">
              <span className="text-white/45">Suma de mano</span>
              <span className="font-black text-white">{getHandPipSum(hand)}</span>
            </div>
          </article>
        );
      })}
    </section>
  );
}
