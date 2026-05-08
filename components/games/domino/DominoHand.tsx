// 📍 Ruta del archivo: components/games/domino/DominoHand.tsx

import DominoTile from "./DominoTile";
import type { DominoPlacedTile, DominoTile as DominoTileType } from "./dominoTypes";
import { getPlayableTiles } from "./dominoUtils";

type Props = {
  hand: DominoTileType[];
  board: DominoPlacedTile[];
  selectedTileId?: string | null;
  isMyTurn: boolean;
  matchOver: boolean;
  onSelectTile: (tileId: string) => void;
};

export default function DominoHand({
  hand,
  board,
  selectedTileId,
  isMyTurn,
  matchOver,
  onSelectTile,
}: Props) {
  const playableTiles = getPlayableTiles(hand, board);
  const playableIds = new Set(playableTiles.map((tile) => tile.id));

  return (
    <section className="rounded-[34px] border border-white/10 bg-zinc-950/90 p-5 md:p-7">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-300/70">
            Tu mano
          </p>
          <h2 className="text-2xl font-black text-white">Tus fichas</h2>
        </div>

        <p className="rounded-2xl border border-white/10 bg-black px-4 py-2 text-sm font-black text-white/60">
          {hand.length} fichas
        </p>
      </div>

      <div className="flex gap-3 overflow-x-auto rounded-3xl border border-white/10 bg-black/60 p-4">
        {hand.length === 0 ? (
          <p className="py-8 text-white/45">No tienes fichas.</p>
        ) : (
          hand.map((tile) => {
            const playable = isMyTurn && playableIds.has(tile.id) && !matchOver;

            return (
              <DominoTile
                key={tile.id}
                tile={tile}
                selected={selectedTileId === tile.id}
                playable={playable}
                disabled={!isMyTurn || matchOver}
                onClick={() => onSelectTile(tile.id)}
              />
            );
          })
        )}
      </div>

      {isMyTurn && playableTiles.length === 0 && !matchOver && (
        <p className="mt-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-sm font-bold text-yellow-200">
          No tienes jugadas válidas. Si hay pozo, come ficha; si el pozo está vacío, pasa turno.
        </p>
      )}
    </section>
  );
}
