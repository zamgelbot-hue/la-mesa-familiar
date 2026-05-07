// 📍 Ruta del archivo: components/games/secuencia-oculta/SecuenciaOcultaResultSummary.tsx

import type { SecuenciaMove } from "./secuenciaOcultaTypes";

type Props = {
  moves: SecuenciaMove[];
};

export default function SecuenciaOcultaResultSummary({ moves }: Props) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-zinc-950/90 p-5">
      <h2 className="text-xl font-black">📜 Historial</h2>

      <div className="mt-4 max-h-[320px] space-y-2 overflow-y-auto pr-1">
        {moves.length === 0 && (
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/50">
            Todavía no hay movimientos.
          </p>
        )}

        {moves.slice(0, 20).map((move) => (
          <div
            key={move.id}
            className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
          >
            <p className="text-sm text-white/70">
              <span className="font-bold text-white">{move.playerName}</span>{" "}
              eligió #{move.value}
            </p>

            <p
              className={
                move.correct
                  ? "text-sm font-bold text-emerald-300"
                  : "text-sm font-bold text-red-300"
              }
            >
              {move.correct ? "Correcto" : "Falló la secuencia"}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}