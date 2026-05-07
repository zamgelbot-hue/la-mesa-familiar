// 📍 Ruta del archivo: components/create-room/CreateRoomGamePicker.tsx

import type { Game } from "@/lib/home/homeTypes";
import {
  CREATE_ROOM_GROUPS,
  getGameVisualInfo,
  getGamesForGroup,
} from "./createRoomUtils";

type Props = {
  games: Game[];
  selectedGameSlug: string;
  onSelectGame: (slug: string) => void;
};

export default function CreateRoomGamePicker({
  games,
  selectedGameSlug,
  onSelectGame,
}: Props) {
  return (
    <section className="rounded-[34px] border border-white/10 bg-zinc-950/90 p-6 shadow-[0_0_45px_rgba(249,115,22,0.06)] md:p-7">
      <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-300">
        Paso 1
      </p>

      <h2 className="mt-2 text-3xl font-black text-white">
        Escoge un juego
      </h2>

      <p className="mt-2 text-white/60">
        Selecciona una experiencia según el tiempo, dificultad y tipo de partida.
      </p>

      <div className="mt-7 space-y-8">
        {CREATE_ROOM_GROUPS.map((group) => {
          const groupGames = getGamesForGroup(games, group.slugs);

          if (groupGames.length === 0) return null;

          return (
            <div key={group.key}>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-2xl shadow-[0_0_25px_rgba(249,115,22,0.08)]">
                  {group.icon}
                </div>

                <div>
                  <h3 className="text-lg font-black text-white">
                    {group.title}
                  </h3>
                  <p className="text-sm text-white/50">{group.subtitle}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {groupGames.map((game) => {
                  const visual = getGameVisualInfo(game.slug);
                  const selected = selectedGameSlug === game.slug;
                  const disabled = game.status !== "available";

                  return (
                    <button
                      key={game.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => onSelectGame(game.slug)}
                      className={`group relative min-h-[190px] overflow-hidden rounded-[28px] border p-5 text-left transition ${
                        disabled
                          ? "cursor-not-allowed border-white/10 bg-white/[0.03] opacity-50"
                          : selected
                            ? "border-orange-500/60 bg-orange-500/15 shadow-[0_0_35px_rgba(249,115,22,0.14)]"
                            : "border-white/10 bg-white/[0.04] hover:border-orange-500/30 hover:bg-white/[0.07]"
                      }`}
                    >
                      <div
                        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${visual.gradient}`}
                      />

                      <div className="relative flex items-start justify-between gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black/35 text-3xl shadow-inner">
                          {visual.emoji}
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                              game.status === "available"
                                ? "bg-emerald-500/15 text-emerald-300"
                                : "bg-orange-500/15 text-orange-300"
                            }`}
                          >
                            {game.status === "available" ? "Disponible" : "Pronto"}
                          </span>

                          <span className="rounded-full bg-black/35 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-orange-200">
                            {visual.badge}
                          </span>
                        </div>
                      </div>

                      <div className="relative mt-4">
                        <p className="text-xl font-black text-white">
                          {game.name}
                        </p>

                        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/60">
                          {game.description}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-bold text-white/70">
                            ⏱ {visual.duration}
                          </span>

                          <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-bold text-white/70">
                            🎯 {visual.difficulty}
                          </span>

                          <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-bold text-white/70">
                            👥 {game.min_players}-{game.max_players}
                          </span>
                        </div>
                      </div>

                      {selected && (
                        <div className="absolute bottom-4 right-4 rounded-full bg-orange-500 px-3 py-1 text-xs font-black text-black">
                          Seleccionado
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}