// 📍 Ruta del archivo: components/create-room/CreateRoomGamePicker.tsx

import type { Game } from "@/lib/home/homeTypes";
import {
  CREATE_ROOM_GROUPS,
  getGameEmoji,
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
    <section className="rounded-[34px] border border-white/10 bg-zinc-950/90 p-6 shadow-[0_0_45px_rgba(249,115,22,0.06)]">
      <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-300">
        Paso 1
      </p>

      <h2 className="mt-2 text-3xl font-black text-white">
        Escoge un juego
      </h2>

      <p className="mt-2 text-white/60">
        Selecciona el tipo de experiencia que quieres jugar.
      </p>

      <div className="mt-6 space-y-7">
        {CREATE_ROOM_GROUPS.map((group) => {
          const groupGames = getGamesForGroup(games, group.slugs);

          if (groupGames.length === 0) return null;

          return (
            <div key={group.key}>
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/10 text-2xl">
                  {group.icon}
                </div>

                <div>
                  <h3 className="font-black text-white">{group.title}</h3>
                  <p className="text-sm text-white/50">{group.subtitle}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {groupGames.map((game) => {
                  const selected = selectedGameSlug === game.slug;
                  const disabled = game.status !== "available";

                  return (
                    <button
                      key={game.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => onSelectGame(game.slug)}
                      className={`rounded-[24px] border p-4 text-left transition ${
                        disabled
                          ? "cursor-not-allowed border-white/10 bg-white/[0.03] opacity-50"
                          : selected
                            ? "border-orange-500/50 bg-orange-500/15 shadow-[0_0_30px_rgba(249,115,22,0.10)]"
                            : "border-white/10 bg-white/[0.04] hover:border-orange-500/25 hover:bg-white/[0.07]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-3xl">{getGameEmoji(game.slug)}</div>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                            game.status === "available"
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-orange-500/15 text-orange-300"
                          }`}
                        >
                          {game.status === "available" ? "Disponible" : "Pronto"}
                        </span>
                      </div>

                      <p className="mt-3 text-lg font-black text-white">
                        {game.name}
                      </p>

                      <p className="mt-2 line-clamp-2 text-sm text-white/55">
                        {game.description}
                      </p>
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