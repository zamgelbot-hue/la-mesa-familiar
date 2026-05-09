// 📍 Ruta del archivo: app/acceso/page.tsx

"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AccessMode = "login" | "register" | "guest" | "recovery" | "reset";

const GUEST_STORAGE_KEY = "lmf:guest-profile";

function getSafeNextPath(rawNext: string | null) {
  if (!rawNext) return "/";

  try {
    const decoded = decodeURIComponent(rawNext);

    if (!decoded.startsWith("/")) return "/";
    if (decoded.startsWith("//")) return "/";
    if (decoded.startsWith("/acceso")) return "/";

    return decoded;
  } catch {
    return "/";
  }
}

function AccesoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const nextPath = getSafeNextPath(searchParams.get("next"));
  const urlMode = searchParams.get("mode");

  const [mode, setMode] = useState<AccessMode>(
    urlMode === "recovery" ? "reset" : "login",
  );

  const [email, setEmail] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [guestName, setGuestName] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (urlMode === "recovery") {
      setMode("reset");
    }
  }, [urlMode]);

  const title = useMemo(() => {
    if (mode === "login") return "Inicia sesión";
    if (mode === "register") return "Crea tu cuenta";
    if (mode === "guest") return "Continúa como invitado";
    if (mode === "recovery") return "Recupera tu contraseña";
    return "Crea una nueva contraseña";
  }, [mode]);

  const subtitle = useMemo(() => {
    if (mode === "login") {
      return "Accede con tu cuenta para guardar progreso y preparar el sistema de puntos.";
    }
    if (mode === "register") {
      return "Crea tu cuenta con un nombre visible para tener identidad fija dentro de La Mesa Familiar.";
    }
    if (mode === "guest") {
      return "Entra rápido con un nombre temporal. Los invitados podrán jugar, pero no acumularán puntos permanentes.";
    }
    if (mode === "recovery") {
      return "Escribe tu correo y te enviaremos un enlace para cambiar tu contraseña.";
    }
    return "Escribe una contraseña nueva para recuperar el acceso a tu cuenta.";
  }, [mode]);

  const resetFeedback = () => {
    setMessage("");
    setErrorMessage("");
  };

  const finishAccess = () => {
    router.push(nextPath);
    router.refresh();
  };

  const switchMode = (nextMode: AccessMode) => {
    resetFeedback();
    setMode(nextMode);
  };

  const handleResendVerification = async () => {
  resetFeedback();

  const normalizedEmail = (recoveryEmail || email).trim().toLowerCase();

  if (!normalizedEmail) {
    setErrorMessage("Escribe tu correo para reenviar la verificación.");
    return;
  }

  try {
    setLoading(true);

    const appUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://lamesafamiliar.net";

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: normalizedEmail,
      options: {
        emailRedirectTo: `${appUrl}/acceso?mode=login&verified=1`,
      },
    });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setMessage(
      "Te reenviamos el correo de verificación. Revisa tu inbox o spam.",
    );
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

      const appUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://lamesafamiliar.net";

