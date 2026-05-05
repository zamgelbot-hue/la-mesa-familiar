// 📍 Ruta del archivo: app/amigos/page.tsx

"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { getPlayerIdentity, type PlayerIdentity } from "@/lib/profile/getPlayerIdentity";
import { getAvatarByKey, getFrameByKey } from "@/lib/profile/profileCosmetics";
import PlayerAvatar from "@/components/PlayerAvatar";
import SiteHeader from "@/components/site/SiteHeader";

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  points: number | null;
  games_played: number | null;
  games_won: number | null;
  games_lost: number | null;
  total_points_earned: number | null;
  current_win_streak: number | null;
  best_win_streak: number | null;
  avatar_key: string | null;
  frame_key: string | null;
};

type FriendshipRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "blocked";
  created_at: string;
  updated_at: string;
};

type FriendProfile = ProfileRow & {
  friendshipId: string;
  status: "pending" | "accepted" | "blocked";
  direction: "sent" | "received" | "friend";
};

export default function AmigosPage() {
  const supabase = createClient();

  const [playerIdentity, setPlayerIdentity] = useState<PlayerIdentity | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProfileRow[]>([]);
  const [friendships, setFriendships] = useState<FriendshipRow[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, ProfileRow>>({});
  const [selectedStatsPlayer, setSelectedStatsPlayer] = useState<ProfileRow | null>(null);

  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadIdentity = useCallback(async () => {
    const identity = await getPlayerIdentity();
    setPlayerIdentity(identity);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    setCurrentUserId(user?.id ?? null);
  }, [supabase]);

  const loadFriendships = useCallback(
    async (userId?: string | null) => {
      if (!userId) {
        setFriendships([]);
        setProfilesMap({});
        return;
      }

      const { data, error } = await supabase
        .from("friendships")
        .select("*")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error cargando amistades:", error);
        setErrorMessage("No se pudieron cargar tus amigos.");
        return;
      }

      const rows = (data ?? []) as FriendshipRow[];
      setFriendships(rows);

      const otherIds = Array.from(
        new Set(
          rows.map((row) =>
            row.requester_id === userId ? row.addressee_id : row.requester_id
          )
        )
      );

      if (!otherIds.length) {
        setProfilesMap({});
        return;
      }

      const { data: profileData, error: profilesError } = await supabase
        .from("profiles")
        .select(
          "id, display_name, username, points, games_played, games_won, games_lost, total_points_earned, current_win_streak, best_win_streak, avatar_key, frame_key"
        )
        .in("id", otherIds);

      if (profilesError) {
        console.error("Error cargando perfiles de amigos:", profilesError);
        return;
      }

      const map: Record<string, ProfileRow> = {};
      for (const profile of profileData ?? []) {
        map[profile.id] = profile as ProfileRow;
      }

      setProfilesMap(map);
    },
    [supabase]
  );

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      await loadIdentity();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      await loadFriendships(user?.id ?? null);
    } finally {
      setLoading(false);
    }
  }, [loadIdentity, loadFriendships, supabase]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const friendshipByUserId = useMemo(() => {
    const map = new Map<string, FriendshipRow>();

    if (!currentUserId) return map;

    for (const row of friendships) {
      const otherId =
        row.requester_id === currentUserId ? row.addressee_id : row.requester_id;

      map.set(otherId, row);
    }

    return map;
  }, [friendships, currentUserId]);

  const categorizedFriends = useMemo(() => {
    const accepted: FriendProfile[] = [];
    const received: FriendProfile[] = [];
    const sent: FriendProfile[] = [];

    if (!currentUserId) return { accepted, received, sent };

    for (const row of friendships) {
      const otherId =
        row.requester_id === currentUserId ? row.addressee_id : row.requester_id;

      const profile = profilesMap[otherId];
      if (!profile) continue;

      if (row.status === "accepted") {
        accepted.push({
          ...profile,
          friendshipId: row.id,
          status: row.status,
          direction: "friend",
        });
      }

      if (row.status === "pending" && row.addressee_id === currentUserId) {
        received.push({
          ...profile,
          friendshipId: row.id,
          status: row.status,
          direction: "received",
        });
      }

      if (row.status === "pending" && row.requester_id === currentUserId) {
        sent.push({
          ...profile,
          friendshipId: row.id,
          status: row.status,
          direction: "sent",
        });
      }
    }

    return { accepted, received, sent };
  }, [friendships, profilesMap, currentUserId]);

  const handleSearch = useCallback(async () => {
    const term = query.trim();

    setMessage("");
    setErrorMessage("");

    if (!currentUserId) {
      setErrorMessage("Necesitas iniciar sesión para buscar amigos.");
      return;
    }

    if (term.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, display_name, username, points, games_played, games_won, games_lost, total_points_earned, current_win_streak, best_win_streak, avatar_key, frame_key"
        )
        .or(`display_name.ilike.%${term}%,username.ilike.%${term}%`)
        .neq("id", currentUserId)
        .order("points", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Error buscando jugadores:", error);
        setErrorMessage("No se pudo buscar jugadores.");
        return;
      }

      setSearchResults((data ?? []) as ProfileRow[]);
    } finally {
      setSearching(false);
    }
  }, [query, currentUserId, supabase]);

  useEffect(() => {
    const term = query.trim();

    if (term.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    const timer = window.setTimeout(() => {
      void handleSearch();
    }, 450);

    return () => window.clearTimeout(timer);
  }, [query, handleSearch]);

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`amigos-realtime-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friendships",
          filter: `requester_id=eq.${currentUserId}`,
        },
        () => {
          void loadFriendships(currentUserId);
          setMessage("🤝 Tu lista de amigos se actualizó.");
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friendships",
          filter: `addressee_id=eq.${currentUserId}`,
        },
        () => {
          void loadFriendships(currentUserId);
          setMessage("🤝 Tienes una actualización de amistad.");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, currentUserId, loadFriendships]);

  const sendRequest = async (targetUserId: string) => {
    if (!currentUserId) return;

    try {
      setWorkingId(targetUserId);
      setMessage("");
      setErrorMessage("");

      const existing = friendshipByUserId.get(targetUserId);

      if (existing) {
        setErrorMessage("Ya existe una relación o solicitud con este jugador.");
        return;
      }

      const { error } = await supabase.from("friendships").insert({
        requester_id: currentUserId,
        addressee_id: targetUserId,
        status: "pending",
      });

      if (error) {
        console.error("Error enviando solicitud:", error);
        setErrorMessage("No se pudo enviar la solicitud.");
        return;
      }

      setMessage("Solicitud enviada.");
      await loadFriendships(currentUserId);
      await handleSearch();
    } finally {
      setWorkingId(null);
    }
  };

  const acceptRequest = async (friendshipId: string) => {
    if (!currentUserId) return;

    try {
      setWorkingId(friendshipId);
      setMessage("");
      setErrorMessage("");

      const { error } = await supabase
        .from("friendships")
        .update({
          status: "accepted",
          updated_at: new Date().toISOString(),
        })
        .eq("id", friendshipId);

      if (error) {
        console.error("Error aceptando solicitud:", error);
        setErrorMessage("No se pudo aceptar la solicitud.");
        return;
      }

      setMessage("Solicitud aceptada.");
      await loadFriendships(currentUserId);
      await handleSearch();
    } finally {
      setWorkingId(null);
    }
  };

  const deleteFriendship = async (friendshipId: string) => {
    if (!currentUserId) return;

    try {
      setWorkingId(friendshipId);
      setMessage("");
      setErrorMessage("");

      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", friendshipId);

      if (error) {
        console.error("Error eliminando amistad:", error);
        setErrorMessage("No se pudo eliminar.");
        return;
      }

      setMessage("Actualizado correctamente.");
      await loadFriendships(currentUserId);
      await handleSearch();
    } finally {
      setWorkingId(null);
    }
  };

  const getSearchAction = (player: ProfileRow) => {
    const existing = friendshipByUserId.get(player.id);

    if (!existing) {
      return (
        <button
          type="button"
          onClick={() => void sendRequest(player.id)}
          disabled={workingId === player.id}
          className="rounded-2xl border border-orange-500/30 bg-orange-500/10 px-4 py-2 font-bold text-orange-200 transition hover:bg-orange-500/20 disabled:opacity-60"
        >
          {workingId === player.id ? "Enviando..." : "Agregar"}
        </button>
      );
    }

    if (existing.status === "accepted") {
      return (
        <span className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-300">
          Ya son amigos
        </span>
      );
    }

    if (existing.status === "pending" && existing.requester_id === currentUserId) {
      return (
        <button
          type="button"
          onClick={() => void deleteFriendship(existing.id)}
          disabled={workingId === existing.id}
          className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 font-bold text-yellow-300 transition hover:bg-yellow-500/20 disabled:opacity-60"
        >
          {workingId === existing.id ? "Cancelando..." : "Solicitud enviada"}
        </button>
      );
    }

    if (existing.status === "pending" && existing.addressee_id === currentUserId) {
      return (
        <>
          <button
            type="button"
            onClick={() => void acceptRequest(existing.id)}
            disabled={workingId === existing.id}
            className="rounded-2xl bg-emerald-500 px-4 py-2 font-bold text-black transition hover:bg-emerald-400 disabled:opacity-60"
          >
            Aceptar
          </button>

          <button
            type="button"
            onClick={() => void deleteFriendship(existing.id)}
            disabled={workingId === existing.id}
            className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2 font-bold text-red-300 transition hover:bg-red-500/20 disabled:opacity-60"
          >
            Rechazar
          </button>
        </>
      );
    }

    return (
      <span className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white/70">
        No disponible
      </span>
    );
  };

  const renderPlayerCard = (
    player: ProfileRow,
    action?: ReactNode,
    subtitle?: string
  ) => {
    const avatar = getAvatarByKey(player.avatar_key);
    const frame = getFrameByKey(player.frame_key);
    const gamesPlayed = player.games_played ?? 0;
    const gamesWon = player.games_won ?? 0;

    return (
      <div
        key={player.id}
        onClick={() => setSelectedStatsPlayer(player)}
        className="cursor-pointer rounded-[28px] border border-white/10 bg-white/[0.03] p-5 transition hover:border-orange-500/30 hover:bg-white/[0.05]"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <PlayerAvatar avatar={avatar} frame={frame} size="md" />

            <div className="min-w-0">
              <p className="truncate text-xl font-bold">
                {player.display_name || player.username || "Jugador"}
              </p>

              <p className="mt-1 text-sm text-white/60">
                {subtitle ??
                  `${player.points ?? 0} pts · ${gamesPlayed} jugadas · ${gamesWon} ganadas`}
              </p>

              <p className="mt-1 text-xs text-orange-200/70">
                Toca para ver estadísticas
              </p>
            </div>
          </div>

          {action && (
            <div
              onClick={(event) => event.stopPropagation()}
              className="flex flex-wrap gap-2"
            >
              {action}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStatsModal = () => {
    if (!selectedStatsPlayer) return null;

    const player = selectedStatsPlayer;
    const avatar = getAvatarByKey(player.avatar_key);
    const frame = getFrameByKey(player.frame_key);
    const gamesPlayed = player.games_played ?? 0;
    const gamesWon = player.games_won ?? 0;
    const gamesLost = player.games_lost ?? 0;
    const winRate =
      gamesPlayed > 0 ? ((gamesWon / gamesPlayed) * 100).toFixed(1) : "0.0";

    return (
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm"
        onClick={() => setSelectedStatsPlayer(null)}
      >
        <div
          className="w-full max-w-lg rounded-[34px] border border-orange-500/20 bg-zinc-950 p-6 shadow-[0_0_60px_rgba(249,115,22,0.18)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <PlayerAvatar avatar={avatar} frame={frame} size="md" />
              <div>
                <h2 className="text-2xl font-extrabold">
                  {player.display_name || player.username || "Jugador"}
                </h2>
                <p className="text-sm text-white/60">Resumen del jugador</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedStatsPlayer(null)}
              className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-white transition hover:bg-white/10"
            >
              ✕
            </button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">Puntos</p>
              <p className="mt-2 text-3xl font-extrabold text-orange-400">
                {player.points ?? 0}
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">Win Rate</p>
              <p className="mt-2 text-3xl font-extrabold text-emerald-300">
                {winRate}%
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">Jugadas</p>
              <p className="mt-2 text-3xl font-extrabold">{gamesPlayed}</p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">Récord</p>
              <p className="mt-2 text-lg font-bold">
                {gamesWon} ganadas · {gamesLost} perdidas
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">Racha actual</p>
              <p className="mt-2 text-3xl font-extrabold text-yellow-300">
                {player.current_win_streak ?? 0}
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">Mejor racha</p>
              <p className="mt-2 text-3xl font-extrabold text-yellow-300">
                {player.best_win_streak ?? 0}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-3xl border border-orange-500/15 bg-orange-500/5 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-orange-300">
              Puntos acumulados
            </p>
            <p className="mt-2 text-2xl font-extrabold">
              {player.total_points_earned ?? 0}
            </p>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white">
        <SiteHeader
          playerIdentity={playerIdentity}
          showHomeButton
          showRankingButton={!!playerIdentity}
          showProfileButton={!!playerIdentity}
        />
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="rounded-[34px] border border-orange-500/15 bg-zinc-950/90 p-10 text-center">
            Cargando amigos...
          </div>
        </div>
      </main>
    );
  }

  if (!currentUserId || playerIdentity?.is_guest) {
    return (
      <main className="min-h-screen bg-black text-white">
        <SiteHeader
          playerIdentity={playerIdentity}
          showHomeButton
          showRankingButton={!!playerIdentity}
          showProfileButton={!!playerIdentity}
        />

        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="rounded-[34px] border border-yellow-500/20 bg-yellow-500/10 p-10 text-center">
            <h1 className="text-4xl font-extrabold">Amigos</h1>
            <p className="mt-4 text-yellow-200">
              Necesitas una cuenta registrada para usar el sistema de amigos.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <SiteHeader
        playerIdentity={playerIdentity}
        showHomeButton
        showRankingButton
        showFriendsButton
        showProfileButton
      />

      {renderStatsModal()}

      <section className="relative overflow-hidden px-6 pb-14 pt-16">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-orange-500/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl">
          <div className="mx-auto mb-8 w-fit rounded-full border border-orange-500/20 bg-orange-500/10 px-5 py-2 text-sm text-orange-200">
            🤝 Comunidad familiar
          </div>

          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-5xl font-extrabold leading-tight md:text-7xl">
              Amigos de
              <br />
              <span className="text-orange-500">La Mesa Familiar</span>
            </h1>

            <p className="mx-auto mt-8 max-w-3xl text-xl leading-relaxed text-white/70">
              Busca jugadores, envía solicitudes y administra tu círculo de amigos.
            </p>
          </div>

          {(message || errorMessage) && (
            <div className="mx-auto mt-8 max-w-5xl">
              {message && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-emerald-300">
                  {message}
                </div>
              )}

              {errorMessage && (
                <div className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-300">
                  {errorMessage}
                </div>
              )}
            </div>
          )}

          <div className="mx-auto mt-10 grid max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <section className="rounded-[34px] border border-orange-500/15 bg-zinc-950/90 p-6">
              <h2 className="text-2xl font-bold">Buscar jugadores</h2>
              <p className="mt-2 text-white/60">
                Escribe al menos 2 letras. La búsqueda se actualiza sola.
              </p>

              <div className="mt-5 flex gap-3">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleSearch();
                  }}
                  placeholder="Nombre del jugador"
                  className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-500/50"
                />

                <button
                  type="button"
                  onClick={() => void handleSearch()}
                  disabled={searching || query.trim().length < 2}
                  className="rounded-2xl bg-orange-500 px-5 py-3 font-bold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {searching ? "Buscando..." : "Buscar"}
                </button>
              </div>

              <div className="mt-6 space-y-4">
                {query.trim().length < 2 ? (
                  <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-white/60">
                    Empieza a escribir para buscar jugadores.
                  </div>
                ) : searching ? (
                  <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-white/60">
                    Buscando jugadores...
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-white/60">
                    No encontramos jugadores con ese nombre.
                  </div>
                ) : (
                  searchResults.map((player) =>
                    renderPlayerCard(player, getSearchAction(player))
                  )
                )}
              </div>
            </section>

            <section className="space-y-6">
              <div className="rounded-[34px] border border-emerald-500/15 bg-zinc-950/90 p-6">
                <h2 className="text-2xl font-bold">Solicitudes recibidas</h2>

                <div className="mt-5 space-y-4">
                  {categorizedFriends.received.length === 0 ? (
                    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-white/60">
                      No tienes solicitudes pendientes.
                    </div>
                  ) : (
                    categorizedFriends.received.map((player) =>
                      renderPlayerCard(
                        player,
                        <>
                          <button
                            type="button"
                            onClick={() => void acceptRequest(player.friendshipId)}
                            disabled={workingId === player.friendshipId}
                            className="rounded-2xl bg-emerald-500 px-4 py-2 font-bold text-black transition hover:bg-emerald-400 disabled:opacity-60"
                          >
                            Aceptar
                          </button>

                          <button
                            type="button"
                            onClick={() => void deleteFriendship(player.friendshipId)}
                            disabled={workingId === player.friendshipId}
                            className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2 font-bold text-red-300 transition hover:bg-red-500/20 disabled:opacity-60"
                          >
                            Rechazar
                          </button>
                        </>
                      )
                    )
                  )}
                </div>
              </div>

              <div className="rounded-[34px] border border-orange-500/15 bg-zinc-950/90 p-6">
                <h2 className="text-2xl font-bold">Mis amigos</h2>

                <div className="mt-5 space-y-4">
                  {categorizedFriends.accepted.length === 0 ? (
                    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-white/60">
                      Aún no tienes amigos agregados.
                    </div>
                  ) : (
                    categorizedFriends.accepted.map((player) =>
                      renderPlayerCard(
                        player,
                        <button
                          type="button"
                          onClick={() => void deleteFriendship(player.friendshipId)}
                          disabled={workingId === player.friendshipId}
                          className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2 font-bold text-red-300 transition hover:bg-red-500/20 disabled:opacity-60"
                        >
                          Eliminar
                        </button>
                      )
                    )
                  )}
                </div>
              </div>

              <div className="rounded-[34px] border border-white/10 bg-zinc-950/90 p-6">
                <h2 className="text-2xl font-bold">Solicitudes enviadas</h2>

                <div className="mt-5 space-y-4">
                  {categorizedFriends.sent.length === 0 ? (
                    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-white/60">
                      No tienes solicitudes enviadas.
                    </div>
                  ) : (
                    categorizedFriends.sent.map((player) =>
                      renderPlayerCard(
                        player,
                        <button
                          type="button"
                          onClick={() => void deleteFriendship(player.friendshipId)}
                          disabled={workingId === player.friendshipId}
                          className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2 font-bold text-red-300 transition hover:bg-red-500/20 disabled:opacity-60"
                        >
                          Cancelar
                        </button>,
                        "Solicitud pendiente"
                      )
                    )
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
