"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getPlayerIdentity, type PlayerIdentity } from "@/lib/getPlayerIdentity";
import { AVATARS, FRAMES } from "@/lib/profileCosmetics";

const BASIC_AVATARS = AVATARS.filter((avatar) => avatar.tier === "basic");
const STORE_AVATARS = AVATARS.filter((avatar) => avatar.tier !== "basic");

const BASIC_FRAMES = FRAMES.filter((frame) => frame.tier === "basic");
const STORE_FRAMES = FRAMES.filter((frame) => frame.tier !== "basic");

type StoreAvatar = (typeof STORE_AVATARS)[number];
type StoreFrame = (typeof STORE_FRAMES)[number];

type LeftTab = "preview" | "stats";
type RightTab = "customization" | "shop";
type StatsTab = "performance" | "progress" | "collection";

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

const DEFAULT_OWNED_AVATARS = [
  "avatar_sun",
  "avatar_moon",
  "avatar_star",
  "avatar_rocket",
  "avatar_game",
];

const DEFAULT_OWNED_FRAMES = [
  "frame_orange",
  "frame_emerald",
  "frame_blue",
  "frame_purple",
  "frame_gold",
  "frame_guest",
];

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
  if (tier === "legendary") {
    return "border-yellow-400/30 bg-yellow-500/10 text-yellow-200";
  }

  if (tier === "collection") {
    return "border-cyan-400/25 bg-cyan-500/10 text-cyan-200";
  }

  return "border-white/10 bg-white/[0.04] text-white/60";
}

function getComboTip(avatarKey: string, frameKey: string) {
  if (avatarKey === "avatar_demonio" && frameKey !== "marco_infernal") {
    return "Tip: combina Demonio con Marco Infernal para un estilo legendario 🔥";
  }

  if (avatarKey === "avatar_angel" && frameKey !== "marco_divino") {
    return "Tip: combina Ángel con Marco Divino para completar el look celestial ✨";
  }

  if (avatarKey === "avatar_gato_naranja" && frameKey !== "marco_gato") {
    return "Tip: Chopper combina perfecto con Marco Felino 🐾";
  }

  if (avatarKey === "avatar_pug" && frameKey !== "marco_perro") {
    return "Tip: Nala combina perfecto con Marco Canino 🐶";
  }

  if (avatarKey === "avatar_taco" || avatarKey === "avatar_hamburguesa") {
    if (frameKey !== "marco_comida") {
      return "Tip: los avatares de comida lucen mejor con Marco Comida 🌮";
    }
  }

  return "Tu combinación actual se ve lista para la mesa.";
}

