"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getPlayerIdentity, type PlayerIdentity } from "@/lib/getPlayerIdentity";

const BASE_AVATARS = [
  { key: "avatar_sun", emoji: "🌞", label: "Sol" },
  { key: "avatar_moon", emoji: "🌙", label: "Luna" },
  { key: "avatar_star", emoji: "⭐", label: "Estrella" },
  { key: "avatar_rocket", emoji: "🚀", label: "Cohete" },
  { key: "avatar_game", emoji: "🎮", label: "Gamer" },
  { key: "avatar_guest", emoji: "🙂", label: "Invitado" },
];

const PREMIUM_AVATARS = [
  {
    key: "avatar_gato_naranja",
    label: "Chopper",
    image: "/avatars/avatar_gato_naranja.png",
    price: 65,
  },
  {
    key: "avatar_pug",
    label: "Nala",
    image: "/avatars/avatar_pug.png",
    price: 65,
  },
  {
    key: "avatar_delfin",
    label: "Delfín",
    image: "/avatars/avatar_delfin.png",
    price: 65,
  },
  {
    key: "avatar_panda",
    label: "Panda",
    image: "/avatars/avatar_panda.png",
    price: 85,
  },
  {
    key: "avatar_pajaro_rojo",
    label: "Guacamaya",
    image: "/avatars/avatar_pajaro_rojo.png",
    price: 85,
  },
  {
  key: "avatar_mono",
  label: "Mono molesto",
  image: "/avatars/avatar_mono.png",
  price: 75,
},
  {
  key: "avatar_lobo",
  label: "Lobo Imponente",
  image: "/avatars/avatar_lobo.png",
  price: 90,
},
{
  key: "avatar_cerdito",
  label: "Cerdito Cute",
  image: "/avatars/avatar_cerdito.png",
  price: 90,
},
];

const BASE_FRAMES = [
  {
    key: "frame_orange",
    label: "Naranja",
    ringClass: "border-orange-500 shadow-[0_0_18px_rgba(249,115,22,0.35)]",
    dotClass: "bg-orange-400",
  },
  {
    key: "frame_emerald",
    label: "Esmeralda",
    ringClass: "border-emerald-500 shadow-[0_0_18px_rgba(16,185,129,0.35)]",
    dotClass: "bg-emerald-400",
  },
  {
    key: "frame_blue",
    label: "Azul",
    ringClass: "border-sky-500 shadow-[0_0_18px_rgba(14,165,233,0.35)]",
    dotClass: "bg-sky-400",
  },
  {
    key: "frame_purple",
    label: "Morado",
    ringClass: "border-violet-500 shadow-[0_0_18px_rgba(139,92,246,0.35)]",
    dotClass: "bg-violet-400",
  },
  {
    key: "frame_gold",
    label: "Dorado",
    ringClass: "border-yellow-400 shadow-[0_0_18px_rgba(250,204,21,0.35)]",
    dotClass: "bg-yellow-300",
  },
  {
    key: "frame_guest",
    label: "Invitado",
    ringClass: "border-white/40 shadow-[0_0_18px_rgba(255,255,255,0.18)]",
    dotClass: "bg-white/70",
  },
];

