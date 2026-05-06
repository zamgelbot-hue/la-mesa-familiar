// 📍 Ruta del archivo: components/games/gato/GatoBoard.tsx

import type { CellValue } from "./utils";
import GatoCell from "./GatoCell";

type Props = {
  board: CellValue[];
  boardSize: number;
  winningLine: number[];
  disabled: boolean;
  onCellClick: (index: number) => void;
};

export default function GatoBoard({
  board,
  boardSize,
  winningLine,
  disabled,
  onCellClick,
}: Props) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-4">
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))`,
        }}
      >
        {board.map((cell, index) => (
          <GatoCell
            key={index}
            value={cell}
            isWinningCell={winningLine.includes(index)}
            disabled={disabled}
            onClick={() => onCellClick(index)}
          />
        ))}
      </div>
    </div>
  );
}