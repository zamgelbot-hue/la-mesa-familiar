// 📍 Ruta del archivo: components/games/domino/DominoBoard.tsx

import DominoTile from "./DominoTile";
import type { DominoPlacedTile, DominoSide } from "./dominoTypes";
import { getBoardEnds } from "./dominoUtils";

type Props = {
  board: DominoPlacedTile[];
  selectedTileId?: string | null;
  canPlayLeft?: boolean;
  canPlayRight?: boolean;
  boneyardCount?: number;
  onPlace?: (side: DominoSide) => void;
};

export default function DominoBoard({
  board,
  selectedTileId,
  canPlayLeft = false,
  canPlayRight = false,
  boneyardCount = 0,
  onPlace,
}: Props) {
  const ends = getBoardEnds(board);

  return (
    <section className="rounded-[34px] border border-white/10 bg-zinc-950/90 p-5 shadow-[0_0_45px_rgba(249,115,22,0.06)] md:p-7">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-300/70">
            Mesa
          </p>
          <h2 className="text-2xl font-black text-white">Dominó</h2>
        </div>

        <div className="flex gap-2 text-xs font-black uppercase tracking-[0.14em] text-white/45">
          <span>Izq: {ends.left ?? "-"}</span>
          <span>Der: {ends.right ?? "-"}</span>
          <span>Colocadas: {board.length}</span>
          <span>Pozo: {boneyardCount}</span>
        </div>
      </div>

      <div className="flex min-h-[220px] items-center gap-3 overflow-x-auto rounded-3xl border border-orange-500/10 bg-black p-4">
        {board.length === 0 ? (
          <div className="flex w-full flex-col items-center justify-center py-12 text-center">
            <p className="text-5xl">🎲</p>
            <p className="mt-3 text-lg font-black text-white">Mesa lista</p>
            <p className="text-sm text-white/45">
              La primera ficha puede colocarse en cualquier lado.
            </p>
          </div>
        ) : (
          <>
            <button
              type="button"
              disabled={!selectedTileId || !canPlayLeft}
              onClick={() => onPlace?.("left")}
              className={`sticky left-0 z-10 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-[0.16em] transition ${
                selectedTileId && canPlayLeft
                  ? "bg-orange-500 text-black hover:bg-orange-400"
                  : "border border-white/10 bg-zinc-950 text-white/25"
              }`}
            >
              Izquierda
            </button>

            <div className="flex min-w-max items-center gap-2 px-2">
              {board.map((tile, index) => {
                const isFirst = index === 0;
                const isDouble = tile.a === tile.b;

                return (
                  <DominoTile
                    key={`${tile.id}-${tile.playedAt}`}
                    tile={tile}
                    compact
                    horizontal={!isDouble || !isFirst}
                  />
                );
              })}
            </div>

            <button
              type="button"
              disabled={!selectedTileId || !canPlayRight}
              onClick={() => onPlace?.("right")}
              className={`sticky right-0 z-10 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-[0.16em] transition ${
                selectedTileId && canPlayRight
                  ? "bg-orange-500 text-black hover:bg-orange-400"
                  : "border border-white/10 bg-zinc-950 text-white/25"
              }`}
            >
              Derecha
            </button>
          </>
        )}
      </div>
    </section>
  );
}
