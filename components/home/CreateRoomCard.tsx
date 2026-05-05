// 📍 Ruta del archivo: components/home/CreateRoomCard.tsx

import type { PlayerIdentity } from "@/lib/profile/getPlayerIdentity";
import {
  getDefaultMaxPlayersForGame,
  getDefaultVariantForGame,
} from "@/lib/games/gameCatalog";
import type { Game, RoomVisibility } from "@/lib/home/homeTypes";

type VariantOption = {
  key: string;
  label: string;
  description: string;
  available: boolean;
};

type GameConfig = {
  maxPlayersOptions: number[];
  variants: VariantOption[];
};

type Props = {
  playerIdentity: PlayerIdentity | null;
  visibleGames: Game[];
  selectedGame: Game | null;
  selectedGameConfig: GameConfig | null;
  selectedVariantKey: string;
  selectedVariantLabel: string;
  maxPlayers: number;
  roomVisibility: RoomVisibility;
  creating: boolean;
  onCreateRoom: () => void;
  onSelectedGameSlugChange: (slug: string) => void;
  onSelectedVariantKeyChange: (key: string) => void;
  onMaxPlayersChange: (players: number) => void;
  onRoomVisibilityChange: (visibility: RoomVisibility) => void;
};

export default function CreateRoomCard({
  playerIdentity,
  visibleGames,
  selectedGame,
  selectedGameConfig,
  selectedVariantKey,
  selectedVariantLabel,
  maxPlayers,
  roomVisibility,
  creating,
  onCreateRoom,
  onSelectedGameSlugChange,
  onSelectedVariantKeyChange,
  onMaxPlayersChange,
  onRoomVisibilityChange,
}: Props) {
  return (
    <div className="rounded-[30px] border border-orange-500/15 bg-zinc-950/90 p-7 shadow-[0_0_40px_rgba(249,115,22,0.05)] transition hover:border-orange-500/25 hover:shadow-[0_0_60px_rgba(249,115,22,0.08)]">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-500/10 text-4xl text-orange-500">
        +
      </div>

      <h2 className="text-3xl font-bold">Crear sala</h2>
      <p className="mt-3 text-base leading-relaxed text-white/65">
        Inicia una nueva sesión de juego e invita a tu familia a unirse.
      </p>

      {!playerIdentity && (
        <div className="mt-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
          Para crear una sala primero inicia sesión o entra como invitado.
        </div>
      )}

      <div className="mt-6">
        <label className="mb-2 block text-sm font-semibold uppercase tracking-[0.18em] text-white/60">
          Selecciona un juego
        </label>

        <select
          value={selectedGame?.slug ?? ""}
          onChange={(e) => {
            const nextSlug = e.target.value;
            onSelectedGameSlugChange(nextSlug);
            onSelectedVariantKeyChange(getDefaultVariantForGame(nextSlug));
            onMaxPlayersChange(getDefaultMaxPlayersForGame(nextSlug));
            onRoomVisibilityChange("private");
          }}
          className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-500/50"
        >
          {visibleGames.map((game) => (
            <option
              key={game.id}
              value={game.slug}
              disabled={game.status !== "available"}
            >
              {game.name} {game.status === "coming_soon" ? "— Próximamente" : ""}
            </option>
          ))}
        </select>

        {selectedGame && (
          <div className="mt-4 rounded-3xl border border-orange-500/15 bg-orange-500/5 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xl font-bold">{selectedGame.name}</p>
                <p className="mt-2 text-sm leading-relaxed text-white/65">
                  {selectedGame.description}
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${
                  selectedGame.status === "available"
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-orange-500/15 text-orange-300"
                }`}
              >
                {selectedGame.status === "available"
                  ? "Disponible"
                  : "Próximamente"}
              </span>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
                  Jugadores
                </p>

                <div className="flex flex-wrap gap-2">
                  {(selectedGameConfig?.maxPlayersOptions ?? [
                    selectedGame.min_players,
                  ]).map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => onMaxPlayersChange(num)}
                      className={`rounded-2xl px-4 py-2 text-sm font-bold transition ${
                        maxPlayers === num
                          ? "bg-orange-500 text-black"
                          : "bg-white/10 text-white/70 hover:bg-white/15"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>

                <p className="mt-2 text-sm text-orange-300">
                  Hasta {maxPlayers} jugadores
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
                  Variante
                </p>

                <div className="grid gap-2">
                  {(selectedGameConfig?.variants ?? []).map((variant) => {
                    const isSelected = selectedVariantKey === variant.key;
                    const isAvailable = variant.available;

                    return (
                      <button
                        key={variant.key}
                        type="button"
                        onClick={() => {
                          if (!isAvailable) return;
                          onSelectedVariantKeyChange(variant.key);
                        }}
                        disabled={!isAvailable}
                        className={`rounded-2xl border px-4 py-3 text-left transition ${
                          !isAvailable
                            ? "cursor-not-allowed border-white/10 bg-white/[0.03] opacity-60"
                            : isSelected
                              ? "border-orange-500/40 bg-orange-500/10"
                              : "border-white/10 bg-white/5 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-bold text-white">
                              {variant.label}
                            </p>
                            <p className="mt-1 text-sm text-white/60">
                              {variant.description}
                            </p>
                          </div>

                          {!isAvailable && (
                            <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/60">
                              Próximamente
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
                  Tipo de sala
                </p>

                <div className="grid gap-2">
                  {[
                    {
                      key: "private",
                      label: "Privada 🔒",
                      description: "Solo entra quien tenga el código.",
                      disabled: false,
                    },
                    {
                      key: "public",
                      label: "Pública 🌍",
                      description:
                        "Aparece en salas abiertas para que otros jugadores se unan.",
                      disabled: false,
                    },
                    {
                      key: "friends",
                      label: "Solo amigos 👥",
                      description:
                        "Aparece solamente para tus amigos agregados.",
                      disabled: !playerIdentity || playerIdentity.is_guest,
                    },
                  ].map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => {
                        if (option.disabled) return;
                        onRoomVisibilityChange(option.key as RoomVisibility);
                      }}
                      disabled={option.disabled}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        option.disabled
                          ? "cursor-not-allowed border-white/10 bg-white/[0.03] opacity-50"
                          : roomVisibility === option.key
                            ? "border-orange-500/40 bg-orange-500/10"
                            : "border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <p className="font-bold text-white">{option.label}</p>
                      <p className="mt-1 text-sm text-white/60">
                        {option.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                Configuración seleccionada
              </p>
              <p className="mt-2 text-sm text-white/75">
                <span className="font-bold text-white">{selectedGame.name}</span>
                {" · "}
                <span>{selectedVariantLabel || "Variante por defecto"}</span>
                {" · "}
                <span>
                  {maxPlayers} jugador{maxPlayers !== 1 ? "es" : ""}
                </span>
                {" · "}
                <span>
                  {roomVisibility === "private"
                    ? "Privada"
                    : roomVisibility === "public"
                      ? "Pública"
                      : "Solo amigos"}
                </span>
              </p>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={onCreateRoom}
        disabled={
          creating ||
          !selectedGame ||
          selectedGame.status !== "available" ||
          !playerIdentity
        }
        className="mt-6 w-full rounded-2xl bg-orange-500 px-5 py-3.5 text-lg font-bold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {creating ? "Creando sala..." : "Crear sala →"}
      </button>
    </div>
  );
}
