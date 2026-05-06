// 📍 Ruta del archivo: components/games/gato/GatoCell.tsx

import type { CellValue } from "./utils";

type Props = {
  value: CellValue;
  isWinningCell: boolean;
  disabled: boolean;
  onClick: () => void;
};

export default function GatoCell({
  value,
  isWinningCell,
  disabled,
  onClick,
}: Props) {
  return (
    <button
      type="button"
      disabled={disabled || !!value}
      onClick={onClick}
      className={`flex aspect-square items-center justify-center rounded-2xl border text-3xl font-black transition sm:text-4xl ${
        isWinningCell
          ? "border-yellow-300/60 bg-yellow-400/20 text-yellow-200 shadow-[0_0_25px_rgba(250,204,21,0.18)]"
          : value === "X"
            ? "border-orange-400/35 bg-orange-500/15 text-orange-300"
            : value === "O"
              ? "border-cyan-400/35 bg-cyan-500/15 text-cyan-300"
              : "border-white/10 bg-black/25 text-white hover:border-orange-400/35 hover:bg-orange-500/10"
      } disabled:cursor-not-allowed disabled:opacity-80`}
    >
      {value ?? ""}
    </button>
  );
}