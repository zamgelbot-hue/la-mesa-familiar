// 📍 Ruta del archivo: components/home/OpenRoomCard.tsx

import { GAME_CONFIGS, getGameIcon } from "@/lib/games/gameCatalog";
import type { Game, OpenRoom } from "@/lib/home/homeTypes";

type Props = {
  openRoom: OpenRoom;
  label: "Pública" | "Amigos";
  games: Game[];
  canJoin: boolean;
  onJoin: (code: string) => void;
};

export default function OpenRoomCard({
  openRoom,
  label,
  games,
  canJoin,
  onJoin,
}: Props) {
  const gameName =
    games.find((game) => game.slug === openRoom.game_slug)?.name ??
    openRoom.game_slug ??
    "Juego";

  const variantLabel =
    GAME_CONFIGS[openRoom.game_slug ?? ""]?.variants.find(
      (variant) => variant.key === openRoom.game_variant,
    )?.label ??
    openRoom.game_variant ??
    "Sin variante";

  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-extrabold">
            {getGameIcon(openRoom.game_slug ?? "")} {gameName}
          </p>

          <p className="mt-1 text-xs text-white/60">{variantLabel}</p>

          <p className="mt-2 text-xs font-bold text-emerald-300">
            Sala esperando jugadores
          </p>
        </div>

        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
          {label}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-xs font-black tracking-[0.22em] text-orange-300">
          {openRoom.code}
        </div>

        <button
          type="button"
          disabled={!canJoin}
          onClick={() => onJoin(openRoom.code)}
          className="rounded-2xl bg-orange-500 px-4 py-2 text-sm font-bold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Unirse
        </button>
      </div>
    </div>
  );
}
