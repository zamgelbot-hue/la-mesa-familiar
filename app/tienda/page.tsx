// 📍 Ruta del archivo: app/tienda/page.tsx

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import { createClient } from "@/lib/supabase/client";
import {
  getPlayerIdentity,
  type PlayerIdentity,
} from "@/lib/profile/getPlayerIdentity";
import { AVATARS, FRAMES } from "@/lib/profile/profileCosmetics";

type ShopTab =
  | "destacados"
  | "avatares"
  | "marcos"
  | "efectos"
  | "titulos"
  | "temas";

type ShopItem = {
  key: string;
  label: string;
  group: string;
  tier: string;
  price: number;
  emoji?: string;
  image?: string;
  type: ShopTab;
  description: string;
  status?: "available" | "soon" | "event";
};

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

const EXTRA_ITEMS: ShopItem[] = [
  {
    key: "effect_fire_entry",
    label: "Entrada de fuego",
    group: "Efectos",
    tier: "collection",
    price: 180,
    emoji: "🔥",
    type: "efectos",
    description: "Animación especial al entrar a una sala.",
    status: "soon",
  },
  {
    key: "effect_victory_spark",
    label: "Chispas de victoria",
    group: "Efectos",
    tier: "collection",
    price: 200,
    emoji: "✨",
    type: "efectos",
    description: "Efecto visual cuando ganas una partida.",
    status: "soon",
  },
  {
    key: "title_rey_mesa",
    label: "Rey de la Mesa",
    group: "Títulos",
    tier: "legendary",
    price: 300,
    emoji: "👑",
    type: "titulos",
    description: "Título especial para lucir en tu perfil.",
    status: "soon",
  },
  {
    key: "title_mente_pro",
    label: "Mente Pro",
    group: "Títulos",
    tier: "collection",
    price: 220,
    emoji: "🧠",
    type: "titulos",
    description: "Título para jugadores estratégicos.",
    status: "soon",
  },
  {
    key: "theme_fantasia",
    label: "Tema Fantasía",
    group: "Temas",
    tier: "collection",
    price: 400,
    emoji: "🧙",
    type: "temas",
    description: "Tema visual premium para juegos seleccionados.",
    status: "soon",
  },
  {
    key: "theme_espacio",
    label: "Tema Espacio",
    group: "Temas",
    tier: "collection",
    price: 400,
    emoji: "🚀",
    type: "temas",
    description: "Ambiente espacial para partidas futuras.",
    status: "soon",
  },
];

const SHOP_TABS: { key: ShopTab; label: string; emoji: string }[] = [
  { key: "destacados", label: "Destacados", emoji: "✨" },
  { key: "avatares", label: "Avatares", emoji: "🙂" },
  { key: "marcos", label: "Marcos", emoji: "🖼️" },
  { key: "efectos", label: "Efectos", emoji: "🔥" },
  { key: "titulos", label: "Títulos", emoji: "🏷️" },
  { key: "temas", label: "Temas", emoji: "🎨" },
];

function getTierLabel(tier: string) {
  if (tier === "legendary") return "Legendario";
  if (tier === "collection") return "Colección";
  return "Básico";
}

function getTierClass(tier: string) {
  if (tier === "legendary") {
    return "border-yellow-400/30 bg-yellow-500/10 text-yellow-200";
  }

  if (tier === "collection") {
    return "border-cyan-400/25 bg-cyan-500/10 text-cyan-200";
  }

  return "border-white/10 bg-white/[0.04] text-white/60";
}

function normalizeAvatarItem(
  avatar: (typeof AVATARS)[number],
): ShopItem {
  return {
    key: avatar.key,
    label: avatar.label,
    group: avatar.group,
    tier: avatar.tier,
    price: avatar.price,
    emoji: "emoji" in avatar ? avatar.emoji : undefined,
    image: "image" in avatar ? avatar.image : undefined,
    type: "avatares",
    description: `Avatar de la colección ${avatar.group}.`,
    status: "available",
  };
}

