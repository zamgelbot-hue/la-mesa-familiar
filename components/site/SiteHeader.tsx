"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import PlayerAvatar from "@/components/PlayerAvatar";
import { getAvatarByKey, getFrameByKey } from "@/lib/profileCosmetics";
import type { PlayerIdentity } from "@/lib/getPlayerIdentity";

type SiteHeaderProps = {
  playerIdentity?: PlayerIdentity | null;
  onSignOut?: () => void;
  signingOut?: boolean;
  showMainNav?: boolean;
  showHomeButton?: boolean;
  showRankingButton?: boolean;
  showProfileButton?: boolean;
  showStartButton?: boolean;
  showLoginButton?: boolean;
};

export default function SiteHeader({
  playerIdentity = null,
  onSignOut,
  signingOut = false,
  showMainNav = false,
  showHomeButton = false,
  showRankingButton = false,
  showProfileButton = false,
  showStartButton = false,
  showLoginButton = false,
}: SiteHeaderProps) {
  const router = useRouter();

  const selectedAvatar = getAvatarByKey(playerIdentity?.avatar_key);
  const selectedFrame = getFrameByKey(playerIdentity?.frame_key);

  return (
    <header className="sticky top-0 z-50 border-b border-orange-500/10 bg-black/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="shrink-0 transition hover:opacity-90">
            <img
              src="/branding/logo-horizontal.png?v=8"
              alt="La Mesa Familiar"
              className="h-14 w-auto object-contain"
            />
          </Link>

          {showMainNav && (
            <nav className="hidden items-center gap-10 text-white/70 md:flex">
              <a href="#juegos" className="transition hover:text-white">
                Juegos
              </a>
              <a href="#como-funciona" className="transition hover:text-white">
                Cómo funciona
              </a>
              <a href="#funciones" className="transition hover:text-white">
                Funciones
              </a>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-3">
          {showHomeButton && (
            <button
              type="button"
              onClick={() => router.push("/")}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 font-semibold text-white transition hover:bg-white/10"
            >
              Inicio
            </button>
          )}

          {showRankingButton && (
            <button
              type="button"
              onClick={() => router.push("/ranking")}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 font-semibold text-white transition hover:bg-white/10"
            >
              Ranking
            </button>
          )}

          {showLoginButton && (
            <button
              type="button"
              onClick={() => router.push("/acceso")}
              className="hidden rounded-2xl px-4 py-2 font-semibold text-white transition hover:bg-white/5 md:block"
            >
              Iniciar sesión
            </button>
          )}

          {playerIdentity ? (
            <>
              {showProfileButton && (
                <button
                  type="button"
                  onClick={() => router.push("/perfil")}
                  className="hidden items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 font-semibold text-white transition hover:bg-white/10 md:flex"
                >
                  <PlayerAvatar
                    avatar={selectedAvatar}
                    frame={selectedFrame}
                    size="sm"
                  />
                  <span>
                    {playerIdentity.name}{" "}
                    {playerIdentity.is_guest ? "(Invitado)" : ""}
                  </span>
                </button>
              )}

              {onSignOut && (
                <button
                  type="button"
                  onClick={onSignOut}
                  disabled={signingOut}
                  className="rounded-2xl bg-orange-500 px-5 py-2.5 font-bold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {signingOut ? "Saliendo..." : "Cerrar sesión"}
                </button>
              )}
            </>
          ) : (
            <>
              {showStartButton && (
                <button
                  type="button"
                  onClick={() => router.push("/acceso")}
                  className="rounded-2xl bg-orange-500 px-5 py-2.5 font-bold text-black transition hover:bg-orange-400"
                >
                  Empezar
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
