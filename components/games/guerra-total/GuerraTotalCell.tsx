// 📍 Ruta del archivo: components/games/guerra-total/GuerraTotalCell.tsx

import type { GtCell, GtCellStatus, GtVariantTheme } from "./guerraTotalTypes";
import { cellKey } from "./guerraTotalUtils";

type Props = {
  cell: GtCell;
  status: GtCellStatus;
  label: string;
  theme: GtVariantTheme;
  clickable: boolean;
  saving: boolean;
  onHover: (cell: GtCell) => void;
  onClick: (cell: GtCell) => void;
};

function getCellClass(
  status: GtCellStatus,
  theme: GtVariantTheme,
  clickable = false,
) {
  const base =
    "aspect-square rounded-lg border font-black transition flex items-center justify-center leading-none overflow-hidden";

  const cursor = clickable ? " cursor-pointer hover:scale-[1.06]" : "";

  let size = "text-[2.2rem] md:text-[2.5rem] lg:text-[2.8rem]";

  if (status === "hit" || status === "hit-received") {
    size = "text-[2.6rem] md:text-[3rem] lg:text-[3.3rem]";
  }

  if (status === "sunk") {
    size = "text-[2.8rem] md:text-[3.3rem] lg:text-[3.6rem]";
  }

  if (status === "preview-valid") {
    return `${base} ${size}${cursor} border-emerald-400/70 bg-emerald-500/20 text-emerald-200 shadow-[0_0_18px_rgba(16,185,129,0.25)]`;
  }

  if (status === "preview-invalid") {
    return `${base} ${size}${cursor} border-red-400/70 bg-red-500/20 text-red-200 shadow-[0_0_18px_rgba(239,68,68,0.25)]`;
  }

  if (status === "ship") {
    return `${base} ${size}${cursor} ${theme.shipCellClass}`;
  }

  if (status === "hit" || status === "hit-received") {
    return `${base} ${size}${cursor} ${theme.hitCellClass}`;
  }

  if (status === "sunk") {
    return `${base} ${size}${cursor} ${theme.sunkCellClass}`;
  }

  if (status === "water" || status === "miss-received") {
    return `${base} ${size}${cursor} ${theme.missCellClass}`;
  }

  return `${base} ${size}${cursor} ${theme.emptyCellClass}`;
}

function getLabelClass(status: GtCellStatus) {
  if (status === "hit" || status === "hit-received") {
    return "animate-ping transform scale-[1.15]";
  }

  if (status === "sunk") {
    return "animate-pulse transform scale-[1.2]";
  }

  if (status === "preview-valid" || status === "preview-invalid") {
    return "transform scale-[1.05] opacity-80";
  }

  return "transform scale-[1.1]";
}

export default function GuerraTotalCell({
  cell,
  status,
  label,
  theme,
  clickable,
  saving,
  onHover,
  onClick,
}: Props) {
  return (
    <button
      key={cellKey(cell)}
      type="button"
      disabled={!clickable || saving}
      onMouseEnter={() => onHover(cell)}
      onClick={() => onClick(cell)}
      className={getCellClass(status, theme, clickable)}
      title={`${cell.row + 1}-${cell.col + 1}`}
    >
      <span className={getLabelClass(status)}>{label}</span>
    </button>
  );
}