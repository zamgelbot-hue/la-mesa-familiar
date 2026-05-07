// 📍 Ruta del archivo: components/site/SiteHeader.tsx

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PlayerAvatar from "@/components/PlayerAvatar";
import SettingsModal from "@/components/settings/SettingsModal";
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
  showHomeButton = false,
  showProfileButton = false,
  showLoginButton = false,
}: SiteHeaderProps) {
  const router = useRouter();
  const supabase = createClient();

  const [pendingRoomInvites, setPendingRoomInvites] = useState(0);
  const [pendingFriendRequests, setPendingFriendRequests] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

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

  const goTo = (href: string) => {
    router.push(href);
    setMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-orange-500/10 bg-black/80 backdrop-blur-xl">
        <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="shrink-0 transition hover:opacity-90">
            <img
              src="/branding/logo-horizontal.png?v=8"
              alt="La Mesa Familiar"
              className="h-14 w-auto object-contain"
            />
          </Link>

          <nav className="hidden items-center gap-3 lg:flex">
            {showHomeButton && (
              <button
                onClick={() => router.push("/")}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 font-semibold text-white hover:bg-white/10"
              >
                Inicio
              </button>
            )}

            <button
              onClick={() => router.push("/#juegos")}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 font-semibold text-white hover:bg-white/10"
            >
              Juegos
            </button>

            <button
              onClick={() => router.push("/tutoriales")}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 font-semibold text-white hover:bg-white/10"
            >
              Tutoriales
            </button>

            <button
              onClick={() => router.push("/perfil?tab=shop")}
              className="rounded-2xl border border-orange-500/25 bg-orange-500/10 px-5 py-2.5 font-bold text-orange-200 hover:bg-orange-500/20"
            >
              Tienda ✨
            </button>

            <button
              onClick={() => router.push("/crear")}
              className="rounded-2xl bg-orange-500 px-5 py-2.5 font-bold text-black hover:bg-orange-400"
            >
              + Crear sala
            </button>
          </nav>

          <div className="flex items-center gap-3">
            {playerIdentity && showProfileButton ? (
              <button
                onClick={() => router.push("/perfil")}
                className="hidden items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white hover:bg-white/10 md:flex"
              >
                <PlayerAvatar
                  avatar={selectedAvatar}
                  frame={selectedFrame}
                  size="sm"
                />
                <span>{playerIdentity.name}</span>
              </button>
            ) : (
              showLoginButton && (
                <button
                  onClick={() => router.push("/login")}
                  className="rounded-2xl bg-orange-500 px-5 py-2.5 font-bold text-black hover:bg-orange-400"
                >
                  Iniciar sesión
                </button>
              )
            )}

            <button
              onClick={() => setMenuOpen((value) => !value)}
              className="relative rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-lg text-white hover:bg-white/10"
              aria-label="Abrir menú"
            >
              ☰

              {totalNotifications > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-extrabold text-black">
                  {totalNotifications}
                </span>
              )}
            </button>
          </div>

          {menuOpen && (
            <div className="absolute right-6 top-20 z-50 w-72 rounded-3xl border border-white/10 bg-zinc-950 p-4 shadow-xl">
              <MenuButton label="🎲 Juegos" onClick={() => goTo("/#juegos")} />
              <MenuButton
                label="📘 Tutoriales"
                onClick={() => goTo("/tutoriales")}
              />
              <MenuButton label="+ Crear sala" onClick={() => goTo("/crear")} />

              <div className="my-2 border-t border-white/10" />

              <MenuButton label="👤 Perfil" onClick={() => goTo("/perfil")} />
              <MenuButton label="👥 Amigos" onClick={() => goTo("/amigos")} />
              <MenuButton label="🏆 Ranking" onClick={() => goTo("/ranking")} />
              <MenuButton
                label="🛒 Tienda"
                onClick={() => goTo("/perfil?tab=shop")}
              />

              <button
                onClick={() => {
                  setSettingsOpen(true);
                  setMenuOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-white hover:bg-white/10"
              >
                <span>⚙️ Ajustes</span>
              </button>

              {onSignOut && (
                <>
                  <div className="my-2 border-t border-white/10" />

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onSignOut();
                    }}
                    disabled={signingOut}
                    className="w-full rounded-xl px-4 py-3 text-left font-bold text-orange-300 hover:bg-orange-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {signingOut ? "Saliendo..." : "🚪 Cerrar sesión"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}

function MenuButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl px-4 py-3 text-left text-white hover:bg-white/10"
    >
      {label}
    </button>
  );
}