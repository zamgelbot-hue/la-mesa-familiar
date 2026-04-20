"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getPlayerIdentity, type PlayerIdentity } from "@/lib/getPlayerIdentity";
import { getAvatarByKey, getFrameByKey } from "@/lib/profileCosmetics";
import PlayerAvatar from "@/components/PlayerAvatar";
import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";

type LeaderboardTab = "points" | "total_points_earned" | "best_win_streak" | "win_rate";

type LeaderboardProfile = {
  id: string;
  display_name: string | null;
  points: number | null;
  games_played: number | null;
  games_won: number | null;
  games_lost: number | null;
  total_points_earned: number | null;
  best_win_streak: number | null;
  avatar_key: string | null;
  frame_key: string | null;
};

type RankedPlayer = {
  id: string;
  display_name: string;
  points: number;
  games_played: number;
  games_won: number;
  games_lost: number;
  total_points_earned: number;
  best_win_streak: number;
  avatar_key: string | null;
  frame_key: string | null;
  win_rate: number;
};

const WIN_RATE_MIN_GAMES = 10;

const TAB_LABELS: Record<LeaderboardTab, string> = {
  points: "Puntos",
  total_points_earned: "Acumulado",
  best_win_streak: "Racha",
  win_rate: "Win Rate",
};

function normalizeProfiles(list: LeaderboardProfile[]): RankedPlayer[] {
  return list
    .filter((player) => {
      const hasName = !!player.display_name && player.display_name.trim().length > 0;
      return hasName;
    })
    .map((player) => {
      const gamesPlayed = player.games_played ?? 0;
      const gamesWon = player.games_won ?? 0;
      const gamesLost = player.games_lost ?? 0;
      const points = player.points ?? 0;
      const totalPointsEarned = player.total_points_earned ?? 0;
      const bestWinStreak = player.best_win_streak ?? 0;
      const winRate = gamesPlayed > 0 ? (gamesWon / gamesPlayed) * 100 : 0;

      return {
        id: player.id,
        display_name: player.display_name?.trim() || "Jugador",
        points,
        games_played: gamesPlayed,
        games_won: gamesWon,
        games_lost: gamesLost,
        total_points_earned: totalPointsEarned,
        best_win_streak: bestWinStreak,
        avatar_key: player.avatar_key,
        frame_key: player.frame_key,
        win_rate: winRate,
      };
    });
}

function sortPlayers(players: RankedPlayer[], tab: LeaderboardTab) {
  const copy = [...players];

  copy.sort((a, b) => {
    switch (tab) {
      case "points":
        return (
          b.points - a.points ||
          b.games_won - a.games_won ||
          b.best_win_streak - a.best_win_streak ||
          b.total_points_earned - a.total_points_earned ||
          a.display_name.localeCompare(b.display_name, "es")
        );

      case "total_points_earned":
        return (
          b.total_points_earned - a.total_points_earned ||
          b.points - a.points ||
          b.games_won - a.games_won ||
          b.best_win_streak - a.best_win_streak ||
          a.display_name.localeCompare(b.display_name, "es")
        );

      case "best_win_streak":
        return (
          b.best_win_streak - a.best_win_streak ||
          b.games_won - a.games_won ||
          b.points - a.points ||
          b.total_points_earned - a.total_points_earned ||
          a.display_name.localeCompare(b.display_name, "es")
        );

      case "win_rate":
        return (
          b.win_rate - a.win_rate ||
          b.games_played - a.games_played ||
          b.games_won - a.games_won ||
          b.points - a.points ||
          a.display_name.localeCompare(b.display_name, "es")
        );

      default:
        return 0;
    }
  });

  return copy;
}

function getPrimaryStatLabel(tab: LeaderboardTab) {
  switch (tab) {
    case "points":
      return "pts";
    case "total_points_earned":
      return "acum";
    case "best_win_streak":
      return "racha";
    case "win_rate":
      return "% WR";
    default:
      return "";
  }
}

function getPrimaryStatValue(player: RankedPlayer, tab: LeaderboardTab) {
  switch (tab) {
    case "points":
      return `${player.points}`;
    case "total_points_earned":
      return `${player.total_points_earned}`;
    case "best_win_streak":
      return `${player.best_win_streak}`;
    case "win_rate":
      return `${player.win_rate.toFixed(1)}%`;
    default:
      return "0";
  }
}

