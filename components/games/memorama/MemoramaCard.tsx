// 📍 Ruta del archivo: components/games/memorama/MemoramaCard.tsx

import type { MemoramaCard as MemoramaCardType } from "./types";

type Props = {
  card: MemoramaCardType;
  visible: boolean;
  matched: boolean;
  selected: boolean;
  isResolving: boolean;
  isMineMatchedPair: boolean;
  disabled: boolean;
  onClick: (cardId: string) => void;
};

export default function MemoramaCard({
  card,
  visible,
  matched,
  selected,
  isResolving,
  isMineMatchedPair,
  disabled,
  onClick,
}: Props) {
  const resolvingSelected = selected && isResolving && !matched;

  const className = matched
    ? isMineMatchedPair
      ? "aspect-square rounded-3xl border border-emerald-400/50 bg-emerald-500/20 text-5xl shadow-[0_0_28px_rgba(16,185,129,0.18)]"
      : "aspect-square rounded-3xl border border-cyan-400/50 bg-cyan-500/20 text-5xl shadow-[0_0_28px_rgba(34,211,238,0.18)]"
    : resolvingSelected
      ? "aspect-square rounded-3xl border border-orange-400/60 bg-orange-500/20 text-5xl shadow-[0_0_28px_rgba(249,115,22,0.18)]"
      : visible
        ? "aspect-square rounded-3xl border border-orange-400/50 bg-orange-500/20 text-5xl shadow-[0_0_28px_rgba(249,115,22,0.18)]"
        : "aspect-square rounded-3xl border border-white/10 bg-white/[0.04] text-4xl transition hover:scale-[1.03] hover:border-orange-400/50 hover:bg-orange-500/10 disabled:hover:scale-100";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onClick(card.id)}
      className={className}
    >
      <span className="flex h-full w-full items-center justify-center">
        {visible ? card.emoji : "❔"}
      </span>
    </button>
  );
}