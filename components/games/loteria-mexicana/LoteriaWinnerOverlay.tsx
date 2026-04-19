"use client";

import { useEffect, useMemo, useState } from "react";

type Particle = {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  rotate: number;
};

type LoteriaWinnerOverlayProps = {
  open: boolean;
  winnerName: string | null;
  patternLabel: string;
  onClose?: () => void;
};

export default function LoteriaWinnerOverlay({
  open,
  winnerName,
  patternLabel,
  onClose,
}: LoteriaWinnerOverlayProps) {
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    setVisible(open);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, 3600);

    return () => clearTimeout(timer);
  }, [open, onClose]);

  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: 26 }).map((_, index) => ({
      id: index,
      left: Math.random() * 100,
      delay: Math.random() * 0.8,
      duration: 1.8 + Math.random() * 1.8,
      size: 8 + Math.random() * 10,
      rotate: Math.random() * 360,
    }));
  }, [open]);

  if (!visible || !winnerName) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[120] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />

      {particles.map((particle) => (
        <span
          key={particle.id}
          className="absolute top-[-20px] rounded-sm"
          style={{
            left: `${particle.left}%`,
            width: `${particle.size}px`,
            height: `${particle.size * 1.6}px`,
            transform: `rotate(${particle.rotate}deg)`,
            animation: `loteria-confetti-fall ${particle.duration}s ease-in ${particle.delay}s forwards`,
            background:
              particle.id % 4 === 0
                ? "#f97316"
                : particle.id % 4 === 1
                ? "#22c55e"
                : particle.id % 4 === 2
                ? "#eab308"
                : "#38bdf8",
            opacity: 0.95,
          }}
        />
      ))}

      <div className="absolute h-72 w-72 rounded-full bg-yellow-400/20 blur-3xl animate-pulse" />
      <div className="absolute h-56 w-56 rounded-full bg-orange-500/20 blur-3xl animate-pulse" />

      <div className="relative mx-4 w-full max-w-2xl rounded-[34px] border border-yellow-400/30 bg-zinc-950/95 p-8 text-center shadow-[0_0_70px_rgba(250,204,21,0.18)]">
        <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full border border-yellow-400/35 bg-yellow-400/15 text-5xl shadow-[0_0_35px_rgba(250,204,21,0.18)]">
          👑
        </div>

        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-yellow-300/80">
          Tenemos ganador
        </p>

        <h2 className="mt-3 text-4xl font-black text-white md:text-5xl">
          {winnerName}
        </h2>

        <p className="mt-3 text-lg text-white/75">
          ¡Cantó <span className="font-bold text-emerald-300">Lotería</span> y se llevó la partida!
        </p>

        <p className="mt-2 text-sm text-white/55">
          Patrón ganador:{" "}
          <span className="font-bold text-yellow-300">{patternLabel}</span>
        </p>

        <div className="mt-6 flex items-center justify-center gap-3 text-2xl">
          <span className="animate-bounce">🎉</span>
          <span className="animate-bounce [animation-delay:120ms]">✨</span>
          <span className="animate-bounce [animation-delay:240ms]">💥</span>
          <span className="animate-bounce [animation-delay:360ms]">🎊</span>
        </div>
      </div>

      <style jsx global>{`
        @keyframes loteria-confetti-fall {
          0% {
            transform: translateY(-30px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(105vh) rotate(540deg);
            opacity: 0.95;
          }
        }
      `}</style>
    </div>
  );
}
