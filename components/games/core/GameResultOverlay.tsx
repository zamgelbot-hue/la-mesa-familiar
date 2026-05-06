// 📍 Ruta del archivo: components/games/core/GameResultOverlay.tsx

import { motion, AnimatePresence } from "framer-motion";

type ResultTone = "win" | "lose" | "draw" | "neutral";

type Props = {
  show: boolean;
  title: string;
  subtitle?: string;
  resultText?: string;
  winnerName?: string | null;
  pointsText?: string;
  tone?: ResultTone;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
};

const toneStyles: Record<
  ResultTone,
  {
    border: string;
    glow: string;
    badge: string;
    icon: string;
  }
> = {
  win: {
    border: "border-emerald-400/35",
    glow: "bg-emerald-500/20",
    badge: "border-emerald-400/30 bg-emerald-500/15 text-emerald-200",
    icon: "🏆",
  },
  lose: {
    border: "border-red-400/30",
    glow: "bg-red-500/15",
    badge: "border-red-400/25 bg-red-500/10 text-red-200",
    icon: "💥",
  },
  draw: {
    border: "border-yellow-400/30",
    glow: "bg-yellow-500/15",
    badge: "border-yellow-400/25 bg-yellow-500/10 text-yellow-200",
    icon: "🤝",
  },
  neutral: {
    border: "border-orange-400/30",
    glow: "bg-orange-500/15",
    badge: "border-orange-400/25 bg-orange-500/10 text-orange-200",
    icon: "🎮",
  },
};

export default function GameResultOverlay({
  show,
  title,
  subtitle,
  resultText,
  winnerName,
  pointsText,
  tone = "neutral",
  primaryActionLabel = "Volver a sala",
  secondaryActionLabel,
  onPrimaryAction,
  onSecondaryAction,
}: Props) {
  const styles = toneStyles[tone];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.88, y: 18, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 12, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 18 }}
            className={`relative w-full max-w-xl overflow-hidden rounded-[34px] border ${styles.border} bg-zinc-950 p-7 text-center shadow-[0_0_55px_rgba(249,115,22,0.16)]`}
          >
            <div className={`absolute left-1/2 top-[-130px] h-64 w-64 -translate-x-1/2 rounded-full ${styles.glow} blur-3xl`} />

            <div className="relative">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/5 text-4xl">
                {styles.icon}
              </div>

              <div
                className={`mx-auto mt-5 inline-flex rounded-full border px-4 py-1.5 text-xs font-black uppercase tracking-[0.22em] ${styles.badge}`}
              >
                Resultado
              </div>

              <h2 className="mt-5 text-4xl font-extrabold text-white md:text-5xl">
                {title}
              </h2>

              {subtitle && (
                <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-white/70">
                  {subtitle}
                </p>
              )}

              {winnerName && (
                <div className="mx-auto mt-5 rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">
                    Ganador
                  </p>
                  <p className="mt-1 text-2xl font-black text-orange-300">
                    {winnerName}
                  </p>
                </div>
              )}

              {resultText && (
                <p className="mt-5 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-semibold text-white/75">
                  {resultText}
                </p>
              )}

              {pointsText && (
                <p className="mt-3 text-sm font-bold text-emerald-300">
                  {pointsText}
                </p>
              )}

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                {onPrimaryAction && (
                  <button
                    type="button"
                    onClick={onPrimaryAction}
                    className="flex-1 rounded-2xl bg-orange-500 px-5 py-3.5 text-base font-black text-black transition hover:bg-orange-400"
                  >
                    {primaryActionLabel}
                  </button>
                )}

                {secondaryActionLabel && onSecondaryAction && (
                  <button
                    type="button"
                    onClick={onSecondaryAction}
                    className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-5 py-3.5 text-base font-bold text-white transition hover:bg-white/10"
                  >
                    {secondaryActionLabel}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}