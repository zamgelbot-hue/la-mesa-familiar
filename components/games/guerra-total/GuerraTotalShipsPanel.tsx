// 📍 Ruta del archivo: components/games/guerra-total/GuerraTotalShipsPanel.tsx

import type {
  GtOrientation,
  GtPlayerBoard,
  GtVariantTheme,
} from "./guerraTotalTypes";
import { allShipsPlaced, GT_SHIP_TEMPLATES } from "./guerraTotalUtils";

type Props = {
  theme: GtVariantTheme;
  selectedShipId: string;
  placedShipIds: Set<string>;
  orientation: GtOrientation;
  myBoard: GtPlayerBoard | null;
  onSelectShip: (shipId: string) => void;
  onOrientationChange: (orientation: GtOrientation) => void;
  onReadyFleet: () => void;
  onResetFleet: () => void;
};

export default function GuerraTotalShipsPanel({
  theme,
  selectedShipId,
  placedShipIds,
  orientation,
  myBoard,
  onSelectShip,
  onOrientationChange,
  onReadyFleet,
  onResetFleet,
}: Props) {
  return (
    <div className="rounded-[28px] border border-cyan-500/20 bg-zinc-950/90 p-5">
      <h2 className="text-xl font-black text-cyan-200">
        🛠️ Colocar {theme.unitLabel}
      </h2>

      <div className="mt-4 space-y-3">
        <div className="space-y-3">
          <p className="text-sm font-bold text-white/60">Selecciona unidad</p>

          <div className="grid gap-2">
            {GT_SHIP_TEMPLATES.map((ship) => {
              const isSelected = selectedShipId === ship.id;
              const isPlaced = placedShipIds.has(ship.id);

              return (
                <button
                  key={ship.id}
                  type="button"
                  disabled={myBoard?.ready || isPlaced}
                  onClick={() => onSelectShip(ship.id)}
                  className={
                    isSelected
                      ? "flex items-center justify-between rounded-2xl border border-orange-400 bg-orange-500/20 px-4 py-3 text-left shadow-[0_0_22px_rgba(249,115,22,0.18)]"
                      : isPlaced
                        ? "flex items-center justify-between rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-left opacity-60"
                        : "flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left hover:bg-white/[0.08]"
                  }
                >
                  <span>
                    <span className="block font-black text-white">
                      {theme.unitIcons[ship.id] ?? theme.icon} {ship.name}
                    </span>

                    <span className="text-xs font-bold text-white/50">
                      {ship.size} casillas
                    </span>
                  </span>

                  <span className="text-xs font-black">
                    {isPlaced ? "LISTA" : isSelected ? "ACTIVA" : "ELEGIR"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-bold text-white/60">Orientación</p>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={myBoard?.ready}
              onClick={() => onOrientationChange("horizontal")}
              className={
                orientation === "horizontal"
                  ? "rounded-2xl border border-orange-400 bg-orange-500 px-4 py-3 font-black text-black"
                  : "rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-black text-white hover:bg-white/10"
              }
            >
              Horizontal
            </button>

            <button
              type="button"
              disabled={myBoard?.ready}
              onClick={() => onOrientationChange("vertical")}
              className={
                orientation === "vertical"
                  ? "rounded-2xl border border-orange-400 bg-orange-500 px-4 py-3 font-black text-black"
                  : "rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-black text-white hover:bg-white/10"
              }
            >
              Vertical
            </button>
          </div>
        </div>

        <button
          type="button"
          disabled={!myBoard || !allShipsPlaced(myBoard) || myBoard.ready}
          onClick={onReadyFleet}
          className="w-full rounded-2xl bg-orange-500 px-4 py-3 font-black text-black hover:bg-orange-400 disabled:opacity-50"
        >
          Confirmar formación
        </button>

        <button
          type="button"
          disabled={myBoard?.ready}
          onClick={onResetFleet}
          className="w-full rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 font-black text-red-200 hover:bg-red-500/20 disabled:opacity-50"
        >
          Reiniciar formación
        </button>
      </div>
    </div>
  );
}