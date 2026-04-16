"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getPlayerIdentity, type PlayerIdentity } from "@/lib/getPlayerIdentity";

export default function PerfilPage() {
  const supabase = createClient();

  const [playerIdentity, setPlayerIdentity] = useState<PlayerIdentity | null>(null);
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const identity = await getPlayerIdentity();
      setPlayerIdentity(identity);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      setEmail(user?.email ?? "");
      setLoading(false);
    };

    load();
  }, [supabase]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto max-w-5xl rounded-[34px] border border-white/10 bg-zinc-950/90 p-10 text-center">
          <p className="text-3xl font-bold">Cargando perfil...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="mb-6 inline-flex rounded-2xl bg-orange-500 px-5 py-3 font-bold text-black transition hover:bg-orange-400"
        >
          ← Volver
        </Link>

        <div className="rounded-[34px] border border-orange-500/15 bg-zinc-950/90 p-8 shadow-[0_0_40px_rgba(249,115,22,0.05)] md:p-10">
          <div className="mb-6 inline-flex rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-2 text-sm text-orange-200">
            Perfil
          </div>

          <h1 className="text-4xl font-extrabold md:text-6xl">Tu perfil</h1>
          <p className="mt-4 text-lg text-white/70">
            Esta es la base de tu zona personal. Más adelante aquí podrán vivir tus puntos,
            historial de partidas y estadísticas.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-sm uppercase tracking-[0.18em] text-white/50">Nombre</p>
              <p className="mt-3 text-3xl font-extrabold">
                {playerIdentity?.name ?? "Sin identidad"}
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-sm uppercase tracking-[0.18em] text-white/50">Tipo de cuenta</p>
              <p className="mt-3 text-3xl font-extrabold">
                {playerIdentity?.is_guest ? "Invitado" : "Registrado"}
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:col-span-2">
              <p className="text-sm uppercase tracking-[0.18em] text-white/50">Correo</p>
              <p className="mt-3 text-2xl font-bold">{email || "No disponible para invitado"}</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
