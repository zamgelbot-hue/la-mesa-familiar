"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AccessMode = "login" | "register" | "guest";

const GUEST_STORAGE_KEY = "lmf:guest-profile";

export default function AccesoPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<AccessMode>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [guestName, setGuestName] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const title = useMemo(() => {
    if (mode === "login") return "Inicia sesión";
    if (mode === "register") return "Crea tu cuenta";
    return "Continúa como invitado";
  }, [mode]);

  const subtitle = useMemo(() => {
    if (mode === "login") {
      return "Accede con tu cuenta para guardar progreso y preparar el sistema de puntos.";
    }
    if (mode === "register") {
      return "Crea tu cuenta con un nombre visible para tener identidad fija dentro de La Mesa Familiar.";
    }
    return "Entra rápido con un nombre temporal. Los invitados podrán jugar, pero no acumularán puntos permanentes.";
  }, [mode]);

  const resetFeedback = () => {
    setMessage("");
    setErrorMessage("");
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    resetFeedback();

    if (!email.trim() || !password.trim()) {
      setErrorMessage("Escribe tu correo y contraseña.");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setMessage("Sesión iniciada correctamente.");
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    resetFeedback();

    const normalizedEmail = email.trim();
    const normalizedDisplayName = displayName.trim();

    if (!normalizedDisplayName) {
      setErrorMessage("Escribe un nombre visible.");
      return;
    }

    if (normalizedDisplayName.length < 2) {
      setErrorMessage("El nombre visible debe tener al menos 2 caracteres.");
      return;
    }

    if (!normalizedEmail || !password.trim()) {
      setErrorMessage("Escribe tu correo y contraseña.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            display_name: normalizedDisplayName,
          },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      const userId = data.user?.id;

      if (userId) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            display_name: normalizedDisplayName,
            avatar_key: "avatar_sun",
            frame_key: "frame_orange",
          })
          .eq("id", userId);

        if (profileError) {
          console.error("Error actualizando perfil tras registro:", profileError);
        }
      }

      setMessage(
        "Cuenta creada correctamente. Revisa tu correo para verificarla si es necesario."
      );
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async (e: FormEvent) => {
    e.preventDefault();
    resetFeedback();

    const normalized = guestName.trim();

    if (!normalized) {
      setErrorMessage("Escribe un nombre para entrar como invitado.");
      return;
    }

    if (normalized.length < 2) {
      setErrorMessage("El nombre debe tener al menos 2 caracteres.");
      return;
    }

    if (typeof window !== "undefined") {
      const payload = JSON.stringify({
        type: "guest",
        guestName: normalized,
        savedAt: new Date().toISOString(),
      });

      localStorage.setItem(GUEST_STORAGE_KEY, payload);
      sessionStorage.setItem(GUEST_STORAGE_KEY, payload);
    }

    setMessage("Entraste como invitado.");
    router.push("/");
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/"
          className="mb-6 inline-flex rounded-2xl bg-orange-500 px-5 py-3 font-bold text-black transition hover:bg-orange-400"
        >
          ← Volver
        </Link>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[34px] border border-orange-500/15 bg-zinc-950/90 p-8 shadow-[0_0_40px_rgba(249,115,22,0.05)] md:p-10">
            <div className="mb-6 inline-flex rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-2 text-sm text-orange-200">
              Identidad de jugador
            </div>

            <h1 className="text-4xl font-extrabold md:text-6xl">{title}</h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/70">
              {subtitle}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={() => {
                  resetFeedback();
                  setMode("login");
                }}
                className={`rounded-2xl px-5 py-3 font-bold transition ${
                  mode === "login"
                    ? "bg-orange-500 text-black"
                    : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                Iniciar sesión
              </button>

              <button
                onClick={() => {
                  resetFeedback();
                  setMode("register");
                }}
                className={`rounded-2xl px-5 py-3 font-bold transition ${
                  mode === "register"
                    ? "bg-orange-500 text-black"
                    : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                Crear cuenta
              </button>

              <button
                onClick={() => {
                  resetFeedback();
                  setMode("guest");
                }}
                className={`rounded-2xl px-5 py-3 font-bold transition ${
                  mode === "guest"
                    ? "bg-orange-500 text-black"
                    : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                Entrar como invitado
              </button>
            </div>

            <div className="mt-8 rounded-[28px] border border-white/10 bg-black/40 p-6">
              {mode === "login" && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold uppercase tracking-[0.18em] text-white/60">
                      Correo
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="correo@ejemplo.com"
                      className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-500/50"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold uppercase tracking-[0.18em] text-white/60">
                      Contraseña
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Tu contraseña"
                      className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-500/50"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-2xl bg-orange-500 px-5 py-3.5 text-lg font-bold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Entrando..." : "Entrar"}
                  </button>
                </form>
              )}

              {mode === "register" && (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold uppercase tracking-[0.18em] text-white/60">
                      Nombre visible
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Ejemplo: Angel"
                      maxLength={20}
                      className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-500/50"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold uppercase tracking-[0.18em] text-white/60">
                      Correo
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="correo@ejemplo.com"
                      className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-500/50"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold uppercase tracking-[0.18em] text-white/60">
                      Contraseña
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-500/50"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-2xl bg-orange-500 px-5 py-3.5 text-lg font-bold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Creando cuenta..." : "Crear cuenta"}
                  </button>
                </form>
              )}

              {mode === "guest" && (
                <form onSubmit={handleGuest} className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold uppercase tracking-[0.18em] text-white/60">
                      Nombre de invitado
                    </label>
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="Ejemplo: Angel"
                      maxLength={20}
                      className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-500/50"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-2xl bg-orange-500 px-5 py-3.5 text-lg font-bold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Continuar como invitado
                  </button>
                </form>
              )}

              {message && (
                <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-emerald-300">
                  {message}
                </div>
              )}

              {errorMessage && (
                <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-300">
                  {errorMessage}
                </div>
              )}
            </div>
          </section>

          <aside className="rounded-[34px] border border-orange-500/15 bg-zinc-950/90 p-8 shadow-[0_0_40px_rgba(249,115,22,0.05)] md:p-10">
            <h2 className="text-3xl font-extrabold">¿Qué ganas con cuenta?</h2>

            <div className="mt-6 space-y-4">
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-xl font-bold">Identidad fija</p>
                <p className="mt-2 text-white/65">
                  Evita confusiones entre anfitrión e invitado al entrar a sala y juego.
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-xl font-bold">Sistema de puntos</p>
                <p className="mt-2 text-white/65">
                  Lo dejamos preparado para futuras recompensas, progreso e historial.
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-xl font-bold">Avatar y marco</p>
                <p className="mt-2 text-white/65">
                  Desde el perfil podrás elegir avatares y marcos predeterminados para personalizarte.
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-3xl border border-orange-500/15 bg-orange-500/5 p-5">
              <p className="text-sm uppercase tracking-[0.18em] text-orange-300">
                Estado actual
              </p>
              <p className="mt-3 text-white/75">
                En este paso dejamos listo el registro con nombre visible. En el siguiente,
                el perfil ya permitirá elegir avatar y marco predeterminados.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
