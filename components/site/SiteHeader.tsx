// 📍 Ruta del archivo: components/site/SiteHeader.tsx

"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, Gift } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import type { PlayerIdentity } from "@/lib/profile/getPlayerIdentity";

import DailyRewardModal from "@/components/rewards/DailyRewardModal";

type Props = {
  playerIdentity?: PlayerIdentity | null;
  onSignOut?: () => Promise<void> | void;
  signingOut?: boolean;
  showHomeButton?: boolean;
  showProfileButton?: boolean;
  showLoginButton?: boolean;
};

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

const DAILY_REWARDS = [10, 15, 20, 25, 30, 35, 50];

export default function SiteHeader({
  playerIdentity,
  onSignOut,
  signingOut,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [menuOpen, setMenuOpen] = useState(false);

  const [rewardOpen, setRewardOpen] = useState(false);
  const [rewardAvailable, setRewardAvailable] =
    useState(false);

  const [dailyStreak, setDailyStreak] = useState(0);

  const [claimingReward, setClaimingReward] =
    useState(false);

  const [rewardMessage, setRewardMessage] =
    useState<string | null>(null);

  const displayName =
    playerIdentity?.display_name ??
    playerIdentity?.username ??
    "Invitado";

  const avatarUrl =
    playerIdentity?.avatar_url ??
    "/avatars/demonio.png";

  useEffect(() => {
    async function loadDailyReward() {
      if (!playerIdentity?.user_id) return;

      const { data } = await supabase
        .from("profiles")
        .select("last_daily_claim, daily_streak")
        .eq("id", playerIdentity.user_id)
        .single();

      if (!data) return;

      const streak = data.daily_streak ?? 0;

      setDailyStreak(streak);

      if (!data.last_daily_claim) {
        setRewardAvailable(true);
        return;
      }

      const claimDate = new Date(data.last_daily_claim);

      if (!isSameDay(claimDate, new Date())) {
        setRewardAvailable(true);
      }
    }

    void loadDailyReward();
  }, [playerIdentity, supabase]);

  const rewardDayIndex = useMemo(() => {
    return dailyStreak % 7;
  }, [dailyStreak]);

  async function handleClaimReward() {
    if (!playerIdentity?.user_id) return;

    try {
      setClaimingReward(true);
      setRewardMessage(null);

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "points, daily_streak, last_daily_claim",
        )
        .eq("id", playerIdentity.user_id)
        .single();

      if (error || !data) {
        throw error;
      }

      const currentStreak = data.daily_streak ?? 0;

      let nextStreak = currentStreak + 1;

      if (data.last_daily_claim) {
        const lastClaim = new Date(
          data.last_daily_claim,
        );

        if (!isYesterday(lastClaim)) {
          nextStreak = 1;
        }
      }

      const rewardIndex = (nextStreak - 1) % 7;

      const rewardPoints =
        DAILY_REWARDS[rewardIndex];

      const newPoints =
        (data.points ?? 0) + rewardPoints;

      const { error: updateError } =
        await supabase
          .from("profiles")
          .update({
            points: newPoints,
            daily_streak: nextStreak,
            last_daily_claim:
              new Date().toISOString(),
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", playerIdentity.user_id);

      if (updateError) {
        throw updateError;
      }

      setDailyStreak(nextStreak);
      setRewardAvailable(false);

      setRewardMessage(
        `🔥 Reclamaste ${rewardPoints} puntos.`
      );
    } catch (error) {
      console.error(
        "Error reclamando recompensa:",
        error,
      );

      setRewardMessage(
        "No se pudo reclamar la recompensa.",
      );
    } finally {
      setClaimingReward(false);
    }
  }

  const goTo = (path: string) => {
    router.push(path);
    setMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-orange-500/10 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-3"
            >
              <img
                src="/branding/logo-horizontal.png"
                alt="La Mesa Familiar"
                className="h-11 object-contain"
              />
            </Link>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/"
              className={`rounded-2xl px-4 py-2 text-sm font-black transition ${
                pathname === "/"
                  ? "bg-white/10 text-white"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              Inicio
            </Link>

            <Link
              href="/tutoriales"
              className={`rounded-2xl px-4 py-2 text-sm font-black transition ${
                pathname === "/tutoriales"
                  ? "bg-white/10 text-white"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              Tutoriales
            </Link>

            <Link
              href="/tienda"
              className={`rounded-2xl px-4 py-2 text-sm font-black transition ${
                pathname === "/tienda"
                  ? "bg-orange-500 text-black"
                  : "text-orange-300 hover:bg-orange-500/10"
              }`}
            >
              Tienda ✨
            </Link>

            <Link
              href="/crear"
              className="rounded-2xl bg-orange-500 px-5 py-2 text-sm font-black text-black transition hover:bg-orange-400"
            >
              + Crear sala
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {playerIdentity && (
              <button
                type="button"
                onClick={() => goTo("/perfil")}
                className="hidden items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 transition hover:bg-white/[0.06] md:flex"
              >
                <div className="relative">
                  <div className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-orange-500">
  <img
    src={avatarUrl}
    alt={displayName}
    className="h-full w-full object-cover"
  />
</div>

                  {rewardAvailable && (
                    <div className="absolute -right-1 -top-1 flex h-5 min-w-[20px] animate-pulse items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-black text-black shadow-[0_0_18px_rgba(249,115,22,0.7)]">
                      1
                    </div>
                  )}
                </div>

                <div className="text-left">
                  <p className="text-sm font-black text-white">
                    {displayName}
                  </p>

                  <p className="text-[11px] text-white/45">
                    La Mesa Familiar
                  </p>
                </div>
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                setMenuOpen((prev) => !prev)
              }
              className={`relative flex h-12 w-12 items-center justify-center rounded-2xl border transition ${
                rewardAvailable
                  ? "border-orange-500 bg-orange-500/10 text-orange-300 shadow-[0_0_22px_rgba(249,115,22,0.35)]"
                  : "border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.08]"
              }`}
            >
              {rewardAvailable && (
                <>
                  <div className="absolute inset-0 animate-pulse rounded-2xl bg-orange-500/10" />

                  <div className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-black text-black">
                    !
                  </div>
                </>
              )}

              {menuOpen ? (
                <X className="relative z-10 h-5 w-5" />
              ) : (
                <Menu className="relative z-10 h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="absolute right-4 top-[88px] z-50 w-[320px] overflow-hidden rounded-[32px] border border-orange-500/20 bg-zinc-950/98 shadow-[0_0_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.16),transparent_35%)]" />

            <div className="relative p-5">
              <button
                type="button"
                onClick={() => {
                  setRewardOpen(true);
                  setMenuOpen(false);
                }}
                className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border px-4 py-3 text-left transition ${
                  rewardAvailable
                    ? "border-orange-500/30 bg-orange-500/10 shadow-[0_0_25px_rgba(249,115,22,0.18)]"
                    : "border-white/10 bg-white/[0.03]"
                }`}
              >
                {rewardAvailable && (
                  <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.12),transparent)] animate-[shine_2.8s_linear_infinite]" />
                )}

                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl text-2xl ${
                    rewardAvailable
                      ? "bg-orange-500/20 shadow-[0_0_25px_rgba(249,115,22,0.35)]"
                      : "bg-white/5"
                  }`}
                >
                  <Gift
                    className={`h-7 w-7 ${
                      rewardAvailable
                        ? "animate-bounce text-orange-300"
                        : "text-white"
                    }`}
                  />
                </div>

                <div className="flex-1">
                  <p className="text-lg font-black text-white">
                    Recompensa diaria
                  </p>

                  <p
                    className={`mt-1 text-sm ${
                      rewardAvailable
                        ? "text-orange-200"
                        : "text-white/45"
                    }`}
                  >
                    {rewardAvailable
                      ? "🔥 Disponible ahora"
                      : "Ya reclamada hoy"}
                  </p>
                </div>

                {rewardAvailable && (
                  <div className="rounded-full border border-orange-500/25 bg-orange-500 px-3 py-1 text-xs font-black text-black">
                    GRATIS
                  </div>
                )}
              </button>

              <div className="my-5 h-px bg-white/10" />

              <div className="space-y-2">
                <button
                  onClick={() => goTo("/tutoriales")}
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-bold text-white/80 transition hover:bg-white/[0.06] hover:text-white"
                >
                  📘 Tutoriales
                </button>

                <button
                  onClick={() => goTo("/crear")}
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-bold text-white/80 transition hover:bg-white/[0.06] hover:text-white"
                >
                  ➕ Crear sala
                </button>
              </div>

              <div className="my-5 h-px bg-white/10" />

              <div className="space-y-2">
                <button
                  onClick={() => goTo("/perfil")}
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-bold text-white/80 transition hover:bg-white/[0.06] hover:text-white"
                >
                  👤 Perfil
                </button>

                <button
                  onClick={() => goTo("/ranking")}
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-bold text-white/80 transition hover:bg-white/[0.06] hover:text-white"
                >
                  🏆 Ranking
                </button>

                <button
                  onClick={() => goTo("/tienda")}
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-bold text-white/80 transition hover:bg-white/[0.06] hover:text-white"
                >
                  🛒 Tienda
                </button>

                <button
                  onClick={() => goTo("/ajustes")}
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-bold text-white/80 transition hover:bg-white/[0.06] hover:text-white"
                >
                  ⚙️ Ajustes
                </button>
              </div>

              {playerIdentity && onSignOut && (
                <>
                  <div className="my-5 h-px bg-white/10" />

                  <button
                    type="button"
                    disabled={signingOut}
                    onClick={() => {
                      setMenuOpen(false);
                      void onSignOut();
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-black text-orange-300 transition hover:bg-orange-500/10"
                  >
                    🚪{" "}
                    {signingOut
                      ? "Cerrando..."
                      : "Cerrar sesión"}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
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