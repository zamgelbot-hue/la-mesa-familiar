// 📍 Ruta del archivo: components/games/guerra-total/GuerraTotalHeader.tsx

import { GameSecondaryButton } from "@/components/games/core";
import type { GtVariantTheme } from "./guerraTotalTypes";

type Props = {
  theme: GtVariantTheme;
  boardSize: number;
  isHost: boolean;
  onBackToSala: () => void;
  onCloseRoom: () => void;
};

export default function GuerraTotalHeader({
  theme,
  boardSize,
  isHost,
  onBackToSala,
  onCloseRoom,
}: Props) {
  return (
    <section className="rounded-[32px] border border-orange-500/20 bg-zinc-950/95 p-6 shadow-[0_0_40px_rgba(249,115,22,0.06)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-300/80">
            La Mesa Familiar
          </p>

          <h1 className="mt-2 text-3xl font-black md:text-4xl">
            {theme.icon} Guerra Total
          </h1>

          <p className="mt-2 text-sm text-white/60">
            Campo:{" "}
            <span className="font-bold text-orange-300">{theme.label}</span> ·
            Tablero {boardSize}x{boardSize}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <GameSecondaryButton onClick={onBackToSala}>
            Volver a sala
          </GameSecondaryButton>

          {isHost && (
            <button
              type="button"
              onClick={onCloseRoom}
              className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200 hover:bg-red-500/20"
            >
              Terminar sala
            </button>
          )}
        </div>
      </div>
    </section>
  );
}