function normalizeFrameItem(
  frame: (typeof FRAMES)[number],
): ShopItem {
  return {
    key: frame.key,
    label: frame.label,
    group: frame.group,
    tier: frame.tier,
    price: frame.price,
    image: "image" in frame ? frame.image : undefined,
    emoji: "🖼️",
    type: "marcos",
    description: `Marco visual de la colección ${frame.group}.`,
    status: "available",
  };
}

export default function TiendaPage() {
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [playerIdentity, setPlayerIdentity] =
    useState<PlayerIdentity | null>(null);

  const [signingOut, setSigningOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] =
    useState<ShopTab>("destacados");

  const [points, setPoints] = useState(0);
  const [ownedAvatars, setOwnedAvatars] = useState<string[]>(
    DEFAULT_OWNED_AVATARS,
  );
  const [ownedFrames, setOwnedFrames] = useState<string[]>(
    DEFAULT_OWNED_FRAMES,
  );

  const [selectedAvatarKey, setSelectedAvatarKey] =
    useState<string | null>(null);
  const [selectedFrameKey, setSelectedFrameKey] =
    useState<string | null>(null);

  const [processingKey, setProcessingKey] =
    useState<string | null>(null);
  const [storeMessage, setStoreMessage] =
    useState<string | null>(null);

  const avatarItems = useMemo(
    () =>
      AVATARS.filter((avatar) => avatar.tier !== "basic").map(
        normalizeAvatarItem,
      ),
    [],
  );

  const frameItems = useMemo(
    () =>
      FRAMES.filter((frame) => frame.tier !== "basic").map(
        normalizeFrameItem,
      ),
    [],
  );

  const allItems = useMemo(
    () => [...avatarItems, ...frameItems, ...EXTRA_ITEMS],
    [avatarItems, frameItems],
  );

  const filteredItems = useMemo(() => {
    if (activeTab === "destacados") {
      return allItems.filter(
        (item) =>
          item.tier === "legendary" ||
          item.group === "Mascotas" ||
          item.status === "soon",
      );
    }

    return allItems.filter((item) => item.type === activeTab);
  }, [activeTab, allItems]);

  useEffect(() => {
    async function loadStore() {
      const identity = await getPlayerIdentity();
      setPlayerIdentity(identity);

      if (identity?.user_id) {
        const { data, error } = await supabase
          .from("profiles")
          .select(
            "points, owned_avatars, owned_frames, avatar_key, frame_key",
          )
          .eq("id", identity.user_id)
          .single();

        if (error) {
          console.error("Error cargando tienda:", error);
        }

        if (data) {
          setPoints(data.points ?? identity.points ?? 0);
          setSelectedAvatarKey(data.avatar_key ?? null);
          setSelectedFrameKey(data.frame_key ?? null);

          setOwnedAvatars(
            Array.from(
              new Set([
                ...DEFAULT_OWNED_AVATARS,
                ...(data.owned_avatars ?? []),
              ]),
            ),
          );

          setOwnedFrames(
            Array.from(
              new Set([
                ...DEFAULT_OWNED_FRAMES,
                ...(data.owned_frames ?? []),
              ]),
            ),
          );
        } else {
          setPoints(identity.points ?? 0);
        }
      }

      setLoading(false);
    }

    void loadStore();
  }, [supabase]);

  const handleSignOut = async () => {
    try {
      setSigningOut(true);

      await supabase.auth.signOut();

      if (typeof window !== "undefined") {
        localStorage.removeItem("lmf:guest-profile");
        sessionStorage.removeItem("lmf:guest-profile");
      }

      setPlayerIdentity(null);
      window.location.href = "/";
    } finally {
      setSigningOut(false);
    }
  };

  const isOwned = (item: ShopItem) => {
    if (item.type === "avatares") {
      return ownedAvatars.includes(item.key);
    }

    if (item.type === "marcos") {
      return ownedFrames.includes(item.key);
    }

    return false;
  };

  const isEquipped = (item: ShopItem) => {
    if (item.type === "avatares") {
      return selectedAvatarKey === item.key;
    }

    if (item.type === "marcos") {
      return selectedFrameKey === item.key;
    }

    return false;
  };

  const handleShopAction = async (item: ShopItem) => {
    setStoreMessage(null);

    if (!playerIdentity?.user_id) {
      window.location.href = "/acceso?next=/tienda";
      return;
    }

    if (item.status === "soon") return;

    if (item.type !== "avatares" && item.type !== "marcos") {
      setStoreMessage("Este tipo de objeto estará disponible pronto.");
      return;
    }

    const owned = isOwned(item);
    const equipped = isEquipped(item);

    if (equipped) {
      setStoreMessage(`${item.label} ya está equipado.`);
      return;
    }

    try {
      setProcessingKey(item.key);

      if (owned) {
        const updatePayload =
          item.type === "avatares"
            ? { avatar_key: item.key }
            : { frame_key: item.key };

        const { error } = await supabase
          .from("profiles")
          .update({
            ...updatePayload,
            updated_at: new Date().toISOString(),
          })
          .eq("id", playerIdentity.user_id);

        if (error) throw error;

        if (item.type === "avatares") {
          setSelectedAvatarKey(item.key);
        } else {
          setSelectedFrameKey(item.key);
        }

        setStoreMessage(`${item.label} equipado correctamente.`);
        return;
      }

      if (points < item.price) {
        setStoreMessage(
          `Te faltan ${item.price - points} puntos para comprar ${item.label}.`,
        );
        return;
      }

      const newPoints = points - item.price;

      if (item.type === "avatares") {
        const newOwnedAvatars = Array.from(
          new Set([...ownedAvatars, item.key]),
        );

        const { error } = await supabase
          .from("profiles")
          .update({
            points: newPoints,
            owned_avatars: newOwnedAvatars,
            avatar_key: item.key,
            updated_at: new Date().toISOString(),
          })
          .eq("id", playerIdentity.user_id);

        if (error) throw error;

        setPoints(newPoints);
        setOwnedAvatars(newOwnedAvatars);
        setSelectedAvatarKey(item.key);
      }

      if (item.type === "marcos") {
        const newOwnedFrames = Array.from(
          new Set([...ownedFrames, item.key]),
        );

        const { error } = await supabase
          .from("profiles")
          .update({
            points: newPoints,
            owned_frames: newOwnedFrames,
            frame_key: item.key,
            updated_at: new Date().toISOString(),
          })
          .eq("id", playerIdentity.user_id);

        if (error) throw error;

        setPoints(newPoints);
        setOwnedFrames(newOwnedFrames);
        setSelectedFrameKey(item.key);
      }

      setStoreMessage(
        `${item.label} comprado y equipado correctamente.`,
      );
    } catch (error) {
      console.error("Error procesando compra:", error);
      setStoreMessage(
        "No se pudo completar la acción. Intenta de nuevo.",
      );
    } finally {
      setProcessingKey(null);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <SiteHeader
        playerIdentity={playerIdentity}
        onSignOut={playerIdentity ? handleSignOut : undefined}
        signingOut={signingOut}
        showHomeButton
        showProfileButton={!!playerIdentity}
        showLoginButton={!playerIdentity}
      />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.20),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.18),transparent_34%)]" />
        <div className="absolute inset-0 bg-black/65" />

        <div className="relative mx-auto max-w-7xl px-6 py-16">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <div className="inline-flex rounded-full border border-orange-500/25 bg-orange-500/10 px-5 py-2 text-sm font-black text-orange-200">
                ✨ Tienda premium
              </div>

              <h1 className="mt-6 max-w-3xl text-5xl font-black leading-tight md:text-7xl">
                Personaliza tu{" "}
                <span className="text-orange-500">
                  mesa familiar
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-lg text-white/70">
                Desbloquea avatares, marcos, efectos, títulos y
                temas para darle identidad a tu perfil y a tus
                partidas.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/crear"
                  className="rounded-2xl bg-orange-500 px-6 py-3 font-black text-black transition hover:bg-orange-400"
                >
                  Crear sala
                </Link>

                <Link
                  href="/perfil?tab=shop"
                  className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 font-black text-white transition hover:bg-white/10"
                >
                  Ver mi colección
                </Link>
              </div>
            </div>

            <div className="rounded-[32px] border border-orange-500/20 bg-zinc-950/80 p-6 shadow-[0_0_45px_rgba(249,115,22,0.12)] backdrop-blur">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-300">
                Tus puntos
              </p>

              <div className="mt-3 flex items-end justify-between gap-4">
                <div>
                  <p className="text-5xl font-black text-orange-400">
                    {loading ? "..." : points}
                  </p>
                  <p className="mt-1 text-sm text-white/50">
                    Puntos disponibles
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-right">
                  <p className="text-2xl">🎁</p>
                  <p className="mt-1 text-xs font-bold text-white/50">
                    Códigos próximamente
                  </p>
                </div>
              </div>

              {storeMessage && (
                <div className="mt-5 rounded-2xl border border-orange-500/25 bg-orange-500/10 px-4 py-3 text-sm font-bold text-orange-100">
                  {storeMessage}
                </div>
              )}

              {!playerIdentity && (
                <Link
                  href="/acceso?next=/tienda"
                  className="mt-5 block rounded-2xl border border-orange-500/20 bg-orange-500/10 px-4 py-3 text-center font-black text-orange-200 hover:bg-orange-500/20"
                >
                  Inicia sesión para guardar compras
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="sticky top-[86px] z-30 -mx-6 border-y border-white/10 bg-black/80 px-6 py-4 backdrop-blur-xl">
          <div className="flex gap-3 overflow-x-auto">
            {SHOP_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`shrink-0 rounded-2xl border px-5 py-3 text-sm font-black transition ${
                  activeTab === tab.key
                    ? "border-orange-500 bg-orange-500 text-black"
                    : "border-white/10 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                {tab.emoji} {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((item) => {
            const owned = isOwned(item);
            const equipped = isEquipped(item);
            const comingSoon = item.status === "soon";
            const processing = processingKey === item.key;

            return (
              <article
                key={item.key}
                className="group overflow-hidden rounded-[30px] border border-white/10 bg-zinc-950 shadow-[0_0_35px_rgba(255,255,255,0.03)] transition hover:-translate-y-1 hover:border-orange-500/35 hover:shadow-[0_0_45px_rgba(249,115,22,0.12)]"
              >
                <div className="relative flex h-48 items-center justify-center overflow-hidden bg-gradient-to-br from-orange-500/20 via-zinc-900 to-violet-500/10">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.14),transparent_45%)]" />

                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.label}
                      className="relative h-32 w-32 object-contain transition group-hover:scale-110"
                    />
                  ) : (
                    <div className="relative text-7xl transition group-hover:scale-110">
                      {item.emoji ?? "✨"}
                    </div>
                  )}

                  <div className="absolute left-4 top-4">
                    <span
                      className={`rounded-full border px-3 py-1 text-[11px] font-black ${getTierClass(
                        item.tier,
                      )}`}
                    >
                      {getTierLabel(item.tier)}
                    </span>
                  </div>

                  {comingSoon && (
                    <div className="absolute right-4 top-4 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-[11px] font-black text-orange-200">
                      Próximamente
                    </div>
                  )}

                  {equipped && (
                    <div className="absolute right-4 top-4 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-[11px] font-black text-orange-200">
                      Equipado
                    </div>
                  )}

                  {!equipped && owned && (
                    <div className="absolute right-4 top-4 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-black text-emerald-200">
                      Tuyo
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
                    {item.group}
                  </p>

                  <h3 className="mt-2 text-xl font-black text-white">
                    {item.label}
                  </h3>

                  <p className="mt-2 min-h-[44px] text-sm text-white/55">
                    {item.description}
                  </p>

                  <div className="mt-5 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-white/40">
                        Precio
                      </p>
                      <p className="text-lg font-black text-orange-400">
                        {owned ? "Comprado" : `${item.price} pts`}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={comingSoon || processing}
                      onClick={() => handleShopAction(item)}
                      className={`rounded-2xl px-4 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        equipped
                          ? "border border-orange-500/25 bg-orange-500/10 text-orange-200"
                          : owned
                            ? "border border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
                            : comingSoon
                              ? "border border-white/10 bg-white/5 text-white/40"
                              : "bg-orange-500 text-black hover:bg-orange-400"
                      }`}
                    >
                      {processing
                        ? "Procesando..."
                        : equipped
                          ? "Equipado"
                          : owned
                            ? "Equipar"
                            : comingSoon
                              ? "Muy pronto"
                              : "Comprar"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}