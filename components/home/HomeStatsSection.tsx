// 📍 Ruta del archivo: components/home/HomeStatsSection.tsx

import type { HomeStats } from "@/lib/home/homeTypes";

type Props = {
  stats: HomeStats;
};

export default function HomeStatsSection({ stats }: Props) {
  return (
    <div className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-6 border-t border-orange-500/15 pt-10 text-center sm:grid-cols-3">
      <div className="rounded-3xl bg-white/[0.02] px-4 py-6">
        <p className="text-5xl font-extrabold text-white">{stats.activePlayers}+</p>
        <p className="mt-1 text-white/70">Jugadores activos</p>
      </div>

      <div className="rounded-3xl bg-white/[0.02] px-4 py-6">
        <p className="text-5xl font-extrabold text-white">{stats.classicGames}</p>
        <p className="mt-1 text-white/70">Juegos clásicos</p>
      </div>

      <div className="rounded-3xl bg-white/[0.02] px-4 py-6">
        <p className="text-5xl font-extrabold text-white">{stats.gamesPlayed}+</p>
        <p className="mt-1 text-white/70">Partidas jugadas</p>
      </div>
    </div>
  );
}
