// 📍 Ruta del archivo: components/home/GamesGridSection.tsx

import {
  getDefaultMaxPlayersForGame,
  getDefaultVariantForGame,
  getGameIcon,
} from "@/lib/games/gameCatalog";
import type { Game, RoomVisibility } from "@/lib/home/homeTypes";

type Props = {
  visibleGames: Game[];
  onSelectedGameSlugChange: (slug: string) => void;
  onSelectedVariantKeyChange: (key: string) => void;
  onMaxPlayersChange: (players: number) => void;
  onRoomVisibilityChange: (visibility: RoomVisibility) => void;
};

export default function GamesGridSection({
  visibleGames,
  onSelectedGameSlugChange,
  onSelectedVariantKeyChange,
  onMaxPlayersChange,
  onRoomVisibilityChange,
}: Props) {
  return (
    <section id="juegos" className="border-t border-orange-500/10 px-6 py-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <h2 className="text-5xl font-extrabold">
            Juegos clásicos, experiencia moderna
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-xl text-white/65">
            Juega tus juegos tradicionales favoritos con familiares de todo el mundo.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visibleGames.map((game) => {
            const gameIcon = getGameIcon(game.slug);

            return (
              <div
                key={game.id}
                className="group rounded-[28px] border border-orange-500/15 bg-zinc-950/90 p-6 transition hover:-translate-y-1 hover:border-orange-500/30 hover:shadow-[0_0_40px_rgba(249,115,22,0.06)]"
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-xl">
                    {gameIcon}
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${
                      game.status === "available"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-orange-500/15 text-orange-300"
                    }`}
                  >
                    {game.status === "available" ? "Disponible" : "Próximamente"}
                  </span>
                </div>

                <h3 className="text-2xl font-bold">{game.name}</h3>
                <p className="mt-3 min-h-[52px] text-white/65">
                  {game.description}
                </p>

                <div className="mt-4 inline-flex rounded-full bg-white/[0.04] px-3 py-1 text-sm text-white/60">
                  {game.slug === "piedra-papel-o-tijera"
                    ? "2 jugadores"
                    : `${game.min_players}-${game.max_players} jugadores`}
                </div>

                <div className="mt-6">
                  {game.status === "available" ? (
                    <button
                      onClick={() => {
                        onSelectedGameSlugChange(game.slug);
                        onSelectedVariantKeyChange(
                          getDefaultVariantForGame(game.slug),
                        );
                        onMaxPlayersChange(getDefaultMaxPlayersForGame(game.slug));
                        onRoomVisibilityChange("private");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="rounded-2xl bg-orange-500 px-4 py-2.5 font-bold text-black transition hover:bg-orange-400"
                    >
                      Jugar ahora
                    </button>
                  ) : (
                    <div className="inline-flex rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/60">
                      Próximamente
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
