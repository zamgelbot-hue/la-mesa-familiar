// 📍 Ruta del archivo: components/tutorials/TutorialesClient.tsx

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import { createClient } from "@/lib/supabase/client";
import {
  getPlayerIdentity,
  type PlayerIdentity,
} from "@/lib/profile/getPlayerIdentity";
import { tutorialSections } from "@/data/tutorials";
import TutorialHero from "./TutorialHero";
import TutorialCategory from "./TutorialCategory";

export default function TutorialesClient() {
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [playerIdentity, setPlayerIdentity] = useState<PlayerIdentity | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [openGuideId, setOpenGuideId] = useState<string | null>(null);

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

  const handleToggleGuide = (guideId: string) => {
    setOpenGuideId((current) => (current === guideId ? null : guideId));
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

      <section className="mx-auto max-w-7xl px-5 py-12 md:px-6 md:py-16">
        <TutorialHero />

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {tutorialSections.map((section) => (
            <TutorialCategory
              key={section.id}
              section={section}
              openGuideId={openGuideId}
              onToggleGuide={handleToggleGuide}
            />
          ))}
        </div>

        <div className="mt-12 rounded-[36px] border border-orange-500/20 bg-orange-500/10 p-8 text-center md:mt-16 md:p-10">
          <h2 className="text-3xl font-black">¿Listo para jugar?</h2>

          <p className="mt-4 text-white/70">
            Crea una sala y comienza una nueva partida con tus amigos o familia.
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
