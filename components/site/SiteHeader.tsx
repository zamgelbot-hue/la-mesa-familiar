"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PlayerAvatar from "@/components/PlayerAvatar";
import { getAvatarByKey, getFrameByKey } from "@/lib/profileCosmetics";
import { createClient } from "@/lib/supabase/client";
import type { PlayerIdentity } from "@/lib/getPlayerIdentity";

type SiteHeaderProps = {
  playerIdentity?: PlayerIdentity | null;
  onSignOut?: () => void;
  signingOut?: boolean;
  showMainNav?: boolean;
  showHomeButton?: boolean;
  showRankingButton?: boolean;
  showFriendsButton?: boolean;
  showProfileButton?: boolean;
  showStartButton?: boolean;
  showLoginButton?: boolean;
};

export default function SiteHeader({
  playerIdentity = null,
  onSignOut,
  signingOut = false,
  showMainNav = false,
  showHomeButton = false,
  showRankingButton = false,
  showFriendsButton = false,
  showProfileButton = false,
  showStartButton = false,
  showLoginButton = false,
}: SiteHeaderProps) {
  const router = useRouter();
  const supabase = createClient();

  const [pendingRoomInvites, setPendingRoomInvites] = useState(0);
  const [pendingFriendRequests, setPendingFriendRequests] = useState(0);

  const selectedAvatar = getAvatarByKey(playerIdentity?.avatar_key);
  const selectedFrame = getFrameByKey(playerIdentity?.frame_key);

  const totalNotifications = pendingRoomInvites + pendingFriendRequests;

  const loadSocialNotifications = useCallback(async () => {
    if (!playerIdentity?.user_id || playerIdentity.is_guest) {
      setPendingRoomInvites(0);
      setPendingFriendRequests(0);
      return;
    }

    const [roomInvitesRes, friendRequestsRes] = await Promise.all([
      supabase
        .from("room_invitations")
        .select("id", { count: "exact", head: true })
        .eq("receiver_id", playerIdentity.user_id)
        .eq("status", "pending"),

      supabase
        .from("friendships")
        .select("id", { count: "exact", head: true })
        .eq("addressee_id", playerIdentity.user_id)
        .eq("status", "pending"),
    ]);

    if (!roomInvitesRes.error) {
      setPendingRoomInvites(roomInvitesRes.count ?? 0);
    }

    if (!friendRequestsRes.error) {
      setPendingFriendRequests(friendRequestsRes.count ?? 0);
    }
  }, [supabase, playerIdentity?.user_id, playerIdentity?.is_guest]);

  useEffect(() => {
    void loadSocialNotifications();
  }, [loadSocialNotifications]);

  useEffect(() => {
    if (!playerIdentity?.user_id || playerIdentity.is_guest) return;

    const channel = supabase
      .channel(`global-social-${playerIdentity.user_id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_invitations",
          filter: `receiver_id=eq.${playerIdentity.user_id}`,
        },
        () => {
          void loadSocialNotifications();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friendships",
          filter: `addressee_id=eq.${playerIdentity.user_id}`,
        },
        () => {
          void loadSocialNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    supabase,
    playerIdentity?.user_id,
    playerIdentity?.is_guest,
    loadSocialNotifications,
  ]);

  return (
    <header className="sticky top-0 z-50 border-b border-orange-500/10 bg-black/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="shrink-0 transition hover:opacity-90">
            <img
              src="/branding/logo-horizontal.png?v=8"
              alt="La Mesa Familiar"
              className="h-14 w-auto object-contain"
            />
          </Link>

          {showMainNav && (
            <nav className="hidden items-center gap-10 text-white/70 md:flex">
              <a href="#juegos" className="transition hover:text-white">
                Juegos
              </a>
              <a href="#como-funciona" className="transition hover:text-white">
                Cómo funciona
              </a>
              <a href="#funciones" className="transition hover:text-white">
                Funciones
              </a>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-3">
          {showHomeButton && (
            <button
              type="button"
              onClick={() => router.push("/")}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 font-semibold text-white transition hover:bg-white/10"
            >
              Inicio
            </button>
          )}

          {showRankingButton && (
            <button
              type="button"
              onClick={() => router.push("/ranking")}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 font-semibold text-white transition hover:bg-white/10"
            >
              Ranking
            </button>
          )}

          {showFriendsButton && (
            <button
              type="button"
              onClick={() => router.push("/amigos")}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 font-semibold text-white transition hover:bg-white/10"
            >
              Amigos
            </button>
          )}

          {playerIdentity?.user_id && !playerIdentity.is_guest && (
            <button
              type="button"
              onClick={() => router.push("/amigos")}
              className={`relative rounded-2xl border px-4 py-2 font-semibold transition ${
                totalNotifications > 0
                  ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.12)]"
                  : "border-white/10 bg-white/5 text-white hover:bg-white/10"
              }`}
              title={
                totalNotifications > 0
                  ? `${pendingRoomInvites} invitaciones, ${pendingFriendRequests} solicitudes`
                  : "Notificaciones"
              }
            >
              🔔
              {totalNotifications > 0 && (
                <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-orange-500 px-1.5 text-xs font-extrabold text-black">
                  {totalNotifications}
                </span>
              )}
            </button>
          )}

          {showLoginButton && (
            <button
              type="button"
              onClick={() => router.push("/acceso")}
              className="hidden rounded-2xl px-4 py-2 font-semibold text-white transition hover:bg-white/5 md:block"
            >
              Iniciar sesión
            </button>
          )}

          {playerIdentity ? (
            <>
              {showProfileButton && (
                <button
                  type="button"
                  onClick={() => router.push("/perfil")}
                  className="hidden items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 font-semibold text-white transition hover:bg-white/10 md:flex"
                >
                  <PlayerAvatar
                    avatar={selectedAvatar}
                    frame={selectedFrame}
                    size="sm"
                  />
                  <span>
                    {playerIdentity.name}{" "}
                    {playerIdentity.is_guest ? "(Invitado)" : ""}
                  </span>
                </button>
              )}

              {onSignOut && (
                <button
                  type="button"
                  onClick={onSignOut}
                  disabled={signingOut}
                  className="rounded-2xl bg-orange-500 px-5 py-2.5 font-bold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {signingOut ? "Saliendo..." : "Cerrar sesión"}
                </button>
              )}
            </>
          ) : (
            <>
              {showStartButton && (
                <button
                  type="button"
                  onClick={() => router.push("/acceso")}
                  className="rounded-2xl bg-orange-500 px-5 py-2.5 font-bold text-black transition hover:bg-orange-400"
                >
                  Empezar
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
