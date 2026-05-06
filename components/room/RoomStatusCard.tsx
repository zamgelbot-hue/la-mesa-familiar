// 📍 Ruta del archivo: components/room/RoomStatusCard.tsx

import type { Game, Room } from "@/lib/room/roomTypes";

type Variant = {
  key: string;
  label: string;
};

type Props = {
  room: Room;
  game: Game | null;
  variantLabel: string;
  roomMaxPlayers: number;
  sortedPlayersCount: number;
  minPlayersToStart: number;
  availableVariants: Variant[];
  isHost: boolean;
  onChangeVariant: (variantKey: string) => void;
};

export default function RoomStatusCard({
  room,
  game,
  variantLabel,
  roomMaxPlayers,
  sortedPlayersCount,
  minPlayersToStart,
  availableVariants,
  isHost,
  onChangeVariant,
}: Props) {
  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-200">
          Preview
        </p>

        <div className="mt-4 rounded-2xl border border-white/10 bg-zinc-800/60 p-6 text-center">
          <p className="text-lg font-bold text-white">
            {game?.name ?? "Juego"}
          </p>

          <p className="mt-2 text-sm text-white/60">
            Variante activa: {variantLabel}
          </p>

          {isHost &&
            room.status === "waiting" &&
            availableVariants.length > 1 && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {availableVariants.map((variant) => (
                  <button
                    key={variant.key}
                    type="button"
                    onClick={() => onChangeVariant(variant.key)}
                    className={`rounded-xl px-3 py-2 text-sm font-bold transition ${
                      room.game_variant === variant.key
                        ? "bg-orange-500 text-black"
                        : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                  >
                    {variant.label}
                  </button>
                ))}
              </div>
            )}
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-200">
          Estado
        </p>

        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
            <span className="text-sm text-white/60">
              Jugadores conectados
            </span>

            <span className="font-bold">
              {sortedPlayersCount}/{roomMaxPlayers}
            </span>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
            <span className="text-sm text-white/60">Juego</span>

            <span className="font-bold">
              {game?.name ?? "Sin seleccionar"}
            </span>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
            <span className="text-sm text-white/60">Variante</span>

            <span className="font-bold">{variantLabel}</span>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
            <span className="text-sm text-white/60">Tipo de sala</span>

            <span className="font-bold">
              {room.visibility === "public"
                ? "Pública"
                : room.visibility === "friends"
                  ? "Solo amigos"
                  : "Privada"}
            </span>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
            <span className="text-sm text-white/60">
              Mínimo para iniciar
            </span>

            <span className="font-bold">{minPlayersToStart}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
