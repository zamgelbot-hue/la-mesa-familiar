// 📍 Ruta del archivo: components/home/TopPlayersSection.tsx

import type { PlayerIdentity } from "@/lib/profile/getPlayerIdentity";
import { getAvatarByKey, getFrameByKey } from "@/lib/profile/profileCosmetics";
import type { TopPlayer } from "@/lib/home/homeTypes";

type Props = {
  topPlayers: TopPlayer[];
  loadingTopPlayers: boolean;
  playerIdentity: PlayerIdentity | null;
  onRankingClick: () => void;
};

export default function TopPlayersSection({
  topPlayers,
  loadingTopPlayers,
  playerIdentity,
  onRankingClick,
}: Props) {
  const renderProfileAvatar = (
    avatar: { emoji?: string; image?: string; label?: string },
    frame: { className?: string; image?: string; label?: string },
  ) => {
    return (
      <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-black">
        {frame.image ? (
          <img
            src={frame.image}
            alt={frame.label ?? "Frame"}
            className="absolute inset-0 h-full w-full object-contain"
          />
        ) : (
          <div
            className={`absolute inset-0 rounded-full border-4 ${
              frame.className ?? ""
            }`}
          />
        )}

        {avatar.image ? (
          <img
            src={avatar.image}
            alt={avatar.label ?? "Avatar"}
            className="relative z-10 h-10 w-10 object-contain"
          />
        ) : (
          <span className="relative z-10 text-2xl">{avatar.emoji}</span>
        )}
      </div>
    );
  };

  const getTopPositionBadge = (position: number) => {
    if (position === 1) return "👑";
    if (position === 2) return "🥈";
    return "🥉";
  };

  const getTopPositionStyles = (position: number) => {
    if (position === 1) {
      return "border-yellow-400/30 bg-yellow-500/10 shadow-[0_0_25px_rgba(250,204,21,0.10)]";
    }

    if (position === 2) {
      return "border-slate-300/20 bg-slate-200/5 shadow-[0_0_20px_rgba(226,232,240,0.06)]";
    }

    return "border-orange-400/25 bg-orange-500/10 shadow-[0_0_20px_rgba(251,146,60,0.06)]";
  };

  return (
    <div className="mx-auto mt-12 max-w-5xl rounded-[30px] border border-orange-500/15 bg-zinc-950/90 p-6 shadow-[0_0_40px_rgba(249,115,22,0.05)]">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-300/80">
            Top jugadores
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white">
            Los mejores de la mesa
          </h2>
          <p className="mt-1 text-sm text-white/60">
            Los 3 jugadores con más puntos actuales.
          </p>
        </div>

        <button
          type="button"
          onClick={onRankingClick}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 font-semibold text-white transition hover:bg-white/10"
        >
          Ver ranking
        </button>
      </div>

      {loadingTopPlayers ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-10 text-center text-white/70">
          Cargando top jugadores...
        </div>
      ) : topPlayers.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-10 text-center text-white/70">
          Aún no hay jugadores suficientes para mostrar el Top 3.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {topPlayers.map((player, index) => {
            const position = index + 1;
            const avatar = getAvatarByKey(player.avatar_key);
            const frame = getFrameByKey(player.frame_key);
            const gamesPlayed = player.games_played ?? 0;
            const gamesWon = player.games_won ?? 0;
            const winRate =
              gamesPlayed > 0
                ? ((gamesWon / gamesPlayed) * 100).toFixed(1)
                : null;

            const isMe =
              !!playerIdentity?.user_id &&
              player.id === playerIdentity.user_id;

            return (
              <div
                key={player.id}
                className={`rounded-[28px] border p-5 transition hover:border-orange-500/30 hover:bg-white/[0.05] ${getTopPositionStyles(
                  position,
                )} ${
                  isMe
                    ? "ring-2 ring-emerald-400/50 shadow-[0_0_25px_rgba(16,185,129,0.12)]"
                    : ""
                }`}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black/30 text-lg font-extrabold">
                    {getTopPositionBadge(position)}
                  </div>

                  {isMe && (
                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-300">
                      Tú
                    </span>
                  )}
                </div>

                <div className="flex justify-center">
                  {renderProfileAvatar(avatar, frame)}
                </div>

                <div className="mt-4 text-center">
                  <p className="truncate text-lg font-bold text-white">
                    {player.display_name || "Jugador"}
                  </p>

                  <p className="mt-2 text-3xl font-extrabold text-orange-400">
                    {player.points ?? 0}
                  </p>

                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">
                    pts
                  </p>

                  <p className="mt-3 text-sm text-white/65">
                    {gamesPlayed === 0
                      ? "Sin partidas registradas"
                      : `${gamesPlayed} jugadas · ${gamesWon} ganadas · ${winRate}% WR`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
