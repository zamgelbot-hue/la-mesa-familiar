// 📍 Ruta del archivo: app/admin/page.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AVATARS, FRAMES } from "@/lib/profile/profileCosmetics";

type RewardType = "points" | "avatar" | "frame";

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

export default function AdminPage() {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [codes, setCodes] = useState<PromoCode[]>([]);

  const [pointsCode, setPointsCode] = useState("");
  const [pointsRewardValue, setPointsRewardValue] = useState(25);
  const [pointsMaxUses, setPointsMaxUses] = useState(1);

  const [itemCode, setItemCode] = useState("");
  const [itemRewardType, setItemRewardType] =
    useState<"avatar" | "frame">("avatar");
  const [selectedRewardKey, setSelectedRewardKey] = useState("");
  const [itemMaxUses, setItemMaxUses] = useState(1);

  const [message, setMessage] = useState("");

  const avatarRewards = useMemo<RewardItem[]>(
    () =>
      AVATARS.filter((avatar) => avatar.tier !== "basic").map(
        (avatar) => ({
          key: avatar.key,
          label: avatar.label,
          group: avatar.group,
          type: "avatar",
          image: getItemImage(avatar),
          emoji: getItemEmoji(avatar),
        }),
      ),
    [],
  );

  const frameRewards = useMemo<RewardItem[]>(
    () =>
      FRAMES.filter((frame) => frame.tier !== "basic").map(
        (frame) => ({
          key: frame.key,
          label: frame.label,
          group: frame.group,
          type: "frame",
          image: getItemImage(frame),
          emoji: "🖼️",
        }),
      ),
    [],
  );

  const rewardOptions =
    itemRewardType === "avatar" ? avatarRewards : frameRewards;

  async function loadAdmin() {
    setLoading(true);

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
      created_by: authData.user?.id,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setPointsCode("");
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

    const selectedItem = rewardOptions.find(
      (item) => item.key === selectedRewardKey,
    );

    const { data: authData } = await supabase.auth.getUser();

    const { error } = await supabase.from("promo_codes").insert({
      code: cleanCode,
      reward_type: itemRewardType,
      reward_value: 0,
      reward_key: selectedRewardKey,
      description: selectedItem
        ? `${selectedItem.label} · ${selectedItem.group}`
        : selectedRewardKey,
      max_uses: itemMaxUses,
      created_by: authData.user?.id,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setItemCode("");
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
    if (item.reward_type === "points") {
      return `${item.reward_value} pts`;
    }

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

        <header className="mt-8 rounded-[34px] border border-orange-500/20 bg-zinc-950 p-8 shadow-[0_0_45px_rgba(249,115,22,0.12)]">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-300">
            Zamgel Core
          </p>
          <h1 className="mt-2 text-5xl font-black">
            Panel Admin
          </h1>
          <p className="mt-3 text-white/60">
            Control interno de La Mesa Familiar.
          </p>
        </header>

        <section className="mt-8 rounded-[30px] border border-white/10 bg-zinc-950 p-6">
          <h2 className="text-2xl font-black">
            Crear código promocional de puntos
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <input
              value={pointsCode}
              onChange={(e) => setPointsCode(e.target.value)}
              placeholder="EJ: MESA50"
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 font-bold uppercase outline-none focus:border-orange-500"
            />

            <input
              value={pointsRewardValue}
              onChange={(e) =>
                setPointsRewardValue(Number(e.target.value))
              }
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

          <button
            onClick={createPointsCode}
            className="mt-5 rounded-2xl bg-orange-500 px-6 py-3 font-black text-black hover:bg-orange-400"
          >
            Crear código de puntos
          </button>
        </section>

        <section className="mt-8 rounded-[30px] border border-white/10 bg-zinc-950 p-6">
          <h2 className="text-2xl font-black">
            Crear código promocional de cosmético
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-[0.8fr_1.4fr_0.8fr]">
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

            <input
              value={itemMaxUses}
              onChange={(e) => setItemMaxUses(Number(e.target.value))}
              type="number"
              placeholder="Usos máximos"
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 font-bold outline-none focus:border-orange-500"
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
            <input
              value={itemCode}
              onChange={(e) => setItemCode(e.target.value)}
              placeholder="EJ: DEMONIOVIP"
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 font-bold uppercase outline-none focus:border-orange-500"
            />

            <button
              onClick={createItemCode}
              className="rounded-2xl bg-orange-500 px-6 py-3 font-black text-black hover:bg-orange-400"
            >
              Crear código de cosmético
            </button>
          </div>

          <p className="mt-4 text-sm text-white/45">
            Este selector se alimenta automáticamente de los avatares y marcos
            disponibles en la tienda.
          </p>
        </section>

        {message && (
          <p className="mt-6 rounded-2xl border border-orange-500/20 bg-orange-500/10 px-4 py-3 text-orange-200">
            {message}
          </p>
        )}

        <section className="mt-8 rounded-[30px] border border-white/10 bg-zinc-950 p-6">
          <h2 className="text-2xl font-black">Códigos creados</h2>

          <div className="mt-5 grid gap-4">
            {codes.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-black p-5 text-white/50">
                Todavía no hay códigos creados.
              </div>
            )}

            {codes.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black p-4"
              >
                <div>
                  <p className="text-xl font-black text-orange-300">
                    {item.code}
                  </p>
                  <p className="text-sm text-white/50">
                    {getRewardText(item)} · {item.used_count}/{item.max_uses}{" "}
                    usos
                  </p>
                  <p className="mt-1 text-xs text-white/30">
                    Tipo: {item.reward_type}
                    {item.reward_key ? ` · Key: ${item.reward_key}` : ""}
                  </p>
                </div>

                <button
                  onClick={() => toggleCode(item)}
                  className={`rounded-2xl px-5 py-3 font-black ${
                    item.active
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-red-500/15 text-red-300"
                  }`}
                >
                  {item.active ? "Activo" : "Inactivo"}
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}