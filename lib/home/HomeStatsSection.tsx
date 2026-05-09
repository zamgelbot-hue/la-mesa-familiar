// 📍 Ruta del archivo: components/home/HomeStatsSection.tsx

import type { HomeStats } from "@/lib/home/homeTypes";

type Props = {
  stats: HomeStats;
};

const statCards = [
  {
    key: "activePlayers",
    label: "Jugadores activos hoy",
    helper: "1 vez por dispositivo al día",
    suffix: "+",
  },
  {
    key: "availableGames",
    label: "Juegos disponibles",
    helper: "Listos para jugar ahora",
    suffix: "",
  },
  {
    key: "gamesPlayed",
    label: "Partidas iniciadas",
    helper: "No cuenta salas en espera",
    suffix: "+",
  },
  {
    key: "roomsCreated",
    label: "Salas creadas",
    helper: "Histórico de mesas abiertas",
    suffix: "+",
  },
] as const;

export default function HomeStatsSection({ stats }: Props) {
  return (
    <div className="mx-auto mt-16 grid max-w-5xl grid-cols-2 gap-4 border-t border-orange-500/15 pt-10 text-center md:grid-cols-4 md:gap-6">
      {statCards.map((card) => {
        const value = stats[card.key];

        return (
          <div
            key={card.key}
            className="rounded-[2rem] border border-white/5 bg-white/[0.025] px-4 py-6 shadow-[0_0_30px_rgba(0,0,0,0.22)] transition hover:border-orange-500/20 hover:bg-orange-500/[0.04]"
          >
            <p className="text-4xl font-black tracking-tight text-white md:text-5xl">
              {value}
              {card.suffix}
            </p>
            <p className="mt-2 text-sm font-bold text-white/75 md:text-base">{card.label}</p>
            <p className="mt-1 text-[11px] font-medium text-white/35 md:text-xs">
              {card.helper}
            </p>
          </div>
        );
      })}
    </div>
  );
}