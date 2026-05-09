// 📍 Ruta: app/perfil/page.tsx

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getPlayerIdentity, type PlayerIdentity } from "@/lib/profile/getPlayerIdentity";
import { AVATARS, FRAMES } from "@/lib/profile/profileCosmetics";
import { getProfileLevelInfo } from "@/lib/profile/profileLevel";

const BASIC_AVATARS = AVATARS.filter((avatar) => avatar.tier === "basic");
const PREMIUM_AVATARS = AVATARS.filter((avatar) => avatar.tier !== "basic");
const BASIC_FRAMES = FRAMES.filter((frame) => frame.tier === "basic");
const PREMIUM_FRAMES = FRAMES.filter((frame) => frame.tier !== "basic");

const DEFAULT_OWNED_AVATARS = [
  "avatar_sun",
  "avatar_moon",
  "avatar_star",
  "avatar_rocket",
  "avatar_game",
  "avatar_guest",
];

const DEFAULT_OWNED_FRAMES = [
  "frame_orange",
  "frame_emerald",
  "frame_blue",
  "frame_purple",
  "frame_gold",
  "frame_guest",
];

type ProfileTab = "summary" | "customization" | "stats" | "collection";
type CosmeticFilter = "unlocked" | "locked" | "all";
type CosmeticItem = (typeof AVATARS)[number] | (typeof FRAMES)[number];

type ProfileStats = {
  games_played: number;
  games_won: number;
  games_lost: number;
  total_points_earned: number;
  current_win_streak: number;
  best_win_streak: number;
};

const DEFAULT_STATS: ProfileStats = {
  games_played: 0,
  games_won: 0,
  games_lost: 0,
  total_points_earned: 0,
  current_win_streak: 0,
  best_win_streak: 0,
};

function groupByGroup<T extends { group: string }>(items: T[]) {
  return items.reduce(
    (acc, item) => {
      if (!acc[item.group]) acc[item.group] = [];
      acc[item.group].push(item);
      return acc;
    },
    {} as Record<string, T[]>
  );
}

function getTierLabel(tier: string) {
  if (tier === "legendary") return "Legendario";
  if (tier === "collection") return "Colección";
  return "Básico";
}

function getTierBadgeClass(tier: string) {
  if (tier === "legendary") return "border-yellow-400/30 bg-yellow-500/10 text-yellow-200";
  if (tier === "collection") return "border-cyan-400/25 bg-cyan-500/10 text-cyan-200";
  return "border-white/10 bg-white/[0.04] text-white/60";
}

function getPlayerRankLabel(gamesPlayed: number) {
  if (gamesPlayed >= 100) return "Leyenda familiar";
  if (gamesPlayed >= 50) return "Veterano de la mesa";
  if (gamesPlayed >= 25) return "Jugador activo";
  if (gamesPlayed >= 10) return "En crecimiento";
  return "Nuevo jugador";
}

function getWinRateMessage(winRate: number) {
  if (winRate >= 70) return "Dominio fuerte";
  if (winRate >= 55) return "Muy buen ritmo";
  if (winRate >= 45) return "Competencia pareja";
  if (winRate > 0) return "A seguir subiendo";
  return "Sin historial todavía";
}

function getPerformanceGrade(winRate: number, gamesPlayed: number) {
  if (gamesPlayed <= 0) return { grade: "N/A", label: "Sin historial", helper: "Juega tus primeras partidas para activar tu rango." };
  if (winRate >= 75) return { grade: "S+", label: "Dominante", helper: "Rendimiento elite en la mesa." };
  if (winRate >= 65) return { grade: "S", label: "Muy fuerte", helper: "Tu perfil ya impone respeto." };
  if (winRate >= 55) return { grade: "A", label: "Competitivo", helper: "Buen balance entre constancia y victorias." };
  if (winRate >= 45) return { grade: "B", label: "Parejo", helper: "Estás cerca de romper la línea positiva." };
  return { grade: "C", label: "En progreso", helper: "Cada partida suma experiencia para subir." };
}

function getNextMilestone(gamesPlayed: number) {
  if (gamesPlayed < 10) return { target: 10, label: "Primeras 10 partidas", icon: "🎯" };
  if (gamesPlayed < 25) return { target: 25, label: "Jugador activo", icon: "🔥" };
  if (gamesPlayed < 50) return { target: 50, label: "Veterano de la mesa", icon: "🥇" };
  if (gamesPlayed < 100) return { target: 100, label: "Leyenda familiar", icon: "🏆" };
  return { target: gamesPlayed, label: "Meta legendaria alcanzada", icon: "👑" };
}

function getCollectionRank(percent: number) {
  if (percent >= 100) return "Coleccionista legendario";
  if (percent >= 75) return "Colección premium fuerte";
  if (percent >= 50) return "Muy buen avance";
  if (percent > 0) return "Colección en crecimiento";
  return "Empieza en la tienda";
}