export default function PerfilPage() {
  const supabase = createClient();

  const [playerIdentity, setPlayerIdentity] = useState<PlayerIdentity | null>(null);
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [buyingAvatarKey, setBuyingAvatarKey] = useState<string | null>(null);
  const [buyingFrameKey, setBuyingFrameKey] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [avatarKey, setAvatarKey] = useState("avatar_sun");
  const [frameKey, setFrameKey] = useState("frame_orange");

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [leftTab, setLeftTab] = useState<LeftTab>("preview");
  const [rightTab, setRightTab] = useState<RightTab>("customization");
  const [statsTab, setStatsTab] = useState<StatsTab>("performance");

  const [ownedAvatarGroupTab, setOwnedAvatarGroupTab] = useState<string>("Mascotas");
  const [ownedFrameGroupTab, setOwnedFrameGroupTab] = useState<string>("Mascotas");

  const [stats, setStats] = useState<ProfileStats>(DEFAULT_STATS);
  const [points, setPoints] = useState<number>(0);
  const [ownedAvatars, setOwnedAvatars] = useState<string[]>(DEFAULT_OWNED_AVATARS);
  const [ownedFrames, setOwnedFrames] = useState<string[]>(DEFAULT_OWNED_FRAMES);

  const loadProfileData = async () => {
    const identity = await getPlayerIdentity();
    setPlayerIdentity(identity);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    setEmail(user?.email ?? "");

    if (identity) {
      setDisplayName(identity.name);
      setAvatarKey(identity.avatar_key ?? "avatar_sun");
      setFrameKey(identity.frame_key ?? "frame_orange");
      setPoints(identity.points ?? 0);

      if (identity.user_id) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select(
            "games_played, games_won, games_lost, total_points_earned, current_win_streak, best_win_streak, points, owned_avatars, owned_frames"
          )
          .eq("id", identity.user_id)
          .single();

        if (profileError) {
          console.error("Error cargando datos del perfil:", profileError);
        } else if (profileData) {
          setStats({
            games_played: profileData.games_played ?? 0,
            games_won: profileData.games_won ?? 0,
            games_lost: profileData.games_lost ?? 0,
            total_points_earned: profileData.total_points_earned ?? 0,
            current_win_streak: profileData.current_win_streak ?? 0,
            best_win_streak: profileData.best_win_streak ?? 0,
          });

          setPoints(profileData.points ?? 0);

          setOwnedAvatars(
            Array.from(new Set([...DEFAULT_OWNED_AVATARS, ...(profileData.owned_avatars ?? [])]))
          );

          setOwnedFrames(
            Array.from(new Set([...DEFAULT_OWNED_FRAMES, ...(profileData.owned_frames ?? [])]))
          );
        }
      }
    }
  };

  useEffect(() => {
    const load = async () => {
      await loadProfileData();
      setLoading(false);
    };

    load();
  }, []);

  const selectedAvatar = useMemo(
    () => AVATARS.find((avatar) => avatar.key === avatarKey) ?? AVATARS[0],
    [avatarKey]
  );

  const selectedFrame = useMemo(
    () => FRAMES.find((frame) => frame.key === frameKey) ?? FRAMES[0],
    [frameKey]
  );

  const ownedStoreAvatars = useMemo(
    () => STORE_AVATARS.filter((avatar) => ownedAvatars.includes(avatar.key)),
    [ownedAvatars]
  );

  const ownedStoreFrames = useMemo(
    () => STORE_FRAMES.filter((frame) => ownedFrames.includes(frame.key)),
    [ownedFrames]
  );

  const groupedStoreAvatars = useMemo(() => groupByGroup(STORE_AVATARS), []);
  const groupedStoreFrames = useMemo(() => groupByGroup(STORE_FRAMES), []);

  const groupedOwnedAvatars = useMemo(
    () => groupByGroup(ownedStoreAvatars),
    [ownedStoreAvatars]
  );

  const groupedOwnedFrames = useMemo(
    () => groupByGroup(ownedStoreFrames),
    [ownedStoreFrames]
  );

  const ownedAvatarGroups = Object.keys(groupedOwnedAvatars);
  const ownedFrameGroups = Object.keys(groupedOwnedFrames);

  const activeOwnedAvatarGroup = ownedAvatarGroups.includes(ownedAvatarGroupTab)
    ? ownedAvatarGroupTab
    : ownedAvatarGroups[0];

  const activeOwnedFrameGroup = ownedFrameGroups.includes(ownedFrameGroupTab)
    ? ownedFrameGroupTab
    : ownedFrameGroups[0];

  const winRate = useMemo(() => {
    if (!stats.games_played) return "0.0";
    return ((stats.games_won / stats.games_played) * 100).toFixed(1);
  }, [stats.games_played, stats.games_won]);

  const purchasedAvatarsCount = ownedStoreAvatars.length;
  const purchasedFramesCount = ownedStoreFrames.length;
  const totalCosmeticsCount = purchasedAvatarsCount + purchasedFramesCount;
  const totalStoreCosmetics = STORE_AVATARS.length + STORE_FRAMES.length;
  const collectionPercent =
    totalStoreCosmetics > 0
      ? Math.round((totalCosmeticsCount / totalStoreCosmetics) * 100)
      : 0;

  const comboTip = getComboTip(selectedAvatar.key, selectedFrame.key);

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
        .update({
          display_name: normalizedName,
          avatar_key: avatarKey,
          frame_key: frameKey,
        })
        .eq("id", playerIdentity.user_id);

      if (profileError) {
        setErrorMessage(profileError.message);
        return;
      }

      await supabase.auth.updateUser({
        data: { display_name: normalizedName },
      });

      setMessage("Perfil actualizado correctamente.");
      await loadProfileData();
      window.location.href = "/";
    } finally {
      setSaving(false);
    }
  };

  const handleBuyAvatar = async (avatar: StoreAvatar) => {
    setMessage("");
    setErrorMessage("");

    if (!playerIdentity?.user_id) {
      setErrorMessage("Necesitas una cuenta registrada para comprar cosméticos.");
      return;
    }

    if (ownedAvatars.includes(avatar.key)) {
      setErrorMessage("Ya tienes este avatar.");
      return;
    }

    if (points < avatar.price) {
      setErrorMessage("No tienes puntos suficientes.");
      return;
    }

    try {
      setBuyingAvatarKey(avatar.key);

      const { data: profile, error: fetchError } = await supabase
        .from("profiles")
        .select("points, owned_avatars")
        .eq("id", playerIdentity.user_id)
        .single();

      if (fetchError || !profile) {
        setErrorMessage("No se pudo cargar tu perfil.");
        return;
      }

      const currentPoints = profile.points ?? 0;
      const currentOwned = profile.owned_avatars ?? [];

      if (currentOwned.includes(avatar.key)) {
        setErrorMessage("Ya tienes este avatar.");
        return;
      }

      if (currentPoints < avatar.price) {
        setErrorMessage("No tienes puntos suficientes.");
        return;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          points: currentPoints - avatar.price,
          owned_avatars: [...currentOwned, avatar.key],
        })
        .eq("id", playerIdentity.user_id);

      if (updateError) {
        setErrorMessage(updateError.message);
        return;
      }

      setMessage(`Compraste ${avatar.label} correctamente.`);
      await loadProfileData();
    } finally {
      setBuyingAvatarKey(null);
    }
  };

  const handleBuyFrame = async (frame: StoreFrame) => {
    setMessage("");
    setErrorMessage("");

    if (!playerIdentity?.user_id) {
      setErrorMessage("Necesitas una cuenta registrada para comprar cosméticos.");
      return;
    }

    if (ownedFrames.includes(frame.key)) {
      setErrorMessage("Ya tienes este marco.");
      return;
    }

    if (points < frame.price) {
      setErrorMessage("No tienes puntos suficientes.");
      return;
    }

    try {
      setBuyingFrameKey(frame.key);

      const { data: profile, error: fetchError } = await supabase
        .from("profiles")
        .select("points, owned_frames")
        .eq("id", playerIdentity.user_id)
        .single();

      if (fetchError || !profile) {
        setErrorMessage("No se pudo cargar tu perfil.");
        return;
      }

      const currentPoints = profile.points ?? 0;
      const currentOwned = profile.owned_frames ?? [];

      if (currentOwned.includes(frame.key)) {
        setErrorMessage("Ya tienes este marco.");
        return;
      }

      if (currentPoints < frame.price) {
        setErrorMessage("No tienes puntos suficientes.");
        return;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          points: currentPoints - frame.price,
          owned_frames: [...currentOwned, frame.key],
        })
        .eq("id", playerIdentity.user_id);

      if (updateError) {
        setErrorMessage(updateError.message);
        return;
      }

      setMessage(`Compraste ${frame.label} correctamente.`);
      await loadProfileData();
    } finally {
      setBuyingFrameKey(null);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto max-w-6xl rounded-[34px] border border-white/10 bg-zinc-950/90 p-10 text-center">
          <p className="text-3xl font-bold">Cargando perfil...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/"
          className="mb-6 inline-flex rounded-2xl bg-orange-500 px-5 py-3 font-bold text-black transition hover:bg-orange-400"
        >
          ← Volver
        </Link>

        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[34px] border border-orange-500/15 bg-zinc-950/90 p-8 shadow-[0_0_40px_rgba(249,115,22,0.05)] md:p-10">
            <div className="mb-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setLeftTab("preview")}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  leftTab === "preview"
                    ? "border-orange-500/30 bg-orange-500/10 text-orange-200"
                    : "border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/[0.06]"
                }`}
              >
                Vista previa
              </button>

              <button
                type="button"
                onClick={() => setLeftTab("stats")}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  leftTab === "stats"
                    ? "border-orange-500/30 bg-orange-500/10 text-orange-200"
                    : "border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/[0.06]"
                }`}
              >
                Estadísticas
              </button>
            </div>

            {leftTab === "preview" && (
              <div className="flex flex-col items-center text-center">
                <div className="relative flex h-48 w-48 items-center justify-center rounded-full bg-black shadow-[0_0_45px_rgba(249,115,22,0.12)]">
                  {selectedFrame.image ? (
                    <img
                      src={selectedFrame.image}
                      alt={selectedFrame.label}
                      className="absolute inset-0 h-full w-full object-contain"
                    />
                  ) : (
                    <div
                      className={`absolute inset-0 rounded-full border-4 ${
                        selectedFrame.className ?? ""
                      }`}
                    />
                  )}

                  {selectedAvatar.image ? (
                    <img
                      src={selectedAvatar.image}
                      alt={selectedAvatar.label}
                      className="relative z-10 h-32 w-32 object-contain"
                    />
                  ) : (
                    <span className="relative z-10 text-7xl">
                      {selectedAvatar.emoji ?? "🙂"}
                    </span>
                  )}
                </div>

                <h1 className="mt-6 text-4xl font-extrabold">{displayName || "Jugador"}</h1>
                <p className="mt-2 text-white/60">
                  {playerIdentity?.is_guest ? "Invitado" : "Usuario registrado"}
                </p>

                <div className="mt-6 grid w-full gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                    <p className="text-sm uppercase tracking-[0.18em] text-white/50">Puntos</p>
                    <p className="mt-2 text-3xl font-extrabold">{points}</p>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                    <p className="text-sm uppercase tracking-[0.18em] text-white/50">Correo</p>
                    <p className="mt-2 break-all text-lg font-bold">
                      {email || "No disponible"}
                    </p>
                  </div>
                </div>

                <div className="mt-6 w-full rounded-3xl border border-orange-500/15 bg-orange-500/5 p-5 text-left">
                  <p className="text-sm uppercase tracking-[0.18em] text-orange-300">
                    Combo actual
                  </p>
                  <p className="mt-2 text-xl font-extrabold">
                    {selectedAvatar.label} + {selectedFrame.label}
                  </p>
                  <p className="mt-2 text-sm text-white/65">{comboTip}</p>
                </div>

                <div className="mt-4 w-full rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-left">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.18em] text-white/50">
                        Colección
                      </p>
                      <p className="mt-2 text-2xl font-extrabold">
                        {totalCosmeticsCount}/{totalStoreCosmetics}
                      </p>
                    </div>

                    <div className="rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-2 text-sm font-bold text-orange-200">
                      {collectionPercent}%
                    </div>
                  </div>

                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-orange-500 transition-all"
                      style={{ width: `${collectionPercent}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 grid w-full gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-2xl">🎭</p>
                    <p className="mt-2 text-sm font-bold">Avatar</p>
                    <p className="text-xs text-white/55">{getTierLabel(selectedAvatar.tier)}</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-2xl">🖼️</p>
                    <p className="mt-2 text-sm font-bold">Marco</p>
                    <p className="text-xs text-white/55">{getTierLabel(selectedFrame.tier)}</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-2xl">🏆</p>
                    <p className="mt-2 text-sm font-bold">Logro</p>
                    <p className="text-xs text-white/55">
                      {totalCosmeticsCount > 0 ? "Coleccionista" : "Nuevo jugador"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {leftTab === "stats" && (
              <div>
                <div className="mb-6">
                  <p className="text-sm uppercase tracking-[0.18em] text-orange-300">
                    Estadísticas del jugador
                  </p>
                  <h2 className="mt-3 text-3xl font-extrabold">Tu rendimiento</h2>
                </div>

                <div className="mb-6 flex flex-wrap gap-3">
                  {(["performance", "progress", "collection"] as StatsTab[]).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setStatsTab(item)}
                      className={`rounded-full border px-4 py-2 text-sm transition ${
                        statsTab === item
                          ? "border-orange-500/30 bg-orange-500/10 text-orange-200"
                          : "border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/[0.06]"
                      }`}
                    >
                      {item === "performance"
                        ? "Rendimiento"
                        : item === "progress"
                          ? "Progreso"
                          : "Colección"}
                    </button>
                  ))}
                </div>

                {statsTab === "performance" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                      <p className="text-sm uppercase tracking-[0.18em] text-white/50">
                        Partidas jugadas
                      </p>
                      <p className="mt-2 text-3xl font-extrabold">{stats.games_played}</p>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                      <p className="text-sm uppercase tracking-[0.18em] text-white/50">
                        Ganadas
                      </p>
                      <p className="mt-2 text-3xl font-extrabold text-emerald-400">
                        {stats.games_won}
                      </p>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                      <p className="text-sm uppercase tracking-[0.18em] text-white/50">
                        Perdidas
                      </p>
                      <p className="mt-2 text-3xl font-extrabold text-red-400">
                        {stats.games_lost}
                      </p>
                    </div>

                    <div className="rounded-3xl border border-orange-500/20 bg-orange-500/5 p-5">
                      <p className="text-sm uppercase tracking-[0.18em] text-orange-300">
                        Win Rate
                      </p>
                      <p className="mt-2 text-3xl font-extrabold text-orange-200">
                        {winRate}%
                      </p>
                    </div>
                  </div>
                )}

                {statsTab === "progress" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                      <p className="text-sm uppercase tracking-[0.18em] text-white/50">
                        Puntos actuales
                      </p>
                      <p className="mt-2 text-3xl font-extrabold">{points}</p>
                    </div>

                    <div className="rounded-3xl border border-orange-500/20 bg-orange-500/5 p-5">
                      <p className="text-sm uppercase tracking-[0.18em] text-orange-300">
                        Puntos acumulados
                      </p>
                      <p className="mt-2 text-3xl font-extrabold text-orange-200">
                        {stats.total_points_earned}
                      </p>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:col-span-2">
                      <p className="text-sm uppercase tracking-[0.18em] text-white/50">
                        Mejor racha de victorias
                      </p>
                      <p className="mt-2 text-3xl font-extrabold text-yellow-300">
                        {stats.best_win_streak}
                      </p>
                      <p className="mt-2 text-sm text-white/60">
                        Racha actual: {stats.current_win_streak}
                      </p>
                    </div>
                  </div>
                )}

                {statsTab === "collection" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                      <p className="text-sm uppercase tracking-[0.18em] text-white/50">
                        Avatares comprados
                      </p>
                      <p className="mt-2 text-3xl font-extrabold">{purchasedAvatarsCount}</p>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                      <p className="text-sm uppercase tracking-[0.18em] text-white/50">
                        Marcos comprados
                      </p>
                      <p className="mt-2 text-3xl font-extrabold">{purchasedFramesCount}</p>
                    </div>

                    <div className="rounded-3xl border border-orange-500/20 bg-orange-500/5 p-5 sm:col-span-2">
                      <p className="text-sm uppercase tracking-[0.18em] text-orange-300">
                        Total de cosméticos
                      </p>
                      <p className="mt-2 text-3xl font-extrabold text-orange-200">
                        {totalCosmeticsCount}/{totalStoreCosmetics}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="rounded-[34px] border border-orange-500/15 bg-zinc-950/90 p-8 shadow-[0_0_40px_rgba(249,115,22,0.05)] md:p-10">
            <div className="mb-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setRightTab("customization")}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  rightTab === "customization"
                    ? "border-orange-500/30 bg-orange-500/10 text-orange-200"
                    : "border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/[0.06]"
                }`}
              >
                Personalización
              </button>

              <button
                type="button"
                onClick={() => setRightTab("shop")}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  rightTab === "shop"
                    ? "border-orange-500/30 bg-orange-500/10 text-orange-200"
                    : "border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/[0.06]"
                }`}
              >
                Tienda ✨
              </button>
            </div>

            {rightTab === "customization" && (
              <div className="space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-semibold uppercase tracking-[0.18em] text-white/60">
                    Nombre visible
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={20}
                    className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-500/50"
                  />
                </div>

                <div>
                  <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-white/60">
                    Avatares básicos
                  </p>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {BASIC_AVATARS.map((avatar) => (
                      <button
                        key={avatar.key}
                        type="button"
                        onClick={() => setAvatarKey(avatar.key)}
                        className={`rounded-2xl border p-4 text-center transition ${
                          avatarKey === avatar.key
                            ? "border-orange-500 bg-orange-500/10"
                            : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                        }`}
                      >
                        <div className="text-3xl">{avatar.emoji}</div>
                        <p className="mt-2 text-sm font-bold">{avatar.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {ownedStoreAvatars.length > 0 && (
                  <div>
                    <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-white/60">
                      Avatares desbloqueados
                    </p>

                    <div className="mb-4 flex flex-wrap gap-2">
                      {ownedAvatarGroups.map((group) => (
                        <button
                          key={group}
                          type="button"
                          onClick={() => setOwnedAvatarGroupTab(group)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                            activeOwnedAvatarGroup === group
                              ? "border-orange-500/40 bg-orange-500/15 text-orange-200"
                              : "border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06]"
                          }`}
                        >
                          {group}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {(groupedOwnedAvatars[activeOwnedAvatarGroup] ?? []).map((avatar) => (
                        <button
                          key={avatar.key}
                          type="button"
                          onClick={() => setAvatarKey(avatar.key)}
                          className={`rounded-2xl border p-4 text-center transition ${
                            avatarKey === avatar.key
                              ? "border-orange-500 bg-orange-500/10"
                              : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                          }`}
                        >
                          {avatar.image && (
                            <img
                              src={avatar.image}
                              alt={avatar.label}
                              className="mx-auto h-14 w-14 object-contain"
                            />
                          )}
                          <p className="mt-2 text-sm font-bold">{avatar.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-white/60">
                    Marcos básicos
                  </p>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {BASIC_FRAMES.map((frame) => (
                      <button
                        key={frame.key}
                        type="button"
                        onClick={() => setFrameKey(frame.key)}
                        className={`rounded-2xl border p-4 text-left transition ${
                          frameKey === frame.key
                            ? "border-orange-500 bg-orange-500/10"
                            : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full border-4 bg-black ${
                              frame.className ?? ""
                            }`}
                          />
                          <div>
                            <p className="font-bold">{frame.label}</p>
                            <p className="text-xs text-white/60">Marco básico</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {ownedStoreFrames.length > 0 && (
                  <div>
                    <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-white/60">
                      Marcos desbloqueados
                    </p>

                    <div className="mb-4 flex flex-wrap gap-2">
                      {ownedFrameGroups.map((group) => (
                        <button
                          key={group}
                          type="button"
                          onClick={() => setOwnedFrameGroupTab(group)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                            activeOwnedFrameGroup === group
                              ? "border-orange-500/40 bg-orange-500/15 text-orange-200"
                              : "border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06]"
                          }`}
                        >
                          {group}
                        </button>
                      ))}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {(groupedOwnedFrames[activeOwnedFrameGroup] ?? []).map((frame) => (
                        <button
                          key={frame.key}
                          type="button"
                          onClick={() => setFrameKey(frame.key)}
                          className={`rounded-2xl border p-4 text-left transition ${
                            frameKey === frame.key
                              ? "border-orange-500 bg-orange-500/10"
                              : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center">
                              {frame.image && (
                                <img
                                  src={frame.image}
                                  alt={frame.label}
                                  className="max-h-10 max-w-10 object-contain"
                                />
                              )}
                            </div>

                            <div>
                              <p className="font-bold">{frame.label}</p>
                              <p className="text-xs text-white/60">
                                Marco {getTierLabel(frame.tier)}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleSaveProfile}
                  disabled={saving || !!playerIdentity?.is_guest}
                  className="w-full rounded-2xl bg-orange-500 px-5 py-3.5 text-lg font-bold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Guardando..." : "Guardar perfil"}
                </button>

                {message && (
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-emerald-300">
                    {message}
                  </div>
                )}

                {errorMessage && (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-300">
                    {errorMessage}
                  </div>
                )}
              </div>
            )}

            {rightTab === "shop" && (
              <div className="space-y-8">
                <div className="rounded-3xl border border-orange-500/15 bg-orange-500/5 p-5">
                  <p className="text-sm uppercase tracking-[0.18em] text-orange-300">
                    Tienda
                  </p>
                  <h2 className="mt-3 text-3xl font-extrabold">Cosméticos</h2>
                  <p className="mt-2 text-white/70">
                    Compra avatares y marcos usando tus puntos actuales.
                  </p>

                  <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
                    <p className="text-sm uppercase tracking-[0.18em] text-white/50">
                      Tus puntos actuales
                    </p>
                    <p className="mt-2 text-3xl font-extrabold text-orange-200">{points}</p>
                  </div>
                </div>

                <div className="space-y-8">
                  <h3 className="text-2xl font-extrabold">Avatares</h3>

                  {Object.entries(groupedStoreAvatars).map(([group, avatars]) => (
                    <div key={group}>
                      <h4 className="mb-4 text-lg font-bold text-orange-200">{group}</h4>

                      <div className="grid grid-cols-2 gap-4">
                        {avatars.map((avatar) => {
                          const isOwned = ownedAvatars.includes(avatar.key);
                          const isEquipped = avatarKey === avatar.key;

                          return (
                            <div
                              key={avatar.key}
                              className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-orange-500/25 hover:bg-white/[0.05]"
                            >
                              <div className="flex flex-col items-center text-center">
                                {avatar.image && (
                                  <img
                                    src={avatar.image}
                                    alt={avatar.label}
                                    className="h-20 w-20 object-contain"
                                  />
                                )}

                                <p className="mt-3 font-bold">{avatar.label}</p>

                                <span
                                  className={`mt-2 rounded-full border px-3 py-1 text-xs font-bold ${getTierBadgeClass(
                                    avatar.tier
                                  )}`}
                                >
                                  {getTierLabel(avatar.tier)}
                                </span>

                                <div className="mt-3 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-sm text-white/70">
                                  {avatar.price} puntos
                                </div>

                                <div className="mt-4 w-full">
                                  {isEquipped ? (
                                    <button
                                      type="button"
                                      disabled
                                      className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-300"
                                    >
                                      Equipado
                                    </button>
                                  ) : isOwned ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAvatarKey(avatar.key);
                                        setRightTab("customization");
                                      }}
                                      className="w-full rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-200 transition hover:bg-cyan-500/20"
                                    >
                                      Equipar
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleBuyAvatar(avatar)}
                                      disabled={
                                        buyingAvatarKey === avatar.key ||
                                        !!playerIdentity?.is_guest
                                      }
                                      className="w-full rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-sm font-bold text-orange-200 transition hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {buyingAvatarKey === avatar.key
                                        ? "Comprando..."
                                        : "Comprar"}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-8">
                  <h3 className="text-2xl font-extrabold">Marcos</h3>

                  {Object.entries(groupedStoreFrames).map(([group, frames]) => (
                    <div key={group}>
                      <h4 className="mb-4 text-lg font-bold text-orange-200">{group}</h4>

                      <div className="grid grid-cols-2 gap-4">
                        {frames.map((frame) => {
                          const isOwned = ownedFrames.includes(frame.key);
                          const isEquipped = frameKey === frame.key;

                          return (
                            <div
                              key={frame.key}
                              className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-orange-500/25 hover:bg-white/[0.05]"
                            >
                              <div className="flex flex-col items-center text-center">
                                <div className="flex h-20 w-20 items-center justify-center">
                                  {frame.image && (
                                    <img
                                      src={frame.image}
                                      alt={frame.label}
                                      className="max-h-20 max-w-20 object-contain"
                                    />
                                  )}
                                </div>

                                <p className="mt-3 font-bold">{frame.label}</p>

                                <span
                                  className={`mt-2 rounded-full border px-3 py-1 text-xs font-bold ${getTierBadgeClass(
                                    frame.tier
                                  )}`}
                                >
                                  {getTierLabel(frame.tier)}
                                </span>

                                <div className="mt-3 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-sm text-white/70">
                                  {frame.price} puntos
                                </div>

                                <div className="mt-4 w-full">
                                  {isEquipped ? (
                                    <button
                                      type="button"
                                      disabled
                                      className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-300"
                                    >
                                      Equipado
                                    </button>
                                  ) : isOwned ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setFrameKey(frame.key);
                                        setRightTab("customization");
                                      }}
                                      className="w-full rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-200 transition hover:bg-cyan-500/20"
                                    >
                                      Equipar
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleBuyFrame(frame)}
                                      disabled={
                                        buyingFrameKey === frame.key ||
                                        !!playerIdentity?.is_guest
                                      }
                                      className="w-full rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-sm font-bold text-orange-200 transition hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {buyingFrameKey === frame.key
                                        ? "Comprando..."
                                        : "Comprar"}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {message && (
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-emerald-300">
                    {message}
                  </div>
                )}

                {errorMessage && (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-300">
                    {errorMessage}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
