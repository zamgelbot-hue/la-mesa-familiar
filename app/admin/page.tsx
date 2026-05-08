// 📍 Ruta del archivo: app/admin/page.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type PromoCode = {
  id: string;
  code: string;
  reward_type: string;
  reward_value: number;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  active: boolean;
  created_at: string;
};

export default function AdminPage() {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [codes, setCodes] = useState<PromoCode[]>([]);

  const [code, setCode] = useState("");
  const [rewardValue, setRewardValue] = useState(25);
  const [maxUses, setMaxUses] = useState(1);
  const [message, setMessage] = useState("");

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

  async function createCode() {
    setMessage("");

    const cleanCode = code.trim().toUpperCase();

    if (!cleanCode) {
      setMessage("Escribe un código.");
      return;
    }

    const { data: authData } = await supabase.auth.getUser();

    const { error } = await supabase.from("promo_codes").insert({
      code: cleanCode,
      reward_type: "points",
      reward_value: rewardValue,
      max_uses: maxUses,
      created_by: authData.user?.id,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setCode("");
    setMessage("Código creado correctamente.");
    await loadAdmin();
  }

  async function toggleCode(item: PromoCode) {
    await supabase
      .from("promo_codes")
      .update({ active: !item.active })
      .eq("id", item.id);

    await loadAdmin();
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
          className="inline-flex rounded-2xl bg-orange-500 px-5 py-3 font-black text-black"
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
          <h2 className="text-2xl font-black">Crear código promocional</h2>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="EJ: MESA50"
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 font-bold uppercase outline-none focus:border-orange-500"
            />

            <input
              value={rewardValue}
              onChange={(e) => setRewardValue(Number(e.target.value))}
              type="number"
              placeholder="Puntos"
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 font-bold outline-none focus:border-orange-500"
            />

            <input
              value={maxUses}
              onChange={(e) => setMaxUses(Number(e.target.value))}
              type="number"
              placeholder="Usos máximos"
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 font-bold outline-none focus:border-orange-500"
            />
          </div>

          <button
            onClick={createCode}
            className="mt-5 rounded-2xl bg-orange-500 px-6 py-3 font-black text-black hover:bg-orange-400"
          >
            Crear código
          </button>

          {message && (
            <p className="mt-4 rounded-2xl border border-orange-500/20 bg-orange-500/10 px-4 py-3 text-orange-200">
              {message}
            </p>
          )}
        </section>

        <section className="mt-8 rounded-[30px] border border-white/10 bg-zinc-950 p-6">
          <h2 className="text-2xl font-black">Códigos creados</h2>

          <div className="mt-5 grid gap-4">
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
                    {item.reward_value} pts · {item.used_count}/{item.max_uses} usos
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