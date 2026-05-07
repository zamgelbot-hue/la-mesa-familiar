// 📍 Ruta del archivo: components/create-room/CreateRoomConfigurator.tsx

import type { Game, RoomVisibility } from "@/lib/home/homeTypes";
import { getGameVisualInfo } from "./createRoomUtils";

type VariantOption = {
  key: string;
  label: string;
  description: string;
  available?: boolean;
};

type GameConfig = {
  maxPlayersOptions: number[];
  variants: VariantOption[];
};

type Props = {
  selectedGame: Game | null;
  selectedGameConfig: GameConfig | null;
  selectedVariantKey: string;
  maxPlayers: number;
  roomVisibility: RoomVisibility;
  creating: boolean;
  canCreate: boolean;
  onVariantChange: (key: string) => void;
  onMaxPlayersChange: (players: number) => void;
  onRoomVisibilityChange: (visibility: RoomVisibility) => void;
  onCreateRoom: () => void;
};

export default function CreateRoomConfigurator({
  selectedGame,
  selectedGameConfig,
  selectedVariantKey,
  maxPlayers,
  roomVisibility,
  creating,
  canCreate,
  onVariantChange,
  onMaxPlayersChange,
  onRoomVisibilityChange,
  onCreateRoom,
}: Props) {
  const visual = getGameVisualInfo(selectedGame?.slug ?? "");

  const selectedVariant =
    selectedGameConfig?.variants.find((variant) => variant.key === selectedVariantKey) ??
    selectedGameConfig?.variants[0] ??
    null;

  return (
    <aside className="sticky top-28 overflow-hidden rounded-[34px] border border-orange-500/15 bg-zinc-950/95 p-6 shadow-[0_0_45px_rgba(249,115,22,0.08)]">
      {selectedGame && (
        <div
          className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${visual.gradient} opacity-80`}
        />
      )}

      <div className="relative">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-300">
          Configuración
        </p>

        <h2 className="mt-2 text-3xl font-black text-white">
          Tu sala
        </h2>

        {!selectedGame ? (
          <p className="mt-4 text-white/60">
            Selecciona un juego para configurar la partida.
          </p>
        ) : (
          <>
            <div className="mt-5 rounded-[28px] border border-white/10 bg-black/35 p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-black/40 text-4xl">
                  {visual.emoji}
                </div>

                <div>
                  <p className="text-xl font-black text-white">
                    {selectedGame.name}
                  </p>

                  <p className="mt-2 text-sm leading-relaxed text-white/55">
                    {selectedGame.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-xs font-bold text-white/70">
                  ⏱ {visual.duration}
                </span>

                <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-xs font-bold text-white/70">
                  🎯 {visual.difficulty}
                </span>

                <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-xs font-black text-orange-200">
                  {visual.badge}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/45">
                Variante
              </p>

              <div className="mt-3 grid max-h-[280px] gap-2 overflow-y-auto pr-1">
                {(selectedGameConfig?.variants ?? []).map((variant) => {
                  const available = variant.available !== false;
                  const selected = selectedVariantKey === variant.key;

                  return (
                    <button
                      key={variant.key}
                      type="button"
                      disabled={!available}
                      onClick={() => onVariantChange(variant.key)}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        !available
                          ? "cursor-not-allowed border-white/10 bg-white/[0.03] opacity-50"
                          : selected
                            ? "border-orange-500/45 bg-orange-500/15"
                            : "border-white/10 bg-black/30 hover:bg-white/[0.07]"
                      }`}
                    >
                      <p className="font-black text-white">{variant.label}</p>
                      <p className="mt-1 text-sm text-white/50">
                        {variant.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/45">
                Jugadores
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {(selectedGameConfig?.maxPlayersOptions ?? [
                  selectedGame.min_players,
                ]).map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => onMaxPlayersChange(num)}
                    className={`rounded-2xl px-4 py-2 text-sm font-black transition ${
                      maxPlayers === num
                        ? "bg-orange-500 text-black"
                        : "bg-white/10 text-white/70 hover:bg-white/15"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/45">
                Tipo de sala
              </p>

              <div className="mt-3 grid gap-2">
                {[
                  {
                    key: "private",
                    label: "Privada 🔒",
                    description: "Solo entra quien tenga el código.",
                  },
                  {
                    key: "public",
                    label: "Pública 🌍",
                    description: "Aparece en salas abiertas.",
                  },
                  {
                    key: "friends",
                    label: "Solo amigos 👥",
                    description: "Visible para tus amigos.",
                  },
                ].map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() =>
                      onRoomVisibilityChange(option.key as RoomVisibility)
                    }
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      roomVisibility === option.key
                        ? "border-orange-500/45 bg-orange-500/15"
                        : "border-white/10 bg-black/30 hover:bg-white/[0.07]"
                    }`}
                  >
                    <p className="font-black text-white">{option.label}</p>
                    <p className="mt-1 text-sm text-white/50">
                      {option.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white/65">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
                Resumen
              </p>

              <p className="mt-2">
                <span className="font-black text-white">{selectedGame.name}</span>
                {" · "}
                {selectedVariant?.label ?? "Variante"}
                {" · "}
                {maxPlayers} jugador{maxPlayers !== 1 ? "es" : ""}
              </p>
            </div>

            <button
              type="button"
              disabled={creating || !canCreate}
              onClick={onCreateRoom}
              className="mt-5 w-full rounded-2xl bg-orange-500 px-5 py-4 text-lg font-black text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? "Creando sala..." : "Crear sala →"}
            </button>
          </>
        )}
      </div>
    </aside>
  );
}