const PREMIUM_FRAMES = [
  {
    key: "marco_perro",
    label: "Marco Canino",
    image: "/frames/marco_perro.png",
    price: 85,
  },
  {
    key: "marco_gato",
    label: "Marco Felino",
    image: "/frames/marco_gato.png",
    price: 85,
  },
  {
    key: "marco_oceano",
    label: "Marco Océano",
    image: "/frames/marco_oceano.png",
    price: 110,
  },
  {
    key: "marco_selva",
    label: "Marco Selva",
    image: "/frames/marco_selva.png",
    price: 110,
  },
];

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

          const dbOwnedAvatars = profileData.owned_avatars ?? [];
          const mergedOwnedAvatars = Array.from(
            new Set([...DEFAULT_OWNED_AVATARS, ...dbOwnedAvatars])
          );
          setOwnedAvatars(mergedOwnedAvatars);

          const dbOwnedFrames = profileData.owned_frames ?? [];
          const mergedOwnedFrames = Array.from(
            new Set([...DEFAULT_OWNED_FRAMES, ...dbOwnedFrames])
          );
          setOwnedFrames(mergedOwnedFrames);
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

  const selectedBaseAvatar = useMemo(
    () => BASE_AVATARS.find((avatar) => avatar.key === avatarKey) ?? null,
    [avatarKey]
  );

  const selectedPremiumAvatar = useMemo(
    () => PREMIUM_AVATARS.find((avatar) => avatar.key === avatarKey) ?? null,
    [avatarKey]
  );

  const selectedBaseFrame = useMemo(
    () => BASE_FRAMES.find((frame) => frame.key === frameKey) ?? null,
    [frameKey]
  );

  const selectedPremiumFrame = useMemo(
    () => PREMIUM_FRAMES.find((frame) => frame.key === frameKey) ?? null,
    [frameKey]
  );

  const ownedPremiumAvatars = useMemo(
    () => PREMIUM_AVATARS.filter((avatar) => ownedAvatars.includes(avatar.key)),
    [ownedAvatars]
  );

  const ownedPremiumFrames = useMemo(
    () => PREMIUM_FRAMES.filter((frame) => ownedFrames.includes(frame.key)),
    [ownedFrames]
  );

  const winRate = useMemo(() => {
    if (!stats.games_played) return "0.0";
    return ((stats.games_won / stats.games_played) * 100).toFixed(1);
  }, [stats.games_played, stats.games_won]);

  const purchasedAvatarsCount = ownedPremiumAvatars.length;
  const purchasedFramesCount = ownedPremiumFrames.length;
  const totalCosmeticsCount = purchasedAvatarsCount + purchasedFramesCount;

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

      const { error: authError } = await supabase.auth.updateUser({
        data: {
          display_name: normalizedName,
        },
      });

      if (authError) {
        console.error("Error actualizando metadata de usuario:", authError);
      }

      setMessage("Perfil actualizado correctamente.");
      await loadProfileData();
      window.location.href = "/";
    } finally {
      setSaving(false);
    }
  };

  const handleBuyAvatar = async (avatar: (typeof PREMIUM_AVATARS)[number]) => {
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

      const updatedOwned = [...currentOwned, avatar.key];

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          points: currentPoints - avatar.price,
          owned_avatars: updatedOwned,
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

  const handleBuyFrame = async (frame: (typeof PREMIUM_FRAMES)[number]) => {
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

      const updatedOwned = [...currentOwned, frame.key];

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          points: currentPoints - frame.price,
          owned_frames: updatedOwned,
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
                <div className="relative flex h-40 w-40 items-center justify-center rounded-full bg-black">
                  {selectedPremiumFrame ? (
                    <img
                      src={selectedPremiumFrame.image}
                      alt={selectedPremiumFrame.label}
                      className="absolute inset-0 h-full w-full object-contain"
                    />
                  ) : (
                    <div
                      className={`absolute inset-0 rounded-full border-4 ${selectedBaseFrame?.ringClass ?? ""}`}
                    />
                  )}

                  {selectedPremiumAvatar ? (
                    <img
                      src={selectedPremiumAvatar.image}
                      alt={selectedPremiumAvatar.label}
                      className="relative z-10 h-28 w-28 object-contain"
                    />
                  ) : (
                    <span className="relative z-10 text-6xl">
                      {selectedBaseAvatar?.emoji ?? "🙂"}
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
                    <p className="mt-2 text-lg font-bold break-all">
                      {email || "No disponible"}
                    </p>
                  </div>
                </div>

                <div className="mt-6 w-full rounded-3xl border border-orange-500/15 bg-orange-500/5 p-5 text-left">
                  <p className="text-sm uppercase tracking-[0.18em] text-orange-300">
                    Perfil
                  </p>
                  <p className="mt-2 text-white/70">
                    Aquí ves tu identidad actual, tus puntos y cómo se verá tu avatar con el marco equipado.
                  </p>
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
                  <p className="mt-2 text-white/65">
                    Aquí podrás ver tu progreso general, colección y avance dentro del juego.
                  </p>
                </div>

                <div className="mb-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setStatsTab("performance")}
                    className={`rounded-full border px-4 py-2 text-sm transition ${
                      statsTab === "performance"
                        ? "border-orange-500/30 bg-orange-500/10 text-orange-200"
                        : "border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/[0.06]"
                    }`}
                  >
                    Rendimiento
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatsTab("progress")}
                    className={`rounded-full border px-4 py-2 text-sm transition ${
                      statsTab === "progress"
                        ? "border-orange-500/30 bg-orange-500/10 text-orange-200"
                        : "border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/[0.06]"
                    }`}
                  >
                    Progreso
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatsTab("collection")}
                    className={`rounded-full border px-4 py-2 text-sm transition ${
                      statsTab === "collection"
                        ? "border-orange-500/30 bg-orange-500/10 text-orange-200"
                        : "border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/[0.06]"
                    }`}
                  >
                    Colección
                  </button>
                </div>

                {statsTab === "performance" && (
                  <div>
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
                  </div>
                )}

                {statsTab === "progress" && (
                  <div>
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
                          Juego más jugado
                        </p>
                        <p className="mt-2 text-2xl font-extrabold">Piedra, Papel o Tijera</p>
                        <p className="mt-2 text-sm text-white/60">
                          Por ahora es el único modo disponible, así que domina tu historial.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {statsTab === "collection" && (
                  <div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                        <p className="text-sm uppercase tracking-[0.18em] text-white/50">
                          Avatares comprados
                        </p>
                        <p className="mt-2 text-3xl font-extrabold">
                          {purchasedAvatarsCount}
                        </p>
                      </div>

                      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                        <p className="text-sm uppercase tracking-[0.18em] text-white/50">
                          Marcos comprados
                        </p>
                        <p className="mt-2 text-3xl font-extrabold">
                          {purchasedFramesCount}
                        </p>
                      </div>

                      <div className="rounded-3xl border border-orange-500/20 bg-orange-500/5 p-5 sm:col-span-2">
                        <p className="text-sm uppercase tracking-[0.18em] text-orange-300">
                          Total de cosméticos premium
                        </p>
                        <p className="mt-2 text-3xl font-extrabold text-orange-200">
                          {totalCosmeticsCount}
                        </p>
                        <p className="mt-2 text-sm text-white/60">
                          Tu colección premium entre avatares y marcos.
                        </p>
                      </div>
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
                Tienda
              </button>
            </div>

            {rightTab === "customization" && (
              <>
                {playerIdentity?.is_guest && (
                  <div className="mb-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-yellow-300">
                    Estás viendo el perfil como invitado. Para guardar cambios permanentes necesitas una cuenta registrada.
                  </div>
                )}

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
                      {BASE_AVATARS.map((avatar) => (
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

                  {ownedPremiumAvatars.length > 0 && (
                    <div>
                      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-white/60">
                        Avatares premium desbloqueados
                      </p>

                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {ownedPremiumAvatars.map((avatar) => (
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
                            <img
                              src={avatar.image}
                              alt={avatar.label}
                              className="mx-auto h-14 w-14 object-contain"
                            />
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
                      {BASE_FRAMES.map((frame) => (
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
                              className={`flex h-10 w-10 items-center justify-center rounded-full border-4 bg-black ${frame.ringClass}`}
                            >
                              <div className={`h-3 w-3 rounded-full ${frame.dotClass}`} />
                            </div>

                            <div>
                              <p className="font-bold">{frame.label}</p>
                              <p className="text-xs text-white/60">Marco básico</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {ownedPremiumFrames.length > 0 && (
                    <div>
                      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-white/60">
                        Marcos premium desbloqueados
                      </p>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {ownedPremiumFrames.map((frame) => (
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
                                <img
                                  src={frame.image}
                                  alt={frame.label}
                                  className="max-h-10 max-w-10 object-contain"
                                />
                              </div>

                              <div>
                                <p className="font-bold">{frame.label}</p>
                                <p className="text-xs text-white/60">Marco premium</p>
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
              </>
            )}

            {rightTab === "shop" && (
              <div className="space-y-8">
                <div className="rounded-3xl border border-orange-500/15 bg-orange-500/5 p-5">
                  <p className="text-sm uppercase tracking-[0.18em] text-orange-300">
                    Tienda básica
                  </p>
                  <h2 className="mt-3 text-3xl font-extrabold">Cosméticos premium</h2>
                  <p className="mt-2 text-white/70">
                    Compra nuevos avatares y marcos usando tus puntos actuales.
                  </p>

                  <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
                    <p className="text-sm uppercase tracking-[0.18em] text-white/50">
                      Tus puntos actuales
                    </p>
                    <p className="mt-2 text-3xl font-extrabold text-orange-200">{points}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold">Avatares premium</h3>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {PREMIUM_AVATARS.map((avatar) => {
                      const isOwned = ownedAvatars.includes(avatar.key);
                      const isEquipped = avatarKey === avatar.key;

                      return (
                        <div
                          key={avatar.key}
                          className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
                        >
                          <div className="flex items-center gap-4">
                            <img
                              src={avatar.image}
                              alt={avatar.label}
                              className="h-16 w-16 object-contain"
                            />

                            <div>
                              <p className="text-lg font-bold">{avatar.label}</p>
                              <p className="text-white/60">Avatar premium</p>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between gap-3">
                            <div className="inline-flex rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-sm text-white/70">
                              {avatar.price} puntos
                            </div>

                            {isEquipped ? (
                              <button
                                type="button"
                                disabled
                                className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-300 opacity-80"
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
                                className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-200 transition hover:bg-cyan-500/20"
                              >
                                Equipar
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleBuyAvatar(avatar)}
                                disabled={buyingAvatarKey === avatar.key || !!playerIdentity?.is_guest}
                                className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-sm font-bold text-orange-200 transition hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {buyingAvatarKey === avatar.key ? "Comprando..." : "Comprar"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold">Marcos premium</h3>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {PREMIUM_FRAMES.map((frame) => {
                      const isOwned = ownedFrames.includes(frame.key);
                      const isEquipped = frameKey === frame.key;

                      return (
                        <div
                          key={frame.key}
                          className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex h-16 w-16 items-center justify-center">
                              <img
                                src={frame.image}
                                alt={frame.label}
                                className="max-h-16 max-w-16 object-contain"
                              />
                            </div>

                            <div>
                              <p className="text-lg font-bold">{frame.label}</p>
                              <p className="text-white/60">Marco premium</p>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between gap-3">
                            <div className="inline-flex rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-sm text-white/70">
                              {frame.price} puntos
                            </div>

                            {isEquipped ? (
                              <button
                                type="button"
                                disabled
                                className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-300 opacity-80"
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
                                className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-200 transition hover:bg-cyan-500/20"
                              >
                                Equipar
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleBuyFrame(frame)}
                                disabled={buyingFrameKey === frame.key || !!playerIdentity?.is_guest}
                                className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-sm font-bold text-orange-200 transition hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {buyingFrameKey === frame.key ? "Comprando..." : "Comprar"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
