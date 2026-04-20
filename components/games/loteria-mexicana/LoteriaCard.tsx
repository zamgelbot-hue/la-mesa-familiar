"use client";

import type { LoteriaCardData, LoteriaCardVisualState } from "./loteriaTypes";

type LoteriaCardProps = {
  card: LoteriaCardData;
  visualState?: LoteriaCardVisualState;
  isCalled?: boolean;
  isWinningCard?: boolean;
  isCurrentCalled?: boolean;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  showPulse?: boolean;
  showInvalidShake?: boolean;
  onClick?: () => void;
};

export default function LoteriaCard({
  card,
  visualState = "idle",
  isCalled = false,
  isWinningCard = false,
  isCurrentCalled = false,
  disabled = false,
  size = "md",
  showPulse = false,
  showInvalidShake = false,
  onClick,
}: LoteriaCardProps) {
  const clickable = !!onClick && !disabled;

  const isMarked = visualState === "marked";
  const isExpired = visualState === "expired";
  const isJustCalled = visualState === "just_called";
  const isMarkable = visualState === "markable";
  const isWinning = visualState === "winning" || isWinningCard;

  const sizeClasses =
    size === "sm"
      ? {
          wrapper: "rounded-2xl p-2",
          imageBox: "h-24 rounded-xl",
          image: "h-full w-auto",
          title: "text-[11px]",
          badge: "text-[9px] px-2 py-1",
          idBadge: "text-[9px]",
        }
      : size === "lg"
      ? {
          wrapper: "rounded-[26px] p-4",
          imageBox: "h-44 rounded-2xl",
          image: "h-full w-auto",
          title: "text-sm",
          badge: "text-[10px] px-2.5 py-1",
          idBadge: "text-[10px]",
        }
      : {
          wrapper: "rounded-3xl p-3",
          imageBox: "h-36 rounded-2xl",
          image: "h-full w-auto",
          title: "text-xs",
          badge: "text-[10px] px-2 py-1",
          idBadge: "text-[10px]",
        };

  const stateClasses = isWinning
    ? "border-emerald-400/50 bg-emerald-500/15 shadow-[0_0_25px_rgba(16,185,129,0.16)]"
    : isExpired
    ? "border-red-500/45 bg-red-500/12 shadow-[0_0_20px_rgba(239,68,68,0.14)]"
    : isJustCalled
    ? "border-yellow-400/50 bg-yellow-500/15 shadow-[0_0_28px_rgba(250,204,21,0.18)]"
    : isMarked
    ? "border-orange-400/40 bg-orange-500/12 shadow-[0_0_20px_rgba(249,115,22,0.12)]"
    : isMarkable
    ? "border-sky-400/35 bg-sky-500/10 shadow-[0_0_18px_rgba(56,189,248,0.08)]"
    : isCalled
    ? "border-white/10 bg-white/[0.04]"
    : "border-white/10 bg-white/[0.03]";

  return (
    <button
      type="button"
      onClick={clickable ? onClick : undefined}
      disabled={!clickable}
      className={`relative w-full border text-left transition ${sizeClasses.wrapper} ${stateClasses} ${
        clickable
          ? "hover:-translate-y-[2px] hover:border-orange-400/35 hover:bg-white/[0.05]"
          : "cursor-default"
      } ${disabled ? "opacity-70" : ""} ${showPulse ? "animate-pulse" : ""} ${
        showInvalidShake ? "animate-[loteria_shake_.28s_ease-in-out]" : ""
      }`}
    >
      <div className="pointer-events-none">
        <div className="mb-2 flex items-start justify-between gap-2">
          <span
            className={`rounded-full border border-white/10 bg-black/25 px-2 py-1 font-bold uppercase tracking-[0.16em] text-white/55 ${sizeClasses.idBadge}`}
          >
            {card.id}
          </span>

          {isWinning ? (
            <span
              className={`rounded-full border border-emerald-400/30 bg-emerald-500/15 font-bold uppercase tracking-wider text-emerald-300 ${sizeClasses.badge}`}
            >
              Línea
            </span>
          ) : isExpired ? (
            <span
              className={`rounded-full border border-red-400/30 bg-red-500/15 font-bold uppercase tracking-wider text-red-300 ${sizeClasses.badge}`}
            >
              Perdida
            </span>
          ) : isJustCalled ? (
            <span
              className={`rounded-full border border-yellow-400/30 bg-yellow-500/15 font-bold uppercase tracking-wider text-yellow-300 ${sizeClasses.badge}`}
            >
              Actual
            </span>
          ) : isMarked ? (
            <span
              className={`rounded-full border border-orange-400/30 bg-orange-500/15 font-bold uppercase tracking-wider text-orange-300 ${sizeClasses.badge}`}
            >
              Marcada
            </span>
          ) : isMarkable ? (
            <span
              className={`rounded-full border border-sky-400/20 bg-sky-500/10 font-bold uppercase tracking-wider text-sky-300 ${sizeClasses.badge}`}
            >
              Disponible
            </span>
          ) : isCurrentCalled ? (
            <span
              className={`rounded-full border border-yellow-400/30 bg-yellow-500/15 font-bold uppercase tracking-wider text-yellow-300 ${sizeClasses.badge}`}
            >
              Actual
            </span>
          ) : null}
        </div>

        <div
          className={`flex items-center justify-center overflow-hidden border border-white/5 bg-black/25 ${sizeClasses.imageBox}`}
        >
          {card.image ? (
            <img
              src={card.image}
              alt={card.name}
              className={`${sizeClasses.image} object-contain`}
              draggable={false}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-2xl bg-orange-500/10 text-orange-300">
              <span className="text-2xl font-black">?</span>
            </div>
          )}
        </div>

        <div className="mt-3">
          <p className={`line-clamp-2 font-bold text-white ${sizeClasses.title}`}>
            {card.name}
          </p>
        </div>
      </div>

      {isMarked && (
        <div className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-orange-400/30" />
      )}

      {isExpired && (
        <div className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-red-400/35" />
      )}

      {isJustCalled && !isMarked && !isExpired && (
        <div className="pointer-events-none absolute inset-0 rounded-[inherit] ring-2 ring-yellow-300/25" />
      )}

      <style jsx global>{`
        @keyframes loteria_shake_ {
          0% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          50% { transform: translateX(3px); }
          75% { transform: translateX(-2px); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </button>
  );
}
