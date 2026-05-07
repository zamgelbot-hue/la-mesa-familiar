// 📍 Ruta del archivo: components/games/secuencia-oculta/SecuenciaOcultaBoard.tsx

import type { SecuenciaCell } from "./secuenciaOcultaTypes";
import SecuenciaOcultaCell from "./SecuenciaOcultaCell";

type Props = {
  cells: SecuenciaCell[];
  boardSize: number;
  isMyTurn: boolean;
  disabled: boolean;
  onCellClick: (cell: SecuenciaCell) => void;
};

export default function SecuenciaOcultaBoard({
  cells,
  boardSize,
  isMyTurn,
  disabled,
  onCellClick,
}: Props) {
  return (
    <section className="rounded-[32px] border border-orange-500/15 bg-zinc-950/95 p-5 shadow-[0_0_40px_rgba(249,115,22,0.05)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black">Tablero oculto</h2>
          <p className="mt-1 text-sm text-white/55">
            Encuentra los números en orden. Si fallas, todo se oculta.
          </p>
        </div>

        <span
          className={
            isMyTurn
              ? "rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-300"
              : "rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-bold text-white/50"
          }
        >
          {isMyTurn ? "Tu turno" : "Espera tu turno"}
        </span>
      </div>

      <div
        className="mx-auto grid max-w-[680px] gap-2 md:gap-3"
        style={{ gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))` }}
      >
        {cells.map((cell) => (
          <SecuenciaOcultaCell
            key={cell.id}
            cell={cell}
            disabled={disabled}
            onClick={onCellClick}
          />
        ))}
      </div>
    </section>
  );
}