function getPodiumStyles(position: number) {
  if (position === 1) {
    return "border-yellow-400/40 bg-yellow-500/10 shadow-[0_0_40px_rgba(250,204,21,0.12)]";
  }

  if (position === 2) {
    return "border-slate-300/20 bg-slate-200/5 shadow-[0_0_30px_rgba(226,232,240,0.08)]";
  }

  if (position === 3) {
    return "border-orange-400/30 bg-orange-500/10 shadow-[0_0_30px_rgba(251,146,60,0.08)]";
  }

  return "border-white/10 bg-white/[0.03]";
}

function getPositionBadge(position: number) {
  if (position === 1) return "👑 #1";
  if (position === 2) return "🥈 #2";
  if (position === 3) return "🥉 #3";
  return `#${position}`;
}

export default function RankingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [tab, setTab] = useState<LeaderboardTab>("points");
  const [players, setPlayers] = useState<RankedPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [playerIdentity, setPlayerIdentity] = useState<PlayerIdentity | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const loadPlayerIdentity = useCallback(async () => {
    const identity = await getPlayerIdentity();
    setPlayerIdentity(identity);
  }, []);

  const loadLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, display_name, points, games_played, games_won, games_lost, total_points_earned, best_win_streak, avatar_key, frame_key"
        );

      if (error) {
        console.error("Error cargando leaderboard:", error);
        setErrorMessage("No se pudo cargar el ranking.");
        return;
      }

      const normalized = normalizeProfiles((data ?? []) as LeaderboardProfile[]);
      setPlayers(normalized);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadPlayerIdentity();
    loadLeaderboard();
  }, [loadPlayerIdentity, loadLeaderboard]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadPlayerIdentity();
      loadLeaderboard();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, loadPlayerIdentity, loadLeaderboard]);

  const filteredPlayers = useMemo(() => {
    if (tab === "win_rate") {
      return players.filter((player) => player.games_played >= WIN_RATE_MIN_GAMES);
    }
    return players;
  }, [players, tab]);

  const rankedPlayers = useMemo(() => {
    return sortPlayers(filteredPlayers, tab);
  }, [filteredPlayers, tab]);

  const currentUserRank = useMemo(() => {
    if (!playerIdentity?.user_id) return null;

    const index = rankedPlayers.findIndex((player) => player.id === playerIdentity.user_id);
    if (index === -1) return null;

    return {
      position: index + 1,
      player: rankedPlayers[index],
    };
  }, [rankedPlayers, playerIdentity]);

