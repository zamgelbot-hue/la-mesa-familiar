// 📍 Ruta del archivo: components/games/secuencia-oculta/SecuenciaOcultaCell.tsx

import { motion } from "framer-motion";
import type { SecuenciaCell } from "./secuenciaOcultaTypes";

type Props = {
  cell: SecuenciaCell;
  disabled: boolean;
  onClick: (cell: SecuenciaCell) => void;
};

export default function SecuenciaOcultaCell({ cell, disabled, onClick }: Props) {
  const showValue = cell.revealed || cell.failed;

  return (
    <motion.button
      type="button"
      whileTap={{ scale: disabled ? 1 : 0.94 }}
      disabled={disabled}
      onClick={() => onClick(cell)}
      className={
        cell.failed
          ? "aspect-square rounded-2xl border border-red-400 bg-red-500/30 text-4xl font-black text-red-100 shadow-[0_0_24px_rgba(239,68,68,0.28)] transition md:text-5xl"
          : showValue
            ? "aspect-square rounded-2xl border border-orange-400 bg-orange-500/25 text-4xl font-black text-orange-100 shadow-[0_0_24px_rgba(249,115,22,0.18)] transition md:text-5xl"
            : "aspect-square rounded-2xl border border-white/10 bg-zinc-900 text-3xl font-black text-white/20 shadow-inner transition hover:border-orange-400/50 hover:bg-zinc-800 disabled:cursor-not-allowed md:text-4xl"
      }
    >
      {showValue ? cell.value : "?"}
    </motion.button>
  );
}