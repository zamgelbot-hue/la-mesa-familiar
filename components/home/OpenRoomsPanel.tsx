// 📍 Ruta del archivo: components/home/OpenRoomsPanel.tsx

import type { Game, OpenRoom } from "@/lib/home/homeTypes";
import OpenRoomCard from "./OpenRoomCard";

type Accent = "cyan" | "emerald";

type Props = {
  title: string;
  description: string;
  icon: string;
  accent: Accent;
  label: "Pública" | "Amigos";
  rooms: OpenRoom[];
  games: Game[];
  loading: boolean;
  emptyMessage: string;
  loadingMessage: string;
  canJoin: boolean;
  onRefresh: () => void;
  onJoin: (code: string) => void;
};

export default function OpenRoomsPanel({
  title,
  description,
  icon,
  accent,
  label,
  rooms,
  games,
  loading,
  emptyMessage,
  loadingMessage,
  canJoin,
  onRefresh,
  onJoin,
}: Props) {
  const accentClasses =
    accent === "cyan"
      ? {
          border: "border-cyan-500/15",
          icon: "bg-cyan-500/10 text-cyan-300",
          maxHeight: "max-h-[280px]",
        }
      : {
          border: "border-emerald-500/15",
          icon: "bg-emerald-500/10 text-emerald-300",
          maxHeight: "max-h-[320px]",
        };

  return (
    <div className={`rounded-[26px] border ${accentClasses.border} bg-white/[0.03] p-5`}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <div
            className={`mb-2 flex h-10 w-10 items-center justify-center rounded-2xl text-xl ${accentClasses.icon}`}
          >
            {icon}
          </div>

          <h3 className="text-lg font-bold">{title}</h3>
          <p className="text-sm text-white/60">{description}</p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold transition hover:bg-white/10"
        >
          Actualizar
        </button>
      </div>

      <div className={`${accentClasses.maxHeight} overflow-y-auto pr-1`}>
        {loading ? (
          <p className="rounded-2xl bg-black/25 p-4 text-sm text-white/60">
            {loadingMessage}
          </p>
        ) : rooms.length === 0 ? (
          <p className="rounded-2xl bg-black/25 p-4 text-sm text-white/60">
            {emptyMessage}
          </p>
        ) : (
          <div className="space-y-3">
            {rooms.map((room) => (
              <OpenRoomCard
                key={`${label}-${room.code}`}
                openRoom={room}
                label={label}
                games={games}
                canJoin={canJoin}
                onJoin={onJoin}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
