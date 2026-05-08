// 📍 Ruta del archivo: app/admin/page.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AVATARS, FRAMES } from "@/lib/profile/profileCosmetics";

type RewardType = "points" | "avatar" | "frame";
type AdminTab = "dashboard" | "crear" | "codigos" | "historial";

type PromoCode = {
  id: string;
  code: string;
  reward_type: RewardType;
  reward_value: number;
  reward_key: string | null;
  description: string | null;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  active: boolean;
  created_at: string;
};

type ProfileRow = {
  id: string;
  display_name?: string | null;
  username?: string | null;
  points?: number | null;
  games_played?: number | null;
  games_won?: number | null;
  games_lost?: number | null;
  total_points_earned?: number | null;
  best_win_streak?: number | null;
  avatar_key?: string | null;
  frame_key?: string | null;
  created_at?: string | null;
};

type Redemption = {
  id?: string;
  user_id?: string;
  redeemed_at?: string;
  promo_codes?: {
    code?: string;
    reward_type?: string;
    reward_key?: string | null;
    reward_value?: number;
    description?: string | null;
  } | null;
};

type RewardItem = {
  key: string;
  label: string;
  group: string;
  type: "avatar" | "frame";
  image?: string;
  emoji?: string;
};

function getItemImage(item: unknown) {
  if (
    typeof item === "object" &&
    item !== null &&
    "image" in item &&
    typeof item.image === "string"
  ) {
    return item.image;
  }

  return undefined;
}

function getItemEmoji(item: unknown) {
  if (
    typeof item === "object" &&
    item !== null &&
    "emoji" in item &&
    typeof item.emoji === "string"
  ) {
    return item.emoji;
  }

  return undefined;
}

function formatDate(value?: string | null) {
  if (!value) return "Sin expiración";

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-MX").format(value);
}

function isExpired(value?: string | null) {
  if (!value) return false;
  return new Date(value).getTime() < Date.now();
}

function getNumericValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getProfileName(profile?: ProfileRow) {
  return profile?.display_name || profile?.username || "Jugador sin nombre";
}

function getAvatarPreview(avatarKey?: string | null) {
  const avatar = AVATARS.find((item) => item.key === avatarKey);
  return {
    image: getItemImage(avatar),
    emoji: getItemEmoji(avatar) ?? "🎲",
    label: avatar?.label ?? "Avatar",
  };
}

