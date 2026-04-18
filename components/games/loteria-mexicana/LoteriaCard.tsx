"use client";

import type { LoteriaCardData } from "./loteriaTypes";

type LoteriaCardProps = {
  card: LoteriaCardData;
  isMarked?: boolean;
  isCalled?: boolean;
  isWinningCard?: boolean;
  isCurrentCalled?: boolean;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
};

export default function LoteriaCard({
  card,
  isMarked = false,
  isCalled = false,
  isWinningCard = false,
  isCurrentCalled = false,
  disabled = false,
  size = "md",
  onClick,
}: LoteriaCardProps) {
  const clickable = !!onClick && !disabled;

  const sizeClasses =
    size === "sm"
      ? {
          wrapper: "rounded-2xl p-2",
          imageBox: "h-16 rounded-xl",
          image: "h-12 w-12",
          title: "text-[11px]",
          badge: "text-[9px] px-2 py-1",
        }
      : size === "lg"
      ? {
          wrapper: "rounded-[26px] p-4",
          imageBox: "h-32 rounded-2xl",
          image: "h-20 w-20",
          title: "text-sm",
          badge: "text-[10px] px-2.5 py-1",
        }
      : {
          wrapper: "rounded-3xl p-3",
          imageBox: "h-24 rounded-2xl",
          image: "h-16 w-16",
          title: "text-xs",
          badge: "text-[10px] px-2 py-1",
        };

  const stateClasses = isWinningCard
    ? "border-emerald-400/50 bg-emerald-500/15 shadow-[0_0_25px_rgba(16,185,129,0.16)]"
    : isCurrentCalled
    ? "border-yellow-400/45 bg-yellow-500/15 shadow-[0_0_25px_rgba(250,204,21,0.14)]"
    : isMarked
    ? "border-orange-400/40 bg-orange-500/12 shadow-[0_0_20px_rgba(249,115,22,0.12)]"
    : isCalled
    ? "border-sky-400/25 bg-sky-500/10"
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
      } ${disabled ? "opacity-70" : ""}`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <span className="rounded-full border border-white/10 bg-black/25 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/55">
          {card.id}
        </span>

        {isWinningCard ? (
          <span className={`rounded-full border border-emerald-400/30 bg-emerald-500/15 font-bold uppercase tracking-wider text-emerald-300 ${sizeClasses.badge}`}>
            Línea
          </span>
        ) : isCurrentCalled ? (
          <span className={`rounded-full border border-yellow-400/30 bg-yellow-500/15 font-bold uppercase tracking-wider text-yellow-300 ${sizeClasses.badge}`}>
            Actual
          </span>
        ) : isMarked ? (
          <span className={`rounded-full border border-orange-400/30 bg-orange-500/15 font-bold uppercase tracking-wider text-orange-300 ${sizeClasses.badge}`}>
            Marcada
          </span>
        ) : isCalled ? (
          <span className={`rounded-full border border-sky-400/20 bg-sky-500/10 font-bold uppercase tracking-wider text-sky-300 ${sizeClasses.badge}`}>
            Salió
          </span>
        ) : null}
      </div>

      <div className={`flex items-center justify-center border border-white/5 bg-black/25 ${sizeClasses.imageBox}`}>
        {card.image ? (
          <img
            src={card.image}
            alt={card.name}
            className={`${sizeClasses.image} object-contain`}
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

        {card.callout && size !== "sm" && (
          <p className="mt-1 line-clamp-2 text-[11px] italic text-white/45">
            {card.callout}
          </p>
        )}
      </div>

      {isMarked && (
        <div className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-orange-400/30" />
      )}
    </button>
  );
}
