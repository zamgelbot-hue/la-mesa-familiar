// 📍 Ruta del archivo: components/room/RoomTutorialCard.tsx

import type { Game } from "@/lib/room/roomTypes";

type Props = {
  game: Game | null;
  variantLabel: string;
};

export default function RoomTutorialCard({
  game,
  variantLabel,
}: Props) {
  return (
    <div className="rounded-[30px] border border-orange-500/15 bg-orange-500/5 p-5">
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-200">
        Antes de empezar
      </p>

      <div className="mt-4 space-y-4">
        <div className="rounded-2xl bg-black/20 p-4">
          <p className="text-lg font-bold text-white">
            {game?.name ?? "Juego"}
          </p>

          <p className="mt-2 text-sm text-white/65">
            Variante seleccionada:
          </p>

          <p className="mt-1 text-base font-bold text-orange-200">
            {variantLabel}
          </p>
        </div>

        <div className="rounded-2xl bg-black/20 p-4">
          <p className="text-sm leading-relaxed text-white/70">
            Espera a que todos los jugadores entren y se marquen como listos.
            Cuando el host inicie la partida serán enviados automáticamente al
            juego.
          </p>
        </div>

        <div className="rounded-2xl bg-black/20 p-4">
          <p className="text-sm leading-relaxed text-white/70">
            Si compartes el código de sala, otros jugadores podrán unirse desde
            cualquier dispositivo.
          </p>
        </div>
      </div>
    </div>
  );
}