const { data, error } = await supabase.auth.signUp({
  email: normalizedEmail,
  password,
  options: {
    emailRedirectTo: `${appUrl}/acceso?mode=login&verified=1`,
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
  "Cuenta creada. Te enviamos un correo de verificación. Revisa tu inbox o spam antes de iniciar sesión.",
);
setMode("login");
setPassword("");
setDisplayName("");
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
    finishAccess();
  };

  const handleSendRecovery = async (e: FormEvent) => {
    e.preventDefault();
    resetFeedback();

    const normalizedEmail = recoveryEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      setErrorMessage("Escribe el correo de tu cuenta.");
      return;
    }

    try {
      setLoading(true);

      const appUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://lamesafamiliar.net";

const redirectTo = `${appUrl}/auth/callback?next=/acceso?mode=recovery`;

      const { error } = await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        {
          redirectTo,
        },
      );

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setMessage(
        "Te enviamos un correo para recuperar tu contraseña. Revisa tu inbox.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: FormEvent) => {
    e.preventDefault();
    resetFeedback();

    if (newPassword.length < 6) {
      setErrorMessage("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Las contraseñas no coinciden.");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setMessage("Contraseña actualizada correctamente. Ya puedes entrar.");
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        router.push("/acceso");
      }, 1200);
    } finally {
      setLoading(false);
    }
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

            {nextPath !== "/" && mode !== "reset" && (
              <div className="mt-6 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-cyan-200">
                Después de entrar te enviaremos directo a la sala de la invitación.
              </div>
            )}

            {mode !== "reset" && (
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  onClick={() => switchMode("login")}
                  className={`rounded-2xl px-5 py-3 font-bold transition ${
                    mode === "login"
                      ? "bg-orange-500 text-black"
                      : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                  }`}
                >
                  Iniciar sesión
                </button>

                <button
                  onClick={() => switchMode("register")}
                  className={`rounded-2xl px-5 py-3 font-bold transition ${
                    mode === "register"
                      ? "bg-orange-500 text-black"
                      : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                  }`}
                >
                  Crear cuenta
                </button>

                <button
                  onClick={() => switchMode("guest")}
                  className={`rounded-2xl px-5 py-3 font-bold transition ${
                    mode === "guest"
                      ? "bg-orange-500 text-black"
                      : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                  }`}
                >
                  Entrar como invitado
                </button>
              </div>
            )}

            <div className="mt-8 rounded-[28px] border border-white/10 bg-black/40 p-6">
              {mode === "login" && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <FieldLabel label="Correo" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-500/50"
                  />

                  <FieldLabel label="Contraseña" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tu contraseña"
                    className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-500/50"
                  />

                  <button
                    type="button"
                    onClick={() => switchMode("recovery")}
                    className="text-sm font-bold text-orange-300 hover:text-orange-200"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-2xl bg-orange-500 px-5 py-3.5 text-lg font-bold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Entrando..." : "Entrar"}
                  </button>

                  <button
  type="button"
  onClick={() => void handleResendVerification()}
  disabled={loading}
  className="rounded-2xl border border-orange-500/25 bg-orange-500/10 px-4 py-3 text-sm font-black text-orange-200 transition hover:bg-orange-500/20 disabled:opacity-60"
>
  Reenviar correo de verificación
</button>

                </form>
              )}

              {mode === "register" && (
                <form onSubmit={handleRegister} className="space-y-4">
                  <FieldLabel label="Nombre visible" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ejemplo: Angel"
                    maxLength={20}
                    className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-500/50"
                  />

                  <FieldLabel label="Correo" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-500/50"
                  />

                  <FieldLabel label="Contraseña" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-500/50"
                  />

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
                  <FieldLabel label="Nombre de invitado" />
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Ejemplo: Angel"
                    maxLength={20}
                    className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-500/50"
                  />

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-2xl bg-orange-500 px-5 py-3.5 text-lg font-bold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Continuar como invitado
                  </button>
                </form>
              )}

              {mode === "recovery" && (
                <form onSubmit={handleSendRecovery} className="space-y-4">
                  <FieldLabel label="Correo de tu cuenta" />
                  <input
                    type="email"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-500/50"
                  />

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-2xl bg-orange-500 px-5 py-3.5 text-lg font-bold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Enviando..." : "Enviar correo de recuperación"}
                  </button>

                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-bold text-white hover:bg-white/10"
                  >
                    Volver a iniciar sesión
                  </button>
                </form>
              )}

              {mode === "reset" && (
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 px-4 py-3 text-orange-200">
                    Estás actualizando la contraseña de tu cuenta.
                  </div>

                  <FieldLabel label="Nueva contraseña" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-500/50"
                  />

                  <FieldLabel label="Confirmar contraseña" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite tu contraseña"
                    className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-500/50"
                  />

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-2xl bg-orange-500 px-5 py-3.5 text-lg font-bold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Guardando..." : "Guardar nueva contraseña"}
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
              <InfoCard title="Identidad fija">
                Evita confusiones entre anfitrión e invitado al entrar a sala y juego.
              </InfoCard>

              <InfoCard title="Sistema de puntos">
                Guarda tus victorias, partidas jugadas y progreso real.
              </InfoCard>

              <InfoCard title="Avatar y marco">
                Desde el perfil podrás elegir avatares y marcos predeterminados para personalizarte.
              </InfoCard>
            </div>

            <div className="mt-8 rounded-3xl border border-orange-500/15 bg-orange-500/5 p-5">
              <p className="text-sm uppercase tracking-[0.18em] text-orange-300">
                Estado actual
              </p>
              <p className="mt-3 text-white/75">
                Puedes entrar con cuenta o como invitado. Si vienes desde una
                invitación, después te enviaremos directo a esa sala.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function FieldLabel({ label }: { label: string }) {
  return (
    <label className="mb-2 block text-sm font-semibold uppercase tracking-[0.18em] text-white/60">
      {label}
    </label>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-xl font-bold">{title}</p>
      <p className="mt-2 text-white/65">{children}</p>
    </div>
  );
}

export default function AccesoPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-black px-6 py-10 text-white">
          <div className="mx-auto max-w-6xl">
            <div className="rounded-[34px] border border-orange-500/15 bg-zinc-950/90 p-10 text-center shadow-[0_0_40px_rgba(249,115,22,0.05)]">
              <p className="text-2xl font-bold">Cargando acceso...</p>
            </div>
          </div>
        </main>
      }
    >
      <AccesoContent />
    </Suspense>
  );
}