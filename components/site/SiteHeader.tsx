// 📍 Ruta del archivo: components/site/SiteHeader.tsx

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import PlayerAvatar from "@/components/PlayerAvatar";
import SettingsModal from "@/components/settings/SettingsModal";
import DailyRewardModal from "@/components/rewards/DailyRewardModal";
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

const DAILY_REWARDS = [10, 15, 20, 25, 30, 35, 50];

function isSameDay(dateA: Date, dateB: Date) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

function isYesterday(date: Date) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(date, yesterday);
}

export default function SiteHeader({
  playerIdentity = null,
  onSignOut,
  signingOut = false,
  showHomeButton = false,
  showProfileButton = false,
  showLoginButton = false,
}: SiteHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);

  const [pendingRoomInvites, setPendingRoomInvites] = useState(0);
  const [pendingFriendRequests, setPendingFriendRequests] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [rewardOpen, setRewardOpen] = useState(false);
  const [rewardAvailable, setRewardAvailable] = useState(false);
  const [dailyStreak, setDailyStreak] = useState(0);
  const [claimingReward, setClaimingReward] = useState(false);
  const [rewardMessage, setRewardMessage] = useState<string | null>(null);

  const selectedAvatar = getAvatarByKey(playerIdentity?.avatar_key);
  const selectedFrame = getFrameByKey(playerIdentity?.frame_key);

  const canUseDailyReward =
    !!playerIdentity?.user_id && !playerIdentity?.is_guest;

  const totalNotifications =
    pendingRoomInvites +
    pendingFriendRequests +
    (canUseDailyReward && rewardAvailable ? 1 : 0);

  const getAccessPath = () => {
    const nextPath = pathname && pathname !== "/acceso" ? pathname : "/";
    return `/acceso?next=${encodeURIComponent(nextPath)}`;
  };

  const handleLoginClick = () => {
    router.push(getAccessPath());
    setMenuOpen(false);
  };

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

  const loadDailyReward = useCallback(async () => {
    setRewardAvailable(false);
    setDailyStreak(0);
    setRewardMessage(null);

    if (!canUseDailyReward || !playerIdentity?.user_id) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("last_daily_claim, daily_streak")
      .eq("id", playerIdentity.user_id)
      .single();

    if (error || !data) return;

    setDailyStreak(data.daily_streak ?? 0);

    if (!data.last_daily_claim) {
      setRewardAvailable(true);
      return;
    }

    const lastClaim = new Date(data.last_daily_claim);
    setRewardAvailable(!isSameDay(lastClaim, new Date()));
  }, [supabase, canUseDailyReward, playerIdentity?.user_id]);

  useEffect(() => {
    void loadSocialNotifications();
    void loadDailyReward();
  }, [loadSocialNotifications, loadDailyReward]);

    const updatePresence = useCallback(async () => {
  if (!playerIdentity?.user_id || playerIdentity.is_guest) return;

  await supabase
    .from("profiles")
    .update({
      last_seen_at: new Date().toISOString(),
    })
    .eq("id", playerIdentity.user_id);
}, [supabase, playerIdentity?.user_id, playerIdentity?.is_guest]);

  useEffect(() => {
  if (!playerIdentity?.user_id || playerIdentity.is_guest) return;

  void updatePresence();

  const interval = window.setInterval(() => {
    void updatePresence();
  }, 60_000);

  return () => {
    window.clearInterval(interval);
  };
}, [playerIdentity?.user_id, playerIdentity?.is_guest, updatePresence]);

  const handleClaimReward = async () => {
    if (!canUseDailyReward || !playerIdentity?.user_id) {
      handleLoginClick();
      return;
    }

    try {
      setClaimingReward(true);
      setRewardMessage(null);

      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user?.id) {
        throw authError ?? new Error("No hay sesión activa.");
      }

      const userId = authData.user.id;

      const { data, error } = await supabase
        .from("profiles")
        .select("points, daily_streak, last_daily_claim")
        .eq("id", userId)
        .single();

      if (error || !data) throw error;

      if (data.last_daily_claim) {
        const lastClaim = new Date(data.last_daily_claim);

        if (isSameDay(lastClaim, new Date())) {
          setRewardAvailable(false);
          setRewardMessage("Ya reclamaste tu recompensa de hoy.");
          return;
        }
      }

      const currentStreak = data.daily_streak ?? 0;

      const nextStreak =
        data.last_daily_claim && isYesterday(new Date(data.last_daily_claim))
          ? currentStreak + 1
          : 1;

      const rewardPoints =
        DAILY_REWARDS[(nextStreak - 1) % DAILY_REWARDS.length];

      const newPoints = (data.points ?? 0) + rewardPoints;

      const { data: updatedProfile, error: updateError } = await supabase
        .from("profiles")
        .update({
          points: newPoints,
          daily_streak: nextStreak,
          last_daily_claim: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
        .select("points, daily_streak, last_daily_claim")
        .single();

      if (updateError || !updatedProfile) throw updateError;

      setDailyStreak(updatedProfile.daily_streak ?? nextStreak);
      setRewardAvailable(false);
      setRewardMessage(
        `🔥 Reclamaste ${rewardPoints} puntos. Ahora tienes ${updatedProfile.points ?? newPoints} pts.`,
      );

      router.refresh();
    } catch (error) {
      console.error("Error reclamando recompensa diaria:", error);
      setRewardAvailable(true);
      setRewardMessage(
        "No se pudo reclamar la recompensa. Revisa permisos o intenta de nuevo.",
      );
    } finally {
      setClaimingReward(false);
    }
  };

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
              onClick={() => router.push("/tienda")}
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

          <div className="flex items-center gap-2 md:gap-3">
  <button
    onClick={() => router.push("/crear")}
    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-500/25 bg-orange-500/10 text-xl font-black text-orange-200 shadow-[0_0_14px_rgba(249,115,22,0.16)] transition hover:bg-orange-500/20 md:hidden"
    aria-label="Crear sala"
  >
    +
  </button>

  {playerIdentity && showProfileButton ? (
    <button
      onClick={() => router.push("/perfil")}
      className="flex h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-2.5 text-white shadow-[0_0_14px_rgba(249,115,22,0.10)] transition hover:border-orange-500/30 hover:bg-orange-500/10 md:px-4"
      aria-label="Ir al perfil"
    >
      <PlayerAvatar
        avatar={selectedAvatar}
        frame={selectedFrame}
        size="sm"
      />

      <span className="hidden max-w-[130px] truncate font-semibold md:inline">
        {playerIdentity.name}
      </span>
    </button>
  ) : (
    showLoginButton && (
      <button
        onClick={handleLoginClick}
        className="rounded-2xl border border-orange-500/30 bg-orange-500/10 px-4 py-2.5 font-black text-orange-200 shadow-[0_0_18px_rgba(249,115,22,0.16)] hover:bg-orange-500/20 md:px-5"
      >
        Cuenta
      </button>
    )
  )}

  <button
    onClick={() => setMenuOpen((value) => !value)}
    className={`relative flex h-11 w-11 items-center justify-center rounded-2xl border text-lg transition ${
      canUseDailyReward && rewardAvailable
        ? "border-orange-500 bg-orange-500/10 text-orange-300 shadow-[0_0_28px_rgba(249,115,22,0.55)]"
        : "border-orange-500/25 bg-white/5 text-white shadow-[0_0_14px_rgba(249,115,22,0.12)] hover:bg-orange-500/10 hover:text-orange-200"
    }`}
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
            <div className="absolute right-6 top-20 z-50 w-80 rounded-3xl border border-orange-500/20 bg-zinc-950/95 p-4 shadow-[0_0_45px_rgba(249,115,22,0.14)] backdrop-blur-xl">
              <button
                type="button"
                onClick={() => {
                  if (!canUseDailyReward) {
                    handleLoginClick();
                    return;
                  }

                  setRewardOpen(true);
                  setMenuOpen(false);
                }}
                className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border px-4 py-3 text-left transition ${
                  canUseDailyReward && rewardAvailable
                    ? "border-orange-500/40 bg-orange-500/10 shadow-[0_0_24px_rgba(249,115,22,0.22)]"
                    : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                }`}
              >
                {canUseDailyReward && rewardAvailable && (
                  <span className="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.13),transparent)] animate-[shine_2.8s_linear_infinite]" />
                )}

                <span
                  className={`relative flex h-11 w-11 items-center justify-center rounded-xl text-2xl ${
                    canUseDailyReward && rewardAvailable
                      ? "animate-bounce bg-orange-500/15 shadow-[0_0_20px_rgba(249,115,22,0.35)]"
                      : "bg-white/5"
                  }`}
                >
                  🎁
                </span>

                <span className="relative flex-1">
                  <span className="block font-black text-white">
                    Recompensa diaria
                  </span>
                  <span
                    className={`mt-0.5 block text-xs font-bold ${
                      !canUseDailyReward
                        ? "text-white/45"
                        : rewardAvailable
                          ? "text-orange-200"
                          : "text-white/45"
                    }`}
                  >
                    {!canUseDailyReward
                      ? "Inicia sesión para reclamar"
                      : rewardAvailable
                        ? "Disponible ahora"
                        : "Ya reclamada hoy"}
                  </span>
                </span>

                {canUseDailyReward && rewardAvailable && (
                  <span className="relative rounded-full bg-orange-500 px-3 py-1 text-xs font-black text-black">
                    GRATIS
                  </span>
                )}
              </button>

              <div className="my-3 border-t border-white/10" />

              <MenuButton label="📘 Tutoriales" onClick={() => goTo("/tutoriales")} />
              <MenuButton label="+ Crear sala" onClick={() => goTo("/crear")} />

              <div className="my-3 border-t border-white/10" />

              {playerIdentity ? (
                <>
                  <MenuButton label="👤 Perfil" onClick={() => goTo("/perfil")} />
                  <MenuButton label="👥 Amigos" onClick={() => goTo("/amigos")} />
                </>
              ) : (
                <MenuButton label="🔐 Cuenta" onClick={handleLoginClick} />
              )}

              <MenuButton label="🏆 Ranking" onClick={() => goTo("/ranking")} />
              <MenuButton label="🛒 Tienda" onClick={() => goTo("/tienda")} />

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
                  <div className="my-3 border-t border-white/10" />

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

      <DailyRewardModal
        open={rewardOpen}
        onClose={() => setRewardOpen(false)}
        streak={dailyStreak}
        available={rewardAvailable}
        claiming={claimingReward}
        claimedMessage={rewardMessage}
        onClaim={handleClaimReward}
      />

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <style jsx global>{`
        @keyframes shine {
          0% {
            transform: translateX(-150%);
          }

          100% {
            transform: translateX(250%);
          }
        }
      `}</style>
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