function getComboTip(avatarKey: string, frameKey: string) {
  if (avatarKey === "avatar_demonio" && frameKey !== "marco_infernal") {
    return "Tip: Demonio combina brutal con Marco Infernal 🔥";
  }

  if (avatarKey === "avatar_angel" && frameKey !== "marco_divino") {
    return "Tip: Ángel se ve premium con Marco Divino ✨";
  }

  if (avatarKey === "avatar_gato_naranja" && frameKey !== "marco_gato") {
    return "Tip: Chopper combina perfecto con Marco Felino 🐾";
  }

  if (avatarKey === "avatar_pug" && frameKey !== "marco_perro") {
    return "Tip: Nala combina perfecto con Marco Canino 🐶";
  }

  return "Tu estilo actual ya está listo para presumirse en la mesa.";
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function ProfileAvatarPreview({
  avatar,
  frame,
  size = "lg",
  level,
}: {
  avatar: (typeof AVATARS)[number];
  frame: (typeof FRAMES)[number];
  size?: "sm" | "md" | "lg";
  level?: number;
}) {
  const sizeClass =
    size === "sm" ? "h-16 w-16" : size === "md" ? "h-24 w-24" : "h-36 w-36 sm:h-44 sm:w-44";
  const avatarSizeClass =
    size === "sm" ? "h-10 w-10 text-3xl" : size === "md" ? "h-16 w-16 text-5xl" : "h-24 w-24 text-7xl sm:h-32 sm:w-32";

  return (
    <div className={`relative flex ${sizeClass} shrink-0 items-center justify-center rounded-full bg-black shadow-[0_0_55px_rgba(249,115,22,0.18)]`}>
      {frame.image ? (
        <img src={frame.image} alt={frame.label} className="absolute inset-0 h-full w-full object-contain" />
      ) : (
        <div className={`absolute inset-0 rounded-full border-4 ${frame.className ?? ""}`} />
      )}

      {avatar.image ? (
        <img src={avatar.image} alt={avatar.label} className={`relative z-10 ${avatarSizeClass} object-contain`} />
      ) : (
        <span className={`relative z-10 ${avatarSizeClass} flex items-center justify-center`}>{avatar.emoji ?? "🙂"}</span>
      )}

      {level !== undefined && size === "lg" && (
        <div className="absolute -bottom-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border border-yellow-400/40 bg-black px-3 py-1.5 text-xs font-black text-yellow-200 shadow-[0_0_25px_rgba(250,204,21,0.24)]">
          <span>LVL</span>
          <span>{level}</span>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, helper, tone = "neutral" }: { label: string; value: string | number; helper?: string; tone?: "neutral" | "orange" | "yellow" | "emerald" | "cyan" }) {
  const toneClass = {
    neutral: "border-white/10 bg-white/[0.035] text-white",
    orange: "border-orange-500/20 bg-orange-500/5 text-orange-100",
    yellow: "border-yellow-500/20 bg-yellow-500/5 text-yellow-100",
    emerald: "border-emerald-500/20 bg-emerald-500/5 text-emerald-100",
    cyan: "border-cyan-500/20 bg-cyan-500/5 text-cyan-100",
  }[tone];

  return (
    <div className={`rounded-3xl border p-4 sm:p-5 ${toneClass}`}>
      <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-white/45">{label}</p>
      <p className="mt-2 text-2xl font-black sm:text-3xl">{value}</p>
      {helper && <p className="mt-1 text-xs font-medium text-white/50 sm:text-sm">{helper}</p>}
    </div>
  );
}

function ProgressBar({ value, className = "bg-orange-500" }: { value: number; className?: string }) {
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
      <div className={`h-full rounded-full transition-all ${className}`} style={{ width: `${clampPercent(value)}%` }} />
    </div>
  );
}

function InsightCard({ icon, label, value, helper }: { icon: string; label: string; value: string | number; helper: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-500/10 text-xl shadow-[0_0_24px_rgba(249,115,22,0.12)]">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-white/40">{label}</p>
          <p className="mt-1 truncate text-lg font-black text-white">{value}</p>
          <p className="mt-1 text-xs leading-relaxed text-white/45">{helper}</p>
        </div>
      </div>
    </div>
  );
}

function VisualMeter({ label, value, helper, tone = "orange" }: { label: string; value: number; helper: string; tone?: "orange" | "emerald" | "cyan" | "violet" | "yellow" }) {
  const barClass = {
    orange: "bg-orange-400",
    emerald: "bg-emerald-400",
    cyan: "bg-cyan-400",
    violet: "bg-violet-400",
    yellow: "bg-yellow-400",
  }[tone];

  return (
    <div className="rounded-3xl border border-white/10 bg-black/25 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black text-white/80">{label}</p>
        <p className="text-sm font-black text-white/55">{clampPercent(value)}%</p>
      </div>
      <div className="mt-3">
        <ProgressBar value={value} className={barClass} />
      </div>
      <p className="mt-2 text-xs font-medium text-white/40">{helper}</p>
    </div>
  );
}

function EmptyFutureCard({ title, description, icon = "✨" }: { title: string; description: string; icon?: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.025] p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/[0.04] text-xl">{icon}</div>
        <div>
          <p className="font-black text-white/75">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-white/45">{description}</p>
        </div>
      </div>
    </div>
  );
}

export default function PerfilPage() {
  const supabase = createClient();

  const [playerIdentity, setPlayerIdentity] = useState<PlayerIdentity | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [avatarKey, setAvatarKey] = useState("avatar_sun");
  const [frameKey, setFrameKey] = useState("frame_orange");

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [activeTab, setActiveTab] = useState<ProfileTab>("summary");
  const [collectionFilter, setCollectionFilter] = useState<CosmeticFilter>("unlocked");

  const [stats, setStats] = useState<ProfileStats>(DEFAULT_STATS);
  const [points, setPoints] = useState(0);
  const [ownedAvatars, setOwnedAvatars] = useState<string[]>(DEFAULT_OWNED_AVATARS);
  const [ownedFrames, setOwnedFrames] = useState<string[]>(DEFAULT_OWNED_FRAMES);

  const loadProfileData = async () => {
    const identity = await getPlayerIdentity();
    setPlayerIdentity(identity);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    setEmail(user?.email ?? "");

    if (!identity) return;

    setDisplayName(identity.name);
    setAvatarKey(identity.avatar_key ?? "avatar_sun");
    setFrameKey(identity.frame_key ?? "frame_orange");
    setPoints(identity.points ?? 0);

    if (!identity.user_id) return;

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select(
        "games_played, games_won, games_lost, total_points_earned, current_win_streak, best_win_streak, points, owned_avatars, owned_frames"
      )
      .eq("id", identity.user_id)
      .single();

    if (profileError) {
      console.error("Error cargando datos del perfil:", profileError);
      return;
    }

    if (!profileData) return;

    setStats({
      games_played: profileData.games_played ?? 0,
      games_won: profileData.games_won ?? 0,
      games_lost: profileData.games_lost ?? 0,
      total_points_earned: profileData.total_points_earned ?? 0,
      current_win_streak: profileData.current_win_streak ?? 0,
      best_win_streak: profileData.best_win_streak ?? 0,
    });

    setPoints(profileData.points ?? 0);
    setOwnedAvatars(Array.from(new Set([...DEFAULT_OWNED_AVATARS, ...(profileData.owned_avatars ?? [])])));
    setOwnedFrames(Array.from(new Set([...DEFAULT_OWNED_FRAMES, ...(profileData.owned_frames ?? [])])));
  };

  useEffect(() => {
    const load = async () => {
      await loadProfileData();
      setLoading(false);
    };

    void load();
  }, []);

  const selectedAvatar = useMemo(() => AVATARS.find((avatar) => avatar.key === avatarKey) ?? AVATARS[0], [avatarKey]);
  const selectedFrame = useMemo(() => FRAMES.find((frame) => frame.key === frameKey) ?? FRAMES[0], [frameKey]);

  const ownedAvatarItems = useMemo(() => AVATARS.filter((avatar) => ownedAvatars.includes(avatar.key)), [ownedAvatars]);
  const ownedFrameItems = useMemo(() => FRAMES.filter((frame) => ownedFrames.includes(frame.key)), [ownedFrames]);

  const lockedAvatarItems = useMemo(() => PREMIUM_AVATARS.filter((avatar) => !ownedAvatars.includes(avatar.key)), [ownedAvatars]);
  const lockedFrameItems = useMemo(() => PREMIUM_FRAMES.filter((frame) => !ownedFrames.includes(frame.key)), [ownedFrames]);

  const groupedOwnedAvatars = useMemo(() => groupByGroup(ownedAvatarItems), [ownedAvatarItems]);
  const groupedOwnedFrames = useMemo(() => groupByGroup(ownedFrameItems), [ownedFrameItems]);
  const groupedLockedAvatars = useMemo(() => groupByGroup(lockedAvatarItems), [lockedAvatarItems]);
  const groupedLockedFrames = useMemo(() => groupByGroup(lockedFrameItems), [lockedFrameItems]);

  const winRateNumber = stats.games_played > 0 ? (stats.games_won / stats.games_played) * 100 : 0;
  const winRate = winRateNumber.toFixed(1);
  const winDifference = stats.games_won - stats.games_lost;

  const ownedPremiumAvatarsCount = PREMIUM_AVATARS.filter((avatar) => ownedAvatars.includes(avatar.key)).length;
  const ownedPremiumFramesCount = PREMIUM_FRAMES.filter((frame) => ownedFrames.includes(frame.key)).length;
  const ownedPremiumTotal = ownedPremiumAvatarsCount + ownedPremiumFramesCount;
  const premiumTotal = PREMIUM_AVATARS.length + PREMIUM_FRAMES.length;
  const collectionPercent = premiumTotal > 0 ? clampPercent((ownedPremiumTotal / premiumTotal) * 100) : 0;
  const avatarCollectionPercent = PREMIUM_AVATARS.length > 0 ? clampPercent((ownedPremiumAvatarsCount / PREMIUM_AVATARS.length) * 100) : 0;
  const frameCollectionPercent = PREMIUM_FRAMES.length > 0 ? clampPercent((ownedPremiumFramesCount / PREMIUM_FRAMES.length) * 100) : 0;

  const levelInfo = getProfileLevelInfo(stats.total_points_earned);
  const playerRankLabel = getPlayerRankLabel(stats.games_played);
  const winRateMessage = getWinRateMessage(winRateNumber);
  const comboTip = getComboTip(selectedAvatar.key, selectedFrame.key);
  const performanceGrade = getPerformanceGrade(winRateNumber, stats.games_played);
  const nextMilestone = getNextMilestone(stats.games_played);
  const milestonePercent = nextMilestone.target > 0 ? clampPercent((stats.games_played / nextMilestone.target) * 100) : 100;
  const collectionRank = getCollectionRank(collectionPercent);

  const handleSaveProfile = async () => {
    setMessage("");
    setErrorMessage("");

    if (!playerIdentity?.user_id) {
      setErrorMessage("Solo los usuarios registrados pueden editar el perfil por ahora.");
      return;
    }

    const normalizedName = displayName.trim();

    if (!normalizedName) {
      setErrorMessage("Escribe un nombre visible.");
      return;
    }

    if (normalizedName.length < 2) {
      setErrorMessage("El nombre visible debe tener al menos 2 caracteres.");
      return;
    }

    try {
      setSaving(true);

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ display_name: normalizedName, avatar_key: avatarKey, frame_key: frameKey })
        .eq("id", playerIdentity.user_id);

      if (profileError) {
        setErrorMessage(profileError.message);
        return;
      }

      await supabase.auth.updateUser({ data: { display_name: normalizedName } });

      setMessage("Perfil actualizado correctamente.");
      await loadProfileData();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-white/10 bg-zinc-950/90 p-8 text-center shadow-[0_0_60px_rgba(249,115,22,0.08)]">
          <p className="text-2xl font-black sm:text-3xl">Cargando perfil...</p>
          <p className="mt-2 text-sm text-white/50">Preparando tu identidad gamer.</p>
        </div>
      </main>
    );
  }

  const tabs: { key: ProfileTab; label: string; icon: string }[] = [
    { key: "summary", label: "Resumen", icon: "🏠" },
    { key: "customization", label: "Personalización", icon: "🎨" },
    { key: "stats", label: "Estadísticas", icon: "📊" },
    { key: "collection", label: "Colección", icon: "💎" },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-black px-4 py-6 text-white sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-col gap-3 sm:mb-7 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="inline-flex w-fit rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-black text-white/80 transition hover:border-orange-500/30 hover:bg-orange-500/10 hover:text-orange-100">
            ← Volver
          </Link>

          <Link href="/tienda" className="inline-flex w-full items-center justify-center rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-black shadow-[0_0_35px_rgba(249,115,22,0.22)] transition hover:bg-orange-400 sm:w-fit">
            Ir a tienda ✨
          </Link>
        </div>

        <section className="relative overflow-hidden rounded-[2rem] border border-orange-500/20 bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.18),transparent_34%),linear-gradient(135deg,rgba(24,24,27,0.98),rgba(0,0,0,0.96))] p-5 shadow-[0_0_70px_rgba(249,115,22,0.10)] sm:p-7 lg:p-8">
          <div className="absolute right-[-80px] top-[-80px] h-56 w-56 rounded-full bg-orange-500/10 blur-3xl" />
          <div className="absolute bottom-[-100px] left-[-100px] h-64 w-64 rounded-full bg-yellow-500/5 blur-3xl" />

          <div className="relative grid gap-6 lg:grid-cols-[auto_1fr_auto] lg:items-center">
            <div className="flex justify-center lg:justify-start">
              <ProfileAvatarPreview avatar={selectedAvatar} frame={selectedFrame} level={levelInfo.level} />
            </div>

            <div className="min-w-0 text-center lg:text-left">
              <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-orange-200">
                  {playerIdentity?.is_guest ? "Invitado" : "Usuario registrado"}
                </span>
                <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-200">
                  En línea
                </span>
              </div>

              <h1 className="mt-4 truncate text-3xl font-black tracking-tight sm:text-5xl">{displayName || "Jugador"}</h1>
              <p className="mt-2 break-all text-sm font-medium text-white/50 sm:text-base">{email || "Perfil local / invitado"}</p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <StatCard label="Nivel" value={levelInfo.level} helper={levelInfo.title} tone="yellow" />
                <StatCard label="Puntos" value={points} helper="Disponibles" tone="orange" />
                <StatCard label="WR" value={`${winRate}%`} helper={winRateMessage} tone="emerald" />
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <InsightCard icon="⚡" label="Rango" value={performanceGrade.grade} helper={performanceGrade.label} />
                <InsightCard icon={nextMilestone.icon} label="Siguiente meta" value={nextMilestone.label} helper={`${stats.games_played}/${nextMilestone.target} partidas`} />
                <InsightCard icon="💎" label="Colección" value={`${collectionPercent}%`} helper={collectionRank} />
              </div>
            </div>

            <div className="rounded-3xl border border-yellow-500/20 bg-black/35 p-4 lg:min-w-64">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-500/10 text-3xl shadow-[0_0_25px_rgba(250,204,21,0.18)]">
                  {levelInfo.emblem}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-300">Progreso XP</p>
                  <p className="mt-1 text-lg font-black text-yellow-50">{levelInfo.progressPercent}%</p>
                </div>
              </div>

              <div className="mt-4">
                <ProgressBar value={levelInfo.progressPercent} className="bg-gradient-to-r from-yellow-400 to-orange-400" />
                <div className="mt-2 flex justify-between text-[0.7rem] font-bold text-white/40">
                  <span>{levelInfo.currentLevelXp} XP</span>
                  <span>{levelInfo.isMaxLevel ? `${levelInfo.currentXp} XP` : `${levelInfo.nextLevelXp} XP`}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <nav className="sticky top-0 z-20 -mx-4 mt-5 border-y border-white/10 bg-black/85 px-4 py-3 backdrop-blur-xl sm:static sm:mx-0 sm:rounded-[1.7rem] sm:border sm:bg-zinc-950/80">
          <div className="flex snap-x gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-4 sm:overflow-visible sm:pb-0">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`min-w-[9.5rem] snap-start rounded-2xl border px-3 py-3 text-sm font-black transition sm:min-w-0 sm:text-base ${
                  activeTab === tab.key
                    ? "border-orange-500/40 bg-orange-500/15 text-orange-100 shadow-[0_0_25px_rgba(249,115,22,0.12)]"
                    : "border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                <span className="mr-1.5">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        <section className="mt-5">
          {activeTab === "summary" && (
            <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[2rem] border border-white/10 bg-zinc-950/90 p-5 shadow-[0_0_45px_rgba(249,115,22,0.04)] sm:p-7">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-300">Resumen del jugador</p>
                <h2 className="mt-3 text-3xl font-black">Identidad de la mesa</h2>
                <p className="mt-2 text-sm leading-relaxed text-white/55 sm:text-base">
                  Tu carta principal: nivel, rendimiento, puntos y estilo equipado en una vista más limpia.
                </p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <StatCard label="Partidas" value={stats.games_played} helper="Jugadas en total" />
                  <StatCard label="Victorias" value={stats.games_won} helper={`${stats.games_lost} derrotas`} tone="emerald" />
                  <StatCard label="Mejor racha" value={stats.best_win_streak} helper={`Actual: ${stats.current_win_streak}`} tone="yellow" />
                  <StatCard label="Puntos ganados" value={stats.total_points_earned} helper="XP histórico" tone="orange" />
                </div>

                <div className="mt-5 rounded-3xl border border-orange-500/15 bg-orange-500/5 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">Win Rate</p>
                      <p className="mt-2 text-4xl font-black text-orange-100">{winRate}%</p>
                    </div>
                    <span className="rounded-full border border-orange-500/25 bg-black/30 px-4 py-2 text-sm font-black text-orange-200">
                      {winDifference >= 0 ? `+${winDifference}` : winDifference} saldo
                    </span>
                  </div>
                  <div className="mt-4">
                    <ProgressBar value={winRateNumber} />
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-[2rem] border border-white/10 bg-zinc-950/90 p-5 sm:p-7">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-white/45">Cosméticos equipados</p>
                  <div className="mt-5 flex items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                    <ProfileAvatarPreview avatar={selectedAvatar} frame={selectedFrame} size="md" />
                    <div className="min-w-0">
                      <p className="truncate text-xl font-black">{selectedAvatar.label}</p>
                      <p className="truncate text-sm font-bold text-white/55">{selectedFrame.label}</p>
                      <p className="mt-2 text-xs leading-relaxed text-white/45">{comboTip}</p>
                    </div>
                  </div>

                  <button type="button" onClick={() => setActiveTab("customization")} className="mt-4 w-full rounded-2xl border border-orange-500/25 bg-orange-500/10 px-4 py-3 font-black text-orange-100 transition hover:bg-orange-500/20">
                    Editar estilo
                  </button>
                </div>

                <div className="rounded-[2rem] border border-cyan-500/15 bg-cyan-500/5 p-5 sm:p-7">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-300">Colección premium</p>
                      <p className="mt-2 text-3xl font-black">{ownedPremiumTotal}/{premiumTotal}</p>
                    </div>
                    <span className="rounded-full border border-cyan-500/25 bg-black/30 px-4 py-2 text-sm font-black text-cyan-200">{collectionPercent}%</span>
                  </div>
                  <div className="mt-4">
                    <ProgressBar value={collectionPercent} className="bg-cyan-400" />
                  </div>
                  <button type="button" onClick={() => setActiveTab("collection")} className="mt-4 w-full rounded-2xl border border-cyan-500/20 bg-black/25 px-4 py-3 font-black text-cyan-100 transition hover:bg-cyan-500/10">
                    Ver colección
                  </button>
                </div>

                <div className="rounded-[2rem] border border-white/10 bg-zinc-950/90 p-5 sm:p-7">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-white/45">Actividad social</p>
                  <div className="mt-4 space-y-3">
                    <EmptyFutureCard icon="🕹️" title="Última actividad" description="Espacio listo para mostrar última partida, juego reciente o estado social cuando conectemos historial." />
                    <EmptyFutureCard icon="👥" title="Conexión con amigos" description="Preparado para invitaciones directas, historial VS amigos y presencia social sin rediseñar el perfil después." />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "customization" && (
            <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
              <aside className="rounded-[2rem] border border-orange-500/15 bg-zinc-950/90 p-5 sm:p-7 lg:sticky lg:top-5 lg:h-fit">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-300">Vista previa</p>
                <div className="mt-5 flex flex-col items-center text-center">
                  <ProfileAvatarPreview avatar={selectedAvatar} frame={selectedFrame} />
                  <h2 className="mt-5 max-w-full truncate text-3xl font-black">{displayName || "Jugador"}</h2>
                  <p className="mt-1 text-sm font-bold text-white/45">{selectedAvatar.label} + {selectedFrame.label}</p>
                </div>

                <div className="mt-6">
                  <label className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-white/50">Nombre visible</label>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3.5 text-base font-bold text-white outline-none transition placeholder:text-white/30 focus:border-orange-500/70"
                    placeholder="Tu nombre"
                  />
                </div>

                <button onClick={handleSaveProfile} disabled={saving || !!playerIdentity?.is_guest} className="mt-5 w-full rounded-2xl bg-orange-500 px-5 py-3.5 text-base font-black text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60">
                  {saving ? "Guardando..." : "Guardar perfil"}
                </button>

                {message && <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300">{message}</div>}
                {errorMessage && <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">{errorMessage}</div>}
              </aside>

              <div className="space-y-5">
                <div className="rounded-[2rem] border border-white/10 bg-zinc-950/90 p-5 sm:p-7">
                  <div className="mb-5 grid gap-3 sm:grid-cols-3">
                    <InsightCard icon="🎨" label="Estilo" value={selectedAvatar.label} helper="Avatar equipado" />
                    <InsightCard icon="🛡️" label="Marco" value={selectedFrame.label} helper="Marco activo" />
                    <InsightCard icon="💾" label="Guardado" value={playerIdentity?.is_guest ? "Invitado" : "Perfil"} helper={playerIdentity?.is_guest ? "Regístrate para guardar cambios" : "Cambios con Supabase"} />
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-300">Avatares</p>
                      <h3 className="mt-2 text-2xl font-black">Elige tu personaje</h3>
                    </div>
                    <p className="text-sm font-bold text-white/45">Solo desbloqueados</p>
                  </div>

                  <div className="mt-5 space-y-5">
                    {Object.entries(groupedOwnedAvatars).map(([group, avatars]) => (
                      <div key={group}>
                        <h4 className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-white/45">{group}</h4>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                          {avatars.map((avatar) => (
                            <button
                              key={avatar.key}
                              type="button"
                              onClick={() => setAvatarKey(avatar.key)}
                              className={`rounded-3xl border p-4 text-center transition ${
                                avatarKey === avatar.key
                                  ? "border-orange-500/60 bg-orange-500/15 shadow-[0_0_25px_rgba(249,115,22,0.12)]"
                                  : "border-white/10 bg-white/[0.03] hover:border-orange-500/25 hover:bg-white/[0.06]"
                              }`}
                            >
                              {avatar.image ? <img src={avatar.image} alt={avatar.label} className="mx-auto h-16 w-16 object-contain" /> : <p className="text-4xl">{avatar.emoji ?? "🙂"}</p>}
                              <p className="mt-3 truncate text-sm font-black">{avatar.label}</p>
                              <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[0.65rem] font-black ${getTierBadgeClass(avatar.tier)}`}>{getTierLabel(avatar.tier)}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[2rem] border border-white/10 bg-zinc-950/90 p-5 sm:p-7">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-300">Marcos</p>
                      <h3 className="mt-2 text-2xl font-black">Elige tu marco</h3>
                    </div>
                    <p className="text-sm font-bold text-white/45">Solo desbloqueados</p>
                  </div>

                  <div className="mt-5 space-y-5">
                    {Object.entries(groupedOwnedFrames).map(([group, frames]) => (
                      <div key={group}>
                        <h4 className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-white/45">{group}</h4>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {frames.map((frame) => (
                            <button
                              key={frame.key}
                              type="button"
                              onClick={() => setFrameKey(frame.key)}
                              className={`rounded-3xl border p-4 text-left transition ${
                                frameKey === frame.key
                                  ? "border-orange-500/60 bg-orange-500/15 shadow-[0_0_25px_rgba(249,115,22,0.12)]"
                                  : "border-white/10 bg-white/[0.03] hover:border-orange-500/25 hover:bg-white/[0.06]"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-black">
                                  {frame.image ? <img src={frame.image} alt={frame.label} className="h-12 w-12 object-contain" /> : <div className={`h-10 w-10 rounded-full border-4 ${frame.className ?? ""}`} />}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate font-black">{frame.label}</p>
                                  <p className="text-xs font-bold text-white/45">{getTierLabel(frame.tier)}</p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "stats" && (
            <div className="space-y-5">
              <div className="rounded-[2rem] border border-orange-500/15 bg-zinc-950/90 p-5 sm:p-7">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-300">Dashboard gamer</p>
                    <h2 className="mt-3 text-3xl font-black sm:text-4xl">Tu rendimiento</h2>
                    <p className="mt-2 text-sm text-white/55">{playerRankLabel} · {winRateMessage}</p>
                  </div>

                  <div className="rounded-[2rem] border border-orange-500/25 bg-orange-500/10 p-5 text-center lg:min-w-56">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-200">Win Rate</p>
                    <p className="mt-2 text-5xl font-black text-orange-100">{winRate}%</p>
                  </div>
                </div>

                <div className="mt-6">
                  <ProgressBar value={winRateNumber} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Partidas" value={stats.games_played} helper="Jugadas" />
                <StatCard label="Victorias" value={stats.games_won} helper="Ganadas" tone="emerald" />
                <StatCard label="Derrotas" value={stats.games_lost} helper="Perdidas" />
                <StatCard label="Saldo" value={winDifference >= 0 ? `+${winDifference}` : winDifference} helper="Victorias - derrotas" tone="orange" />
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <div className="rounded-[2rem] border border-yellow-500/15 bg-yellow-500/5 p-5 sm:p-7">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-yellow-300">Rachas</p>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <StatCard label="Racha actual" value={stats.current_win_streak} tone="yellow" />
                    <StatCard label="Mejor racha" value={stats.best_win_streak} tone="yellow" />
                  </div>
                </div>

                <div className="rounded-[2rem] border border-cyan-500/15 bg-cyan-500/5 p-5 sm:p-7">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-300">Progreso</p>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <StatCard label="XP total" value={stats.total_points_earned} tone="cyan" />
                    <StatCard label="Nivel" value={levelInfo.level} helper={levelInfo.title} tone="cyan" />
                  </div>
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-[2rem] border border-white/10 bg-zinc-950/90 p-5 sm:p-7">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-white/45">Calificación</p>
                  <div className="mt-5 rounded-[2rem] border border-orange-500/20 bg-orange-500/10 p-6 text-center">
                    <p className="text-6xl font-black text-orange-100">{performanceGrade.grade}</p>
                    <p className="mt-2 text-xl font-black text-white">{performanceGrade.label}</p>
                    <p className="mt-2 text-sm leading-relaxed text-white/50">{performanceGrade.helper}</p>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-white/10 bg-zinc-950/90 p-5 sm:p-7">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-white/45">Lectura visual</p>
                  <div className="mt-5 space-y-3">
                    <VisualMeter label="Win rate" value={winRateNumber} helper="Porcentaje de partidas ganadas." tone="emerald" />
                    <VisualMeter label="Meta de partidas" value={milestonePercent} helper={`${stats.games_played}/${nextMilestone.target} para ${nextMilestone.label}.`} tone="yellow" />
                    <VisualMeter label="Colección premium" value={collectionPercent} helper={`${ownedPremiumTotal}/${premiumTotal} cosméticos premium desbloqueados.`} tone="cyan" />
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-zinc-950/90 p-5 sm:p-7">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-white/45">Mejores juegos</p>
                <div className="mt-4">
                  <EmptyFutureCard icon="🏅" title="Ranking por juego" description="Aquí podemos conectar estadísticas por juego cuando dejemos lista esa tabla/resumen: más jugado, más ganado y mejor porcentaje." />
                </div>
              </div>
            </div>
          )}

          {activeTab === "collection" && (
            <div className="space-y-5">
              <div className="rounded-[2rem] border border-cyan-500/15 bg-zinc-950/90 p-5 sm:p-7">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-300">Colección</p>
                    <h2 className="mt-3 text-3xl font-black sm:text-4xl">Cosméticos desbloqueados</h2>
                    <p className="mt-2 text-sm text-white/55">Tu progreso visual sin mezclar compras dentro del perfil.</p>
                    <p className="mt-2 inline-flex rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-black text-cyan-200">{collectionRank}</p>
                  </div>

                  <div className="rounded-[2rem] border border-cyan-500/25 bg-cyan-500/10 p-5 text-center lg:min-w-56">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">Premium</p>
                    <p className="mt-2 text-4xl font-black text-cyan-100">{ownedPremiumTotal}/{premiumTotal}</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                    <div className="flex items-center justify-between">
                      <p className="font-black text-white/80">Avatares</p>
                      <p className="font-black text-cyan-200">{ownedPremiumAvatarsCount}/{PREMIUM_AVATARS.length}</p>
                    </div>
                    <div className="mt-3"><ProgressBar value={avatarCollectionPercent} className="bg-cyan-400" /></div>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                    <div className="flex items-center justify-between">
                      <p className="font-black text-white/80">Marcos</p>
                      <p className="font-black text-violet-200">{ownedPremiumFramesCount}/{PREMIUM_FRAMES.length}</p>
                    </div>
                    <div className="mt-3"><ProgressBar value={frameCollectionPercent} className="bg-violet-400" /></div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {(["unlocked", "locked", "all"] as CosmeticFilter[]).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setCollectionFilter(filter)}
                    className={`rounded-full border px-4 py-2 text-sm font-black transition ${
                      collectionFilter === filter
                        ? "border-orange-500/40 bg-orange-500/15 text-orange-100"
                        : "border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06]"
                    }`}
                  >
                    {filter === "unlocked" ? "Desbloqueados" : filter === "locked" ? "Bloqueados" : "Todos"}
                  </button>
                ))}
              </div>

              {(collectionFilter === "unlocked" || collectionFilter === "all") && (
                <div className="grid gap-5 lg:grid-cols-2">
                  <CollectionPanel title="Avatares desbloqueados" groups={groupedOwnedAvatars} type="avatar" ownedKeys={ownedAvatars} />
                  <CollectionPanel title="Marcos desbloqueados" groups={groupedOwnedFrames} type="frame" ownedKeys={ownedFrames} />
                </div>
              )}

              {(collectionFilter === "locked" || collectionFilter === "all") && (
                <div className="grid gap-5 lg:grid-cols-2">
                  <CollectionPanel title="Avatares bloqueados" groups={groupedLockedAvatars} type="avatar" ownedKeys={ownedAvatars} locked />
                  <CollectionPanel title="Marcos bloqueados" groups={groupedLockedFrames} type="frame" ownedKeys={ownedFrames} locked />
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-3">
                <EmptyFutureCard icon="⭐" title="Especiales" description="Espacio listo para eventos, temporadas y recompensas limitadas." />
                <EmptyFutureCard icon="🎁" title="Códigos" description="Los códigos siguen viviendo mejor en la tienda completa." />
                <EmptyFutureCard icon="🎮" title="Variantes" description="Preparado para futuras skins o temas premium de juegos." />
              </div>

              <Link href="/tienda" className="flex w-full items-center justify-center rounded-3xl bg-orange-500 px-5 py-4 text-base font-black text-black transition hover:bg-orange-400">
                Abrir tienda completa ✨
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function CollectionPanel({
  title,
  groups,
  type,
  locked = false,
}: {
  title: string;
  groups: Record<string, CosmeticItem[]>;
  type: "avatar" | "frame";
  ownedKeys: string[];
  locked?: boolean;
}) {
  const entries = Object.entries(groups);

  return (
    <div className="rounded-[2rem] border border-white/10 bg-zinc-950/90 p-5 sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl font-black">{title}</h3>
        {locked && <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-black text-white/45">En tienda</span>}
      </div>

      {entries.length === 0 ? (
        <div className="mt-4 rounded-3xl border border-dashed border-white/10 bg-white/[0.025] p-5 text-center text-sm font-bold text-white/45">
          No hay elementos para mostrar.
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          {entries.map(([group, items]) => (
            <div key={group}>
              <h4 className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-white/45">{group}</h4>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {items.map((item) => (
                  <div key={item.key} className={`relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-center ${locked ? "grayscale" : ""}`}>
                    {type === "avatar" ? (
                      "image" in item && item.image ? (
                        <img src={item.image} alt={item.label} className="mx-auto h-16 w-16 object-contain" />
                      ) : (
                        <p className="text-4xl">{"emoji" in item ? item.emoji ?? "🙂" : "🙂"}</p>
                      )
                    ) : "image" in item && item.image ? (
                      <img src={item.image} alt={item.label} className="mx-auto h-16 w-16 object-contain" />
                    ) : (
                      <div className={`mx-auto h-14 w-14 rounded-full border-4 bg-black ${"className" in item ? item.className ?? "" : ""}`} />
                    )}

                    <p className="mt-3 truncate text-sm font-black">{item.label}</p>
                    <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[0.65rem] font-black ${getTierBadgeClass(item.tier)}`}>{locked ? `${item.price} pts` : getTierLabel(item.tier)}</span>

                    {locked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-[1px]">
                        <span className="rounded-full border border-white/15 bg-black/70 px-3 py-1 text-xs font-black text-white/70">🔒 Bloqueado</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}