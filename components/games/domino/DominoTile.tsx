// 📍 Ruta del archivo: components/games/domino/DominoTile.tsx

import type { DominoTile as DominoTileType } from "./dominoTypes";

type Props = {
  tile: DominoTileType;
  compact?: boolean;
  selected?: boolean;
  playable?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  onClick?: () => void;
};

function PipDots({ value }: { value: number }) {
  if (value === 0) {
    return <span className="h-1.5 w-1.5 rounded-full bg-white/15" />;
  }

  return (
    <div className="grid grid-cols-3 gap-1">
      {Array.from({ length: value }).map((_, index) => (
        <span
          key={index}
          className="h-1.5 w-1.5 rounded-full bg-orange-200 shadow-[0_0_8px_rgba(251,146,60,0.45)]"
        />
      ))}
    </div>
  );
}

export default function DominoTile({
  tile,
  compact = false,
  selected = false,
  playable = false,
  disabled = false,
  hidden = false,
  onClick,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      className={`group relative shrink-0 rounded-2xl border bg-zinc-950 transition ${
        compact ? "h-16 w-9" : "h-24 w-14"
      } ${
        selected
          ? "border-orange-400 shadow-[0_0_28px_rgba(249,115,22,0.35)]"
          : playable
            ? "border-orange-500/45 hover:-translate-y-1 hover:border-orange-300 hover:shadow-[0_0_24px_rgba(249,115,22,0.22)]"
            : "border-white/10"
      } ${disabled ? "cursor-not-allowed opacity-45" : ""}`}
      aria-label={hidden ? "Ficha oculta" : `Ficha ${tile.a} ${tile.b}`}
    >
      {hidden ? (
        <div className="flex h-full w-full items-center justify-center rounded-2xl bg-orange-500/10 text-lg font-black text-orange-200">
          ?
        </div>
      ) : (
        <div className="flex h-full flex-col overflow-hidden rounded-2xl">
          <div className="flex flex-1 items-center justify-center bg-white/[0.03]">
            <PipDots value={tile.a} />
          </div>
          <div className="h-px bg-orange-500/30" />
          <div className="flex flex-1 items-center justify-center bg-black/30">
            <PipDots value={tile.b} />
          </div>
        </div>
      )}
    </button>
  );
}