export default function AdminPage() {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");

  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);

  const [profileStatsError, setProfileStatsError] = useState("");
  const [historyError, setHistoryError] = useState("");

  const [pointsCode, setPointsCode] = useState("");
  const [pointsRewardValue, setPointsRewardValue] = useState(25);
  const [pointsMaxUses, setPointsMaxUses] = useState(1);
  const [pointsExpiresAt, setPointsExpiresAt] = useState("");

  const [itemCode, setItemCode] = useState("");
  const [itemRewardType, setItemRewardType] =
    useState<"avatar" | "frame">("avatar");
  const [selectedRewardKey, setSelectedRewardKey] = useState("");
  const [itemMaxUses, setItemMaxUses] = useState(1);
  const [itemExpiresAt, setItemExpiresAt] = useState("");

  const [message, setMessage] = useState("");

  const avatarRewards = useMemo<RewardItem[]>(
    () =>
      AVATARS.filter((avatar) => avatar.tier !== "basic").map((avatar) => ({
        key: avatar.key,
        label: avatar.label,
        group: avatar.group,
        type: "avatar",
        image: getItemImage(avatar),
        emoji: getItemEmoji(avatar),
      })),
    [],
  );

  const frameRewards = useMemo<RewardItem[]>(
    () =>
      FRAMES.filter((frame) => frame.tier !== "basic").map((frame) => ({
        key: frame.key,
        label: frame.label,
        group: frame.group,
        type: "frame",
        image: getItemImage(frame),
        emoji: "🖼️",
      })),
    [],
  );

  const rewardOptions =
    itemRewardType === "avatar" ? avatarRewards : frameRewards;

  const selectedReward = rewardOptions.find(
    (item) => item.key === selectedRewardKey,
  );

  const profilesById = useMemo(() => {
    const map = new Map<string, ProfileRow>();

    profiles.forEach((profile) => {
      if (profile.id) map.set(profile.id, profile);
    });

    return map;
  }, [profiles]);

  const activeCodes = codes.filter(
    (code) => code.active && !isExpired(code.expires_at),
  ).length;

  const expiredCodes = codes.filter((code) => isExpired(code.expires_at)).length;

  const usedTotal = codes.reduce((total, code) => total + code.used_count, 0);

  const totalPoints = profiles.reduce(
    (total, profile) => total + getNumericValue(profile.points),
    0,
  );

  const historicalPoints = profiles.reduce(
    (total, profile) =>
      total +
      Math.max(
        getNumericValue(profile.total_points_earned),
        getNumericValue(profile.points),
      ),
    0,
  );

  const totalGames = profiles.reduce(
    (total, profile) => total + getNumericValue(profile.games_played),
    0,
  );

  const totalWins = profiles.reduce(
    (total, profile) => total + getNumericValue(profile.games_won),
    0,
  );

  const topProfiles = useMemo(
    () =>
      [...profiles]
        .sort(
          (a, b) =>
            getNumericValue(b.points) - getNumericValue(a.points) ||
            getNumericValue(b.total_points_earned) -
              getNumericValue(a.total_points_earned),
        )
        .slice(0, 8),
    [profiles],
  );

  const topCodes = useMemo(
    () =>
      [...codes]
        .sort((a, b) => b.used_count - a.used_count)
        .slice(0, 6),
    [codes],
  );

  async function loadAdmin() {
    setLoading(true);
    setHistoryError("");
    setProfileStatsError("");

    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;

    if (!userId) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const { data: adminData } = await supabase
      .from("admin_users")
      .select("id")
      .eq("id", userId)
      .single();

    if (!adminData) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    setIsAdmin(true);

    const { data: promoData } = await supabase
      .from("promo_codes")
      .select("*")
      .order("created_at", { ascending: false });

    setCodes((promoData ?? []) as PromoCode[]);

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*");

    if (profileError) {
      setProfileStatsError(
        "No se pudieron cargar estadísticas de usuarios. Revisa permisos/RLS de profiles.",
      );
      setProfiles([]);
    } else {
      setProfiles((profileData ?? []) as ProfileRow[]);
    }

    const { data: redemptionData, error: redemptionError } = await supabase
      .from("promo_redemptions")
      .select(`
        id,
        user_id,
        redeemed_at,
        promo_codes (
          code,
          reward_type,
          reward_key,
          reward_value,
          description
        )
      `)
      .order("redeemed_at", { ascending: false })
      .limit(50);

    if (redemptionError) {
      setHistoryError(
        "No se pudo cargar el historial. Revisa permisos/RLS de promo_redemptions.",
      );
      setRedemptions([]);
    } else {
      setRedemptions((redemptionData ?? []) as Redemption[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadAdmin();
  }, []);

  useEffect(() => {
    setSelectedRewardKey(rewardOptions[0]?.key ?? "");
  }, [itemRewardType, rewardOptions]);

  async function createPointsCode() {
    setMessage("");

    const cleanCode = pointsCode.trim().toUpperCase();

    if (!cleanCode) {
      setMessage("Escribe un código de puntos.");
      return;
    }

    if (pointsRewardValue <= 0) {
      setMessage("La recompensa debe ser mayor a 0 puntos.");
      return;
    }

    if (pointsMaxUses <= 0) {
      setMessage("Los usos máximos deben ser mayores a 0.");
      return;
    }

    const { data: authData } = await supabase.auth.getUser();

    const { error } = await supabase.from("promo_codes").insert({
      code: cleanCode,
      reward_type: "points",
      reward_value: pointsRewardValue,
      reward_key: null,
      description: `${pointsRewardValue} puntos`,
      max_uses: pointsMaxUses,
      expires_at: pointsExpiresAt ? new Date(pointsExpiresAt).toISOString() : null,
      created_by: authData.user?.id,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setPointsCode("");
    setPointsExpiresAt("");
    setMessage("Código de puntos creado correctamente.");
    await loadAdmin();
  }

  async function createItemCode() {
    setMessage("");

    const cleanCode = itemCode.trim().toUpperCase();

    if (!cleanCode) {
      setMessage("Escribe un código para cosmético.");
      return;
    }

    if (!selectedRewardKey) {
      setMessage("Selecciona un avatar o marco.");
      return;
    }

    if (itemMaxUses <= 0) {
      setMessage("Los usos máximos deben ser mayores a 0.");
      return;
    }

    const { data: authData } = await supabase.auth.getUser();

    const { error } = await supabase.from("promo_codes").insert({
      code: cleanCode,
      reward_type: itemRewardType,
      reward_value: 0,
      reward_key: selectedRewardKey,
      description: selectedReward
        ? `${selectedReward.label} · ${selectedReward.group}`
        : selectedRewardKey,
      max_uses: itemMaxUses,
      expires_at: itemExpiresAt ? new Date(itemExpiresAt).toISOString() : null,
      created_by: authData.user?.id,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setItemCode("");
    setItemExpiresAt("");
    setMessage("Código de cosmético creado correctamente.");
    await loadAdmin();
  }

  async function toggleCode(item: PromoCode) {
    await supabase
      .from("promo_codes")
      .update({ active: !item.active })
      .eq("id", item.id);

    await loadAdmin();
  }

  function getRewardText(item: PromoCode) {
    if (item.reward_type === "points") return `${item.reward_value} pts`;
    if (item.reward_type === "avatar") {
      return `Avatar: ${item.description ?? item.reward_key}`;
    }
    if (item.reward_type === "frame") {
      return `Marco: ${item.description ?? item.reward_key}`;
    }

    return item.description ?? "Recompensa";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black p-8 text-white">
        Cargando admin...
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black p-8 text-white">
        <div className="max-w-md rounded-[32px] border border-orange-500/20 bg-zinc-950 p-8 text-center">
          <h1 className="text-3xl font-black">Acceso restringido</h1>
          <p className="mt-3 text-white/60">
            Esta zona es solo para administradores.
          </p>
          <Link
            href="/acceso?next=/admin"
            className="mt-6 inline-flex rounded-2xl bg-orange-500 px-6 py-3 font-black text-black"
          >
            Entrar con cuenta admin
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/"
          className="inline-flex rounded-2xl bg-orange-500 px-5 py-3 font-black text-black hover:bg-orange-400"
        >
          ← Volver
        </Link>

        <header className="mt-8 overflow-hidden rounded-[34px] border border-orange-500/20 bg-zinc-950 p-8 shadow-[0_0_45px_rgba(249,115,22,0.12)]">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-300">
            Zamgel Core
          </p>
          <h1 className="mt-2 text-5xl font-black">Panel Admin</h1>
          <p className="mt-3 text-white/60">
            Control interno de códigos, rewards, usuarios y eventos de La Mesa Familiar.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            <div className="rounded-3xl border border-white/10 bg-black/60 p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">
                Usuarios
              </p>
              <p className="mt-2 text-3xl font-black">
                {formatNumber(profiles.length)}
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/60 p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">
                Códigos
              </p>
              <p className="mt-2 text-3xl font-black">
                {formatNumber(codes.length)}
              </p>
            </div>

            <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200/60">
                Activos
              </p>
              <p className="mt-2 text-3xl font-black text-emerald-200">
                {formatNumber(activeCodes)}
              </p>
            </div>

            <div className="rounded-3xl border border-orange-500/20 bg-orange-500/10 p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-200/60">
                Canjes
              </p>
              <p className="mt-2 text-3xl font-black text-orange-200">
                {formatNumber(usedTotal)}
              </p>
            </div>
          </div>
        </header>

        <div className="mt-8 flex flex-wrap gap-3">
          {[
            ["dashboard", "Dashboard"],
            ["crear", "Crear códigos"],
            ["codigos", "Códigos creados"],
            ["historial", "Historial"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key as AdminTab)}
              className={`rounded-2xl px-5 py-3 text-sm font-black transition ${
                activeTab === key
                  ? "bg-orange-500 text-black"
                  : "border border-white/10 bg-zinc-950 text-white/60 hover:border-orange-500/30 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {message && (
          <p className="mt-6 rounded-2xl border border-orange-500/20 bg-orange-500/10 px-4 py-3 text-orange-200">
            {message}
          </p>
        )}

        {activeTab === "dashboard" && (
          <section className="mt-8 grid gap-8">
            {profileStatsError && (
              <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm font-bold text-yellow-200">
                {profileStatsError}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-[28px] border border-white/10 bg-zinc-950 p-6">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">
                  Puntos actuales
                </p>
                <p className="mt-3 text-4xl font-black text-orange-200">
                  {formatNumber(totalPoints)}
                </p>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-zinc-950 p-6">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">
                  Puntos históricos
                </p>
                <p className="mt-3 text-4xl font-black text-orange-200">
                  {formatNumber(historicalPoints)}
                </p>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-zinc-950 p-6">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">
                  Partidas jugadas
                </p>
                <p className="mt-3 text-4xl font-black text-white">
                  {formatNumber(totalGames)}
                </p>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-zinc-950 p-6">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">
                  Victorias totales
                </p>
                <p className="mt-3 text-4xl font-black text-white">
                  {formatNumber(totalWins)}
                </p>
              </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
              <section className="rounded-[30px] border border-white/10 bg-zinc-950 p-6">
                <h2 className="text-2xl font-black">Top usuarios por puntos</h2>

                <div className="mt-5 grid gap-3">
                  {topProfiles.length === 0 && (
                    <div className="rounded-2xl border border-white/10 bg-black p-5 text-white/50">
                      Todavía no hay usuarios para mostrar.
                    </div>
                  )}

                  {topProfiles.map((profile, index) => {
                    const avatar = getAvatarPreview(profile.avatar_key);

                    return (
                      <div
                        key={profile.id}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black p-4"
                      >
                        <div className="flex min-w-0 items-center gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-orange-500/20 bg-orange-500/10 text-2xl">
                            {avatar.image ? (
                              <img
                                src={avatar.image}
                                alt={avatar.label}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              avatar.emoji
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-black text-white">
                              #{index + 1} · {getProfileName(profile)}
                            </p>
                            <p className="text-xs text-white/40">
                              {formatNumber(getNumericValue(profile.games_played))} partidas · {formatNumber(getNumericValue(profile.games_won))} victorias
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="font-black text-orange-300">
                            {formatNumber(getNumericValue(profile.points))} pts
                          </p>
                          <p className="text-xs text-white/35">
                            Total: {formatNumber(getNumericValue(profile.total_points_earned))}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-[30px] border border-white/10 bg-zinc-950 p-6">
                <h2 className="text-2xl font-black">Top códigos</h2>

                <div className="mt-5 grid gap-3">
                  {topCodes.length === 0 && (
                    <div className="rounded-2xl border border-white/10 bg-black p-5 text-white/50">
                      Todavía no hay códigos.
                    </div>
                  )}

                  {topCodes.map((code) => (
                    <div
                      key={code.id}
                      className="rounded-2xl border border-white/10 bg-black p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-black text-orange-300">{code.code}</p>
                        <p className="rounded-xl bg-orange-500/10 px-3 py-1 text-xs font-black text-orange-200">
                          {formatNumber(code.used_count)}/{formatNumber(code.max_uses)}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-white/40">
                        {getRewardText(code)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-black p-4">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">
                    Códigos expirados
                  </p>
                  <p className="mt-2 text-2xl font-black text-yellow-200">
                    {formatNumber(expiredCodes)}
                  </p>
                </div>
              </section>
            </div>
          </section>
        )}

        {activeTab === "crear" && (
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <section className="rounded-[30px] border border-white/10 bg-zinc-950 p-6">
              <h2 className="text-2xl font-black">Código de puntos</h2>

              <div className="mt-5 grid gap-4">
                <input
                  value={pointsCode}
                  onChange={(e) => setPointsCode(e.target.value)}
                  placeholder="EJ: MESA50"
                  className="rounded-2xl border border-white/10 bg-black px-4 py-3 font-bold uppercase outline-none focus:border-orange-500"
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    value={pointsRewardValue}
                    onChange={(e) => setPointsRewardValue(Number(e.target.value))}
                    type="number"
                    placeholder="Puntos"
                    className="rounded-2xl border border-white/10 bg-black px-4 py-3 font-bold outline-none focus:border-orange-500"
                  />

                  <input
                    value={pointsMaxUses}
                    onChange={(e) => setPointsMaxUses(Number(e.target.value))}
                    type="number"
                    placeholder="Usos máximos"
                    className="rounded-2xl border border-white/10 bg-black px-4 py-3 font-bold outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-[0.18em] text-white/35">
                    Expiración opcional
                  </label>
                  <input
                    value={pointsExpiresAt}
                    onChange={(e) => setPointsExpiresAt(e.target.value)}
                    type="datetime-local"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-4 py-3 font-bold outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={createPointsCode}
                className="mt-5 w-full rounded-2xl bg-orange-500 px-6 py-3 font-black text-black hover:bg-orange-400"
              >
                Crear código de puntos
              </button>
            </section>

            <section className="rounded-[30px] border border-white/10 bg-zinc-950 p-6">
              <h2 className="text-2xl font-black">Código de cosmético</h2>

              <div className="mt-5 grid gap-4">
                <input
                  value={itemCode}
                  onChange={(e) => setItemCode(e.target.value)}
                  placeholder="EJ: DEMONIOVIP"
                  className="rounded-2xl border border-white/10 bg-black px-4 py-3 font-bold uppercase outline-none focus:border-orange-500"
                />

                <select
                  value={itemRewardType}
                  onChange={(e) =>
                    setItemRewardType(e.target.value as "avatar" | "frame")
                  }
                  className="rounded-2xl border border-white/10 bg-black px-4 py-3 font-bold outline-none focus:border-orange-500"
                >
                  <option value="avatar">Avatar</option>
                  <option value="frame">Marco</option>
                </select>

                <select
                  value={selectedRewardKey}
                  onChange={(e) => setSelectedRewardKey(e.target.value)}
                  className="rounded-2xl border border-white/10 bg-black px-4 py-3 font-bold outline-none focus:border-orange-500"
                >
                  {rewardOptions.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.group} · {item.label} · {item.key}
                    </option>
                  ))}
                </select>

                {selectedReward && (
                  <div className="flex items-center gap-4 rounded-3xl border border-orange-500/15 bg-orange-500/10 p-4">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black text-3xl">
                      {selectedReward.image ? (
                        <img
                          src={selectedReward.image}
                          alt={selectedReward.label}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        selectedReward.emoji ?? "🎁"
                      )}
                    </div>

                    <div>
                      <p className="font-black text-white">
                        {selectedReward.label}
                      </p>
                      <p className="text-sm text-white/45">
                        {selectedReward.group} · {selectedReward.key}
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    value={itemMaxUses}
                    onChange={(e) => setItemMaxUses(Number(e.target.value))}
                    type="number"
                    placeholder="Usos máximos"
                    className="rounded-2xl border border-white/10 bg-black px-4 py-3 font-bold outline-none focus:border-orange-500"
                  />

                  <input
                    value={itemExpiresAt}
                    onChange={(e) => setItemExpiresAt(e.target.value)}
                    type="datetime-local"
                    className="rounded-2xl border border-white/10 bg-black px-4 py-3 font-bold outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={createItemCode}
                className="mt-5 w-full rounded-2xl bg-orange-500 px-6 py-3 font-black text-black hover:bg-orange-400"
              >
                Crear código de cosmético
              </button>
            </section>
          </div>
        )}

        {activeTab === "codigos" && (
          <section className="mt-8 rounded-[30px] border border-white/10 bg-zinc-950 p-6">
            <h2 className="text-2xl font-black">Códigos creados</h2>

            <div className="mt-5 grid gap-4">
              {codes.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-black p-5 text-white/50">
                  Todavía no hay códigos creados.
                </div>
              )}

              {codes.map((item) => {
                const expired = isExpired(item.expires_at);

                return (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black p-4"
                  >
                    <div>
                      <p className="text-xl font-black text-orange-300">
                        {item.code}
                      </p>
                      <p className="text-sm text-white/50">
                        {getRewardText(item)} · {item.used_count}/{item.max_uses} usos
                      </p>
                      <p className="mt-1 text-xs text-white/30">
                        Tipo: {item.reward_type}
                        {item.reward_key ? ` · Key: ${item.reward_key}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-white/30">
                        Expira: {formatDate(item.expires_at)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleCode(item)}
                      className={`rounded-2xl px-5 py-3 font-black ${
                        expired
                          ? "bg-yellow-500/15 text-yellow-300"
                          : item.active
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-red-500/15 text-red-300"
                      }`}
                    >
                      {expired ? "Expirado" : item.active ? "Activo" : "Inactivo"}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {activeTab === "historial" && (
          <section className="mt-8 rounded-[30px] border border-white/10 bg-zinc-950 p-6">
            <h2 className="text-2xl font-black">Historial de canjes</h2>

            {historyError && (
              <div className="mt-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm font-bold text-yellow-200">
                {historyError}
              </div>
            )}

            <div className="mt-5 grid gap-4">
              {redemptions.length === 0 && !historyError && (
                <div className="rounded-2xl border border-white/10 bg-black p-5 text-white/50">
                  Todavía no hay canjes registrados.
                </div>
              )}

              {redemptions.map((item, index) => {
                const profile = item.user_id
                  ? profilesById.get(item.user_id)
                  : undefined;
                const avatar = getAvatarPreview(profile?.avatar_key);

                return (
                  <div
                    key={item.id ?? `${item.user_id}-${index}`}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black p-4"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-orange-500/20 bg-orange-500/10 text-2xl">
                        {avatar.image ? (
                          <img
                            src={avatar.image}
                            alt={avatar.label}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          avatar.emoji
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="font-black text-orange-300">
                          {item.promo_codes?.code ?? "Código canjeado"}
                        </p>

                        <p className="mt-1 text-sm text-white/50">
                          Usuario: {profile ? getProfileName(profile) : item.user_id ?? "No disponible"}
                        </p>

                        <p className="mt-1 text-xs text-white/35">
                          Reward: {item.promo_codes?.reward_type ?? "N/A"}
                          {item.promo_codes?.reward_key
                            ? ` · ${item.promo_codes.reward_key}`
                            : ""}
                          {item.promo_codes?.reward_value
                            ? ` · ${item.promo_codes.reward_value} pts`
                            : ""}
                          {item.promo_codes?.description
                            ? ` · ${item.promo_codes.description}`
                            : ""}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-white/30">
                      {formatDate(item.redeemed_at)}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
