// 📍 Ruta del archivo: components/site/SiteHeader.tsx

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PlayerAvatar from "@/components/PlayerAvatar";
import { getAvatarByKey, getFrameByKey } from "@/lib/profile/profileCosmetics";
import { createClient } from "@/lib/supabase/client";
import type { PlayerIdentity } from "@/lib/profile/getPlayerIdentity";

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
  const [menuOpen, setMenuOpen] = useState(false);

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

  return (
    <header className="sticky top-0 z-50 border-b border-orange-500/10 bg-black/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 relative">

        {/* LEFT */}
        <div className="flex items-center gap-8">
          <Link href="/" className="shrink-0 transition hover:opacity-90">
            <img
              src="/branding/logo-horizontal.png?v=8"
              alt="La Mesa Familiar"
              className="h-14 w-auto object-contain"
            />
          </Link>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-3">

          {showHomeButton && (
            <button
              onClick={() => router.push("/")}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 font-semibold text-white hover:bg-white/10"
            >
              Inicio
            </button>
          )}

          {showRankingButton && (
            <button
              onClick={() => router.push("/ranking")}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 font-semibold text-white hover:bg-white/10"
            >
              Ranking
            </button>
          )}

          {showFriendsButton && (
            <button
              onClick={() => router.push("/amigos")}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 font-semibold text-white hover:bg-white/10"
            >
              Amigos
            </button>
          )}

          {/* 🔥 NUEVO BOTÓN TIENDA */}
          {playerIdentity?.user_id && !playerIdentity.is_guest && (
            <button
              onClick={() => router.push("/perfil?tab=shop")}
              className="rounded-2xl border border-orange-500/25 bg-orange-500/10 px-5 py-2.5 font-bold text-orange-200 hover:bg-orange-500/20"
            >
              Tienda ✨
            </button>
          )}

          {/* 🔔 NOTIFICACIONES */}
          {playerIdentity?.user_id && !playerIdentity.is_guest && (
            <button
              onClick={() => router.push("/amigos")}
              className="relative rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white hover:bg-white/10"
            >
              🔔
              {totalNotifications > 0 && (
                <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-orange-500 text-xs font-extrabold text-black">
                  {totalNotifications}
                </span>
              )}
            </button>
          )}

          {/* 👤 PERFIL */}
          {playerIdentity && showProfileButton && (
            <button
              onClick={() => router.push("/perfil")}
              className="hidden items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white hover:bg-white/10 md:flex"
            >
              <PlayerAvatar avatar={selectedAvatar} frame={selectedFrame} size="sm" />
              <span>{playerIdentity.name}</span>
            </button>
          )}

          {/* ☰ MENU */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-lg text-white hover:bg-white/10"
          >
            ☰
          </button>

          {/* 🚪 LOGOUT */}
          {onSignOut && (
            <button
              onClick={onSignOut}
              className="rounded-2xl bg-orange-500 px-5 py-2.5 font-bold text-black hover:bg-orange-400"
            >
              Cerrar sesión
            </button>
          )}

        </div>

        {/* 🔥 MENU DESPLEGABLE */}
        {menuOpen && (
          <div className="absolute right-6 top-20 z-50 w-64 rounded-3xl border border-white/10 bg-zinc-950 p-4 shadow-xl">
            
            <button
              onClick={() => {
                router.push("/perfil");
                setMenuOpen(false);
              }}
              className="w-full rounded-xl px-4 py-3 text-left text-white hover:bg-white/10"
            >
              👤 Perfil
            </button>

            <button
              onClick={() => {
                router.push("/perfil?tab=shop");
                setMenuOpen(false);
              }}
              className="w-full rounded-xl px-4 py-3 text-left text-white hover:bg-white/10"
            >
              🛒 Tienda
            </button>

            <button
              onClick={() => {
                alert("Próximamente ajustes");
                setMenuOpen(false);
              }}
              className="w-full rounded-xl px-4 py-3 text-left text-white hover:bg-white/10"
            >
              ⚙️ Ajustes
            </button>

          </div>
        )}
      </div>
    </header>
  );
}
