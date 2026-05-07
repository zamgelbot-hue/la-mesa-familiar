// 📍 Ruta del archivo: components/create-room/CreateRoomConfigurator.tsx

import type { Game, RoomVisibility } from "@/lib/home/homeTypes";

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
  const selectedVariant =
    selectedGameConfig?.variants.find((variant) => variant.key === selectedVariantKey) ??
    selectedGameConfig?.variants[0] ??
    null;

  return (
    <aside className="sticky top-28 rounded-[34px] border border-orange-500/15 bg-zinc-950/95 p-6 shadow-[0_0_45px_rgba(249,115,22,0.08)]">
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
          <div className="mt-5 rounded-[26px] border border-white/10 bg-white/[0.04] p-5">
            <p className="text-xl font-black text-white">{selectedGame.name}</p>
            <p className="mt-2 text-sm text-white/55">{selectedGame.description}</p>
          </div>

          <div className="mt-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/45">
              Variante
            </p>

            <div className="mt-3 grid gap-2">
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
                          : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
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
                  onClick={() => onRoomVisibilityChange(option.key as RoomVisibility)}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    roomVisibility === option.key
                      ? "border-orange-500/45 bg-orange-500/15"
                      : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
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

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/65">
            <span className="font-black text-white">{selectedGame.name}</span>
            {" · "}
            {selectedVariant?.label ?? "Variante"}
            {" · "}
            {maxPlayers} jugador{maxPlayers !== 1 ? "es" : ""}
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
    </aside>
  );
}