"use client";

import { useEffect, useMemo, useState } from "react";

type LoteriaVictoryOverlayProps = {
  open: boolean;
  winnerName: string;
  patternLabel: string;
  onClose: () => void;
};

type ConfettiPiece = {
  id: number;
  left: string;
  delay: string;
  duration: string;
  rotate: string;
  size: string;
};

export default function LoteriaVictoryOverlay({
  open,
  winnerName,
  patternLabel,
  onClose,
}: LoteriaVictoryOverlayProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const timeout = setTimeout(() => {
        onClose();
      }, 5000);

      return () => clearTimeout(timeout);
    }
  }, [open, onClose]);

  const confetti = useMemo<ConfettiPiece[]>(() => {
    return Array.from({ length: 42 }).map((_, index) => ({
      id: index,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 0.6}s`,
      duration: `${2.2 + Math.random() * 1.8}s`,
      rotate: `${Math.floor(Math.random() * 360)}deg`,
      size: `${8 + Math.floor(Math.random() * 8)}px`,
    }));
  }, [mounted]);

  if (!open) return null;

  return (
    <div className="pointer-events-auto fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4 backdrop-blur-[2px]">
      <div className="absolute inset-0 overflow-hidden">
        {confetti.map((piece) => (
          <span
            key={piece.id}
            className="absolute top-[-40px] animate-[loteria_confetti_fall_linear_forwards]"
            style={{
              left: piece.left,
              animationDelay: piece.delay,
              animationDuration: piece.duration,
              width: piece.size,
              height: `calc(${piece.size} * 1.8)`,
              transform: `rotate(${piece.rotate})`,
              background:
                piece.id % 4 === 0
                  ? "#f97316"
                  : piece.id % 4 === 1
                  ? "#facc15"
                  : piece.id % 4 === 2
                  ? "#10b981"
                  : "#38bdf8",
              borderRadius: "2px",
            }}
          />
        ))}

        <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-400/10 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-yellow-300/20 animate-ping" />
        <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full border border-orange-400/10 animate-ping [animation-duration:1.8s]" />
      </div>

      <div className="relative w-full max-w-2xl rounded-[36px] border border-yellow-400/25 bg-zinc-950/95 p-8 text-center shadow-[0_0_60px_rgba(250,204,21,0.15)]">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-yellow-300/80">
          ¡Tenemos ganador!
        </p>

        <div className="mt-5 text-6xl">🎉</div>

        <h2 className="mt-4 text-4xl font-black text-white md:text-5xl">
          {winnerName}
        </h2>

        <p className="mt-3 text-xl font-bold text-orange-300">
          ganó la partida
        </p>

        <p className="mt-4 text-white/70">
          Patrón ganador:{" "}
          <span className="font-bold text-emerald-300">{patternLabel}</span>
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/75">
            Confeti activado
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/75">
            Victoria épica
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-8 rounded-2xl bg-orange-500 px-5 py-3 font-extrabold text-black transition hover:bg-orange-400"
        >
          Seguir viendo
        </button>
      </div>

      <style jsx global>{`
        @keyframes loteria_confetti_fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotate(720deg);
            opacity: 1;
          }
        }

        .animate-\\[loteria_confetti_fall_linear_forwards\\] {
          animation-name: loteria_confetti_fall;
          animation-timing-function: linear;
          animation-fill-mode: forwards;
        }
      `}</style>
    </div>
  );
}
