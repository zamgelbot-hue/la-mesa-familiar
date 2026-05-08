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
    selectedGameConfig?.variants.find(
      (variant) => variant.key === selectedVariantKey,
    ) ??
    selectedGameConfig?.variants[0] ??
    null;

  return (
    <aside
      className="sticky top-28 overflow-hidden rounded-[34px] border border-orange-500/15 bg-zinc-950/95 p-6 shadow-[0_0_45px_rgba(249,115,22,0.08)]"
      style={{
        boxShadow: selectedGame
          ? `0 0 55px ${visual.glowColor}`
          : "0 0 45px rgba(249,115,22,0.08)",
      }}
    >
      {selectedGame && (
        <>
          <div
  className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-25 blur-[2px]"
  style={{
    backgroundImage: `url(${visual.banner})`,
  }}
/>

          <div className="pointer-events-none absolute inset-0 bg-black/70" />

          <div
            className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${visual.ambientGradient} opacity-90`}
          />

          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full blur-3xl opacity-40"
            style={{
              backgroundColor: visual.accentColor,
            }}
          />

          <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full blur-3xl opacity-25"
            style={{
              backgroundColor: visual.accentColor,
            }}
          />
        </>
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
            <div className="mt-5 overflow-hidden rounded-[28px] border border-white/10 bg-black/45 shadow-2xl backdrop-blur-md">
              <div className="relative h-36 overflow-hidden bg-black">
  <img
    src={visual.banner}
    alt={selectedGame.name}
    className="absolute inset-0 h-full w-full object-contain"
  />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />

                <div className="absolute bottom-4 left-4 flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black/65 text-3xl shadow-xl backdrop-blur">
                    {visual.emoji}
                  </div>

                  <div>
                    <p className="text-lg font-black text-white drop-shadow">
                      {selectedGame.name}
                    </p>

                    <p className="text-xs font-bold text-white/70">
                      {visual.previewDescription}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-black/45 px-3 py-1 text-xs font-bold text-white/75">
                    ⏱ {visual.duration}
                  </span>

                  <span className="rounded-full border border-white/10 bg-black/45 px-3 py-1 text-xs font-bold text-white/75">
                    🎯 {visual.difficulty}
                  </span>

                  <span
                    className="rounded-full border px-3 py-1 text-xs font-black text-white"
                    style={{
                      borderColor: visual.accentColor,
                      backgroundColor: `${visual.accentColor}22`,
                    }}
                  >
                    {visual.badge}
                  </span>
                </div>
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
                        ? "text-black"
                        : "bg-white/10 text-white/70 hover:bg-white/15"
                    }`}
                    style={
                      maxPlayers === num
                        ? {
                            backgroundColor: visual.accentColor,
                          }
                        : undefined
                    }
                  >
                    {num}
                  </button>
                ))}
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
                            ? "bg-white/10"
                            : "border-white/10 bg-black/35 hover:bg-white/[0.07]"
                      }`}
                      style={
                        selected
                          ? {
                              borderColor: visual.accentColor,
                              boxShadow: `0 0 22px ${visual.glowColor}`,
                            }
                          : undefined
                      }
                    >
                      <p className="font-black text-white">
                        {variant.label}
                      </p>

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
                Tipo de sala
              </p>

              <div className="mt-3 grid gap-2">
                {[
                  {
                    key: "private",
                    label: "Privada 🔒",
                    description:
                      "Solo entra quien tenga el código.",
                  },
                  {
                    key: "public",
                    label: "Pública 🌍",
                    description:
                      "Aparece en salas abiertas.",
                  },
                  {
                    key: "friends",
                    label: "Solo amigos 👥",
                    description:
                      "Visible para tus amigos.",
                  },
                ].map((option) => {
                  const selected = roomVisibility === option.key;

                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() =>
                        onRoomVisibilityChange(
                          option.key as RoomVisibility,
                        )
                      }
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        selected
                          ? "bg-white/10"
                          : "border-white/10 bg-black/35 hover:bg-white/[0.07]"
                      }`}
                      style={
                        selected
                          ? {
                              borderColor: visual.accentColor,
                              boxShadow: `0 0 18px ${visual.glowColor}`,
                            }
                          : undefined
                      }
                    >
                      <p className="font-black text-white">
                        {option.label}
                      </p>

                      <p className="mt-1 text-sm text-white/50">
                        {option.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/55 p-4 text-sm text-white/65 backdrop-blur">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
                Resumen
              </p>

              <p className="mt-2">
                <span className="font-black text-white">
                  {selectedGame.name}
                </span>
                {" · "}
                {selectedVariant?.label ?? "Variante"}
                {" · "}
                {maxPlayers} jugador
                {maxPlayers !== 1 ? "es" : ""}
              </p>
            </div>

            <button
              type="button"
              disabled={creating || !canCreate}
              onClick={onCreateRoom}
              className="mt-5 w-full rounded-2xl px-5 py-4 text-lg font-black text-black transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                backgroundColor: visual.accentColor,
                boxShadow: `0 0 28px ${visual.glowColor}`,
              }}
            >
              {creating ? "Creando sala..." : "Crear sala →"}
            </button>
          </>
        )}
      </div>
    </aside>
  );
}