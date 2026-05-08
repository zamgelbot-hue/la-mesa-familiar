// 📍 Ruta del archivo: components/rewards/DailyRewardModal.tsx

"use client";

import { AnimatePresence, motion } from "framer-motion";

type Props = {
  open: boolean;
  onClose: () => void;
  streak: number;
  available: boolean;
  claiming: boolean;
  claimedMessage?: string | null;
  onClaim: () => void;
};

const REWARD_TABLE = [
  { day: 1, points: 10 },
  { day: 2, points: 15 },
  { day: 3, points: 20 },
  { day: 4, points: 25 },
  { day: 5, points: 30 },
  { day: 6, points: 35 },
  { day: 7, points: 50 },
];

export default function DailyRewardModal({
  open,
  onClose,
  streak,
  available,
  claiming,
  claimedMessage,
  onClaim,
}: Props) {
  const currentDay = Math.min((streak % 7) + 1, 7);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            className="w-full max-w-xl overflow-hidden rounded-[34px] border border-orange-500/25 bg-zinc-950 shadow-[0_0_70px_rgba(249,115,22,0.25)]"
          >
            <div className="relative p-7">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.25),transparent_45%)]" />

              <div className="relative">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-orange-500/30 bg-orange-500/10 text-5xl shadow-[0_0_35px_rgba(249,115,22,0.35)]">
                  🎁
                </div>

                <h2 className="mt-5 text-center text-4xl font-black text-white">
                  Recompensa diaria
                </h2>

                <p className="mt-2 text-center text-white/60">
                  Entra cada día, reclama puntos y mantén tu racha activa.
                </p>

                <div className="mt-7 grid grid-cols-7 gap-2">
                  {REWARD_TABLE.map((reward) => {
                    const active = reward.day === currentDay;
                    const completed = reward.day < currentDay;

                    return (
                      <div
                        key={reward.day}
                        className={`rounded-2xl border p-3 text-center ${
                          active
                            ? "border-orange-500 bg-orange-500/15 shadow-[0_0_18px_rgba(249,115,22,0.3)]"
                            : completed
                              ? "border-emerald-500/25 bg-emerald-500/10"
                              : "border-white/10 bg-white/[0.04]"
                        }`}
                      >
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/45">
                          Día
                        </p>
                        <p className="text-lg font-black text-white">
                          {reward.day}
                        </p>
                        <p className="mt-1 text-xs font-black text-orange-300">
                          {reward.points}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 rounded-3xl border border-white/10 bg-black/45 p-5 text-center">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">
                    Racha actual
                  </p>
                  <p className="mt-2 text-3xl font-black text-white">
                    🔥 {streak} día{streak === 1 ? "" : "s"}
                  </p>

                  {claimedMessage && (
                    <p className="mt-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-200">
                      {claimedMessage}
                    </p>
                  )}
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 font-black text-white hover:bg-white/10"
                  >
                    Cerrar
                  </button>

                  <button
                    type="button"
                    disabled={!available || claiming}
                    onClick={onClaim}
                    className="flex-1 rounded-2xl bg-orange-500 px-5 py-4 font-black text-black hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {claiming
                      ? "Reclamando..."
                      : available
                        ? "Reclamar"
                        : "Ya reclamado"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}