return (
  <main className="min-h-screen bg-black text-white">
<SiteHeader
  playerIdentity={playerIdentity}
  showHomeButton
  showProfileButton={!!playerIdentity}
/>tartButton={!playerIdentity}
/>

      <section className="relative overflow-hidden px-6 pb-14 pt-16">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-orange-500/10 blur-3xl" />
          <div className="absolute left-[15%] top-[20%] h-40 w-40 rounded-full bg-red-500/10 blur-3xl" />
          <div className="absolute right-[10%] top-[18%] h-48 w-48 rounded-full bg-amber-500/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl">
          <div className="mx-auto mb-8 w-fit rounded-full border border-orange-500/20 bg-orange-500/10 px-5 py-2 text-sm text-orange-200 shadow-[0_0_25px_rgba(249,115,22,0.08)]">
            🏆 Competencia global entre jugadores
          </div>

          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-5xl font-extrabold leading-tight md:text-7xl">
              Ranking de
              <br />
              <span className="text-orange-500">La Mesa Familiar</span>
            </h1>

            <p className="mx-auto mt-8 max-w-3xl text-xl leading-relaxed text-white/70">
              Mira quién domina la mesa, compara tu progreso y sube posiciones en el ranking global.
            </p>
          </div>

          {currentUserRank && (
            <div className="mx-auto mt-8 max-w-4xl rounded-[28px] border border-emerald-500/20 bg-emerald-500/10 p-5 shadow-[0_0_35px_rgba(16,185,129,0.08)]">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-emerald-300/80">
                    Tu posición actual
                  </p>
                  <p className="mt-2 text-3xl font-extrabold">
                    #{currentUserRank.position} en {TAB_LABELS[tab]}
                  </p>
                </div>

                <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <PlayerAvatar
                    avatar={getAvatarByKey(currentUserRank.player.avatar_key)}
                    frame={getFrameByKey(currentUserRank.player.frame_key)}
                    size="sm"
                  />
                  <div>
                    <p className="font-bold">{currentUserRank.player.display_name}</p>
                    <p className="text-sm text-white/65">
                      {getPrimaryStatValue(currentUserRank.player, tab)} {getPrimaryStatLabel(tab)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mx-auto mt-10 max-w-5xl">
            <div className="rounded-[30px] border border-orange-500/15 bg-zinc-950/90 p-4 shadow-[0_0_40px_rgba(249,115,22,0.05)]">
              <div className="flex flex-wrap gap-3">
                {(["points", "total_points_earned", "best_win_streak", "win_rate"] as LeaderboardTab[]).map((item) => {
                  const active = tab === item;

                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setTab(item)}
                      className={`rounded-2xl px-5 py-3 text-sm font-bold transition ${
                        active
                          ? "bg-orange-500 text-black"
                          : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                      }`}
                    >
                      {TAB_LABELS[item]}
                    </button>
                  );
                })}
              </div>

              {tab === "win_rate" && (
                <div className="mt-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
                  El ranking por win rate solo clasifica jugadores con al menos {WIN_RATE_MIN_GAMES} partidas.
                </div>
              )}
            </div>

            <div className="mt-6 rounded-[30px] border border-orange-500/15 bg-zinc-950/90 p-5 shadow-[0_0_40px_rgba(249,115,22,0.05)]">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">{TAB_LABELS[tab]}</h2>
                  <p className="mt-1 text-white/60">
                    {tab === "points" && "Ranking principal por puntos actuales."}
                    {tab === "total_points_earned" && "Jugadores con mayor progreso acumulado."}
                    {tab === "best_win_streak" && "Las mejores rachas de victorias."}
                    {tab === "win_rate" && "La mejor efectividad entre jugadores clasificados."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={loadLeaderboard}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 font-semibold transition hover:bg-white/10"
                >
                  Actualizar
                </button>
              </div>

              {loading ? (
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-12 text-center text-white/70">
                  Cargando ranking...
                </div>
              ) : errorMessage ? (
                <div className="rounded-3xl border border-red-500/20 bg-red-500/10 px-6 py-12 text-center text-red-300">
                  {errorMessage}
                </div>
              ) : rankedPlayers.length === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-12 text-center text-white/70">
                  Aún no hay suficientes jugadores para mostrar este ranking.
                </div>
              ) : (
                <div className="space-y-4">
                  {rankedPlayers.map((player, index) => {
                    const position = index + 1;
                    const isMe = !!playerIdentity?.user_id && player.id === playerIdentity.user_id;

                    return (
                      <div
                        key={player.id}
                        className={`rounded-[28px] border p-4 transition hover:border-orange-500/30 hover:bg-white/[0.05] ${getPodiumStyles(position)} ${
                          isMe ? "ring-2 ring-emerald-400/50 shadow-[0_0_25px_rgba(16,185,129,0.15)]" : ""
                        }`}
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div className="flex min-w-0 items-center gap-4">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-black/30 text-lg font-extrabold text-white">
                              {getPositionBadge(position)}
                            </div>

                            <PlayerAvatar
                              avatar={getAvatarByKey(player.avatar_key)}
                              frame={getFrameByKey(player.frame_key)}
                              size="md"
                            />

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-xl font-bold">{player.display_name}</p>
                                {isMe && (
                                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-300">
                                    Tú
                                  </span>
                                )}
                              </div>

<p className="mt-2 text-sm leading-relaxed text-white/65">
  {player.games_played === 0
    ? "Sin partidas registradas"
    : `${player.games_played} jugadas · ${player.games_won} ganadas · ${player.games_lost} perdidas · ${player.win_rate.toFixed(1)}% WR · racha máx ${player.best_win_streak}`}
</p>
                            </div>
                          </div>

                          <div className="md:text-right">
                            <p className="text-3xl font-extrabold text-orange-400">
                              {getPrimaryStatValue(player, tab)}
                            </p>
                            <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-white/45">
                              {getPrimaryStatLabel(tab)}
                            </p>

                            {tab !== "points" && (
                              <p className="mt-3 text-sm text-white/60">
                                {player.points} pts actuales
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
