// 📍 Ruta del archivo: app/tutoriales/page.tsx

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import { createClient } from "@/lib/supabase/client";
import {
  getPlayerIdentity,
  type PlayerIdentity,
} from "@/lib/profile/getPlayerIdentity";

const tutorialSections = [
  {
    title: "Primeros pasos",
    description:
      "Aprende lo básico para comenzar en La Mesa Familiar.",
    tutorials: [
      "Cómo crear una cuenta",
      "Cómo jugar como invitado",
      "Cómo personalizar tu perfil",
      "Cómo cambiar avatar y marco",
    ],
    color: "from-orange-500/20 to-orange-900/5",
  },
  {
    title: "Salas y multiplayer",
    description:
      "Todo sobre crear salas, compartir códigos y jugar con amigos.",
    tutorials: [
      "Cómo crear una sala",
      "Salas públicas vs privadas",
      "Cómo compartir código",
      "Cómo invitar amigos",
    ],
    color: "from-cyan-500/20 to-cyan-900/5",
  },
  {
    title: "Juegos",
    description:
      "Aprende las reglas y mecánicas de cada juego.",
    tutorials: [
      "Cómo jugar PPT",
      "Cómo jugar Guerra Total",
      "Cómo jugar Pregunta Pregunta",
      "Cómo jugar Personaje Secreto",
    ],
    color: "from-violet-500/20 to-violet-900/5",
  },
  {
    title: "Sistema y ajustes",
    description:
      "Configura sonidos, efectos y futuras opciones del sistema.",
    tutorials: [
      "Cómo desactivar sonidos",
      "Cómo funcionan los efectos",
      "Cómo usar ajustes",
      "Cómo mejorar tu experiencia",
    ],
    color: "from-emerald-500/20 to-emerald-900/5",
  },
];

export default function TutorialesPage() {
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [playerIdentity, setPlayerIdentity] =
    useState<PlayerIdentity | null>(null);

  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    async function loadIdentity() {
      const identity = await getPlayerIdentity();
      setPlayerIdentity(identity);
    }

    void loadIdentity();
  }, []);

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

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex rounded-full border border-orange-500/20 bg-orange-500/10 px-5 py-2 text-sm font-bold text-orange-200">
            📘 Centro de ayuda
          </div>

          <h1 className="mt-6 text-5xl font-black leading-tight">
            Tutoriales y guías de{" "}
            <span className="text-orange-500">
              La Mesa Familiar
            </span>
          </h1>

          <p className="mt-6 text-lg text-white/70">
            Aprende a jugar, crear salas, personalizar tu perfil
            y dominar todas las funciones de la plataforma.
          </p>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-2">
          {tutorialSections.map((section) => (
            <div
              key={section.title}
              className={`rounded-[32px] border border-white/10 bg-gradient-to-br ${section.color} p-8 shadow-[0_0_50px_rgba(249,115,22,0.08)]`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-200">
                    Tutoriales
                  </p>

                  <h2 className="mt-3 text-3xl font-black">
                    {section.title}
                  </h2>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm font-bold text-orange-300">
                  {section.tutorials.length} guías
                </div>
              </div>

              <p className="mt-5 text-white/70">
                {section.description}
              </p>

              <div className="mt-8 space-y-3">
                {section.tutorials.map((tutorial) => (
                  <button
                    key={tutorial}
                    className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-left transition hover:border-orange-500/30 hover:bg-black/50"
                  >
                    <span className="font-semibold">
                      {tutorial}
                    </span>

                    <span className="text-orange-400">
                      →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-[36px] border border-orange-500/20 bg-orange-500/10 p-10 text-center">
          <h2 className="text-3xl font-black">
            ¿Listo para jugar?
          </h2>

          <p className="mt-4 text-white/70">
            Crea una sala y comienza una nueva partida
            con tus amigos o familia.
          </p>

          <Link
            href="/crear"
            className="mt-8 inline-flex rounded-2xl bg-orange-500 px-8 py-4 text-lg font-black text-black transition hover:bg-orange-400"
          >
            + Crear sala
          </Link>
        </div>
      </section>
    </main>
  );
}