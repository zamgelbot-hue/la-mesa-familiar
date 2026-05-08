// 📍 Ruta del archivo: components/games/domino/DominoTile.tsx

import type { DominoTile as DominoTileType } from "./dominoTypes";

type Props = {
  tile: DominoTileType;
  compact?: boolean;
  selected?: boolean;
  playable?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  horizontal?: boolean;
  onClick?: () => void;
};

function PipDots({ value }: { value: number }) {
  if (value === 0) {
    return <span className="h-1.5 w-1.5 rounded-full bg-black/15" />;
  }

  return (
    <div className="grid grid-cols-3 gap-1">
      {Array.from({ length: value }).map((_, index) => (
        <span
          key={index}
          className="h-1.5 w-1.5 rounded-full bg-black shadow-[0_0_7px_rgba(249,115,22,0.65)]"
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
  horizontal = false,
  onClick,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      className={`group relative shrink-0 rounded-2xl border bg-white transition ${
        horizontal ? (compact ? "h-10 w-20" : "h-14 w-28") : compact ? "h-16 w-9" : "h-24 w-14"
      } ${
        selected
          ? "border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.55)]"
          : playable
            ? "border-orange-500/80 hover:-translate-y-1 hover:border-orange-300 hover:shadow-[0_0_24px_rgba(249,115,22,0.32)]"
            : "border-zinc-300"
      } ${disabled ? "cursor-not-allowed opacity-45" : ""}`}
      aria-label={hidden ? "Ficha oculta" : `Ficha ${tile.a} ${tile.b}`}
    >
      {hidden ? (
        <div className="flex h-full w-full items-center justify-center rounded-2xl bg-zinc-900 text-lg font-black text-orange-200">
          ?
        </div>
      ) : (
        <div
          className={`flex h-full overflow-hidden rounded-2xl ${
            horizontal ? "flex-row" : "flex-col"
          }`}
        >
          <div className="flex flex-1 items-center justify-center bg-white">
            <PipDots value={tile.a} />
          </div>
          <div className={horizontal ? "w-px bg-orange-500/45" : "h-px bg-orange-500/45"} />
          <div className="flex flex-1 items-center justify-center bg-zinc-100">
            <PipDots value={tile.b} />
          </div>
        </div>
      )}
    </button>
  );
}
