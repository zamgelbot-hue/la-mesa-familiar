// 📍 Ruta del archivo: components/games/guerra-total/GuerraTotalResultSummary.tsx

import type { GtShot, GtVariantTheme } from "./guerraTotalTypes";
import { getShotResultClass, getShotResultLabel } from "./guerraTotalUtils";

type Props = {
  shots: GtShot[];
  theme: GtVariantTheme;
};

export default function GuerraTotalResultSummary({ shots, theme }: Props) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-zinc-950/90 p-5">
      <h2 className="text-xl font-black">📜 Últimos ataques</h2>

      <div className="mt-4 max-h-[360px] space-y-2 overflow-y-auto pr-1">
        {shots.length === 0 && (
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/50">
            Todavía no hay ataques.
          </p>
        )}

        {shots.slice(0, 20).map((shot) => (
          <div
            key={shot.id}
            className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
          >
            <p className="text-sm text-white/70">
              <span className="font-bold text-white">{shot.attackerName}</span>{" "}
              atacó {shot.cell.row + 1}-{shot.cell.col + 1}
            </p>

            <p className={getShotResultClass(shot.result)}>
              {getShotResultLabel(shot, theme)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}