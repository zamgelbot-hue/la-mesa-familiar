"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getPlayerIdentity, type PlayerIdentity } from "@/lib/getPlayerIdentity";

const AVATARS = [
  { key: "avatar_sun", emoji: "🌞", label: "Sol" },
  { key: "avatar_moon", emoji: "🌙", label: "Luna" },
  { key: "avatar_star", emoji: "⭐", label: "Estrella" },
  { key: "avatar_rocket", emoji: "🚀", label: "Cohete" },
  { key: "avatar_game", emoji: "🎮", label: "Gamer" },
  { key: "avatar_guest", emoji: "🙂", label: "Invitado" },
];

const FRAMES = [
  {
    key: "frame_orange",
    label: "Naranja",
    className: "border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.25)]",
  },
  {
    key: "frame_emerald",
    label: "Esmeralda",
    className: "border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.25)]",
  },
  {
    key: "frame_blue",
    label: "Azul",
    className: "border-sky-500 shadow-[0_0_30px_rgba(14,165,233,0.25)]",
  },
  {
    key: "frame_purple",
    label: "Morado",
    className: "border-violet-500 shadow-[0_0_30px_rgba(139,92,246,0.25)]",
  },
  {
    key: "frame_gold",
    label: "Dorado",
    className: "border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.25)]",
  },
  {
    key: "frame_guest",
    label: "Invitado",
    className: "border-white/30 shadow-[0_0_30px_rgba(255,255,255,0.12)]",
  },
];

export default function PerfilPage() {
  const supabase = createClient();

  const [playerIdentity, setPlayerIdentity] = useState<PlayerIdentity | null>(null);
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [avatarKey, setAvatarKey] = useState("avatar_sun");
  const [frameKey, setFrameKey] = useState("frame_orange");

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      const identity = await getPlayerIdentity();
      setPlayerIdentity(identity);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      setEmail(user?.email ?? "");

      if (identity) {
        setDisplayName(identity.name);
        setAvatarKey(identity.avatar_key ?? "avatar_sun");
        setFrameKey(identity.frame_key ?? "frame_orange");
      }

      setLoading(false);
    };

    load();
  }, [supabase]);

  const selectedAvatar = useMemo(
    () => AVATARS.find((avatar) => avatar.key === avatarKey) ?? AVATARS[0],
    [avatarKey]
  );

  const selectedFrame = useMemo(
    () => FRAMES.find((frame) => frame.key === frameKey) ?? FRAMES[0],
    [frameKey]
  );

  const handleSaveProfile = async () => {
    setMessage("");
    setErrorMessage("");

    if (!playerIdentity?.user_id) {
      setErrorMessage("Solo los usuarios registrados pueden editar el perfil por ahora.");
      return;
    }

    const normalizedName = displayName.trim();

    if (!normalizedName) {
      setErrorMessage("Escribe un nombre visible.");
      return;
    }

    if (normalizedName.length < 2) {
      setErrorMessage("El nombre visible debe tener al menos 2 caracteres.");
      return;
    }

    try {
      setSaving(true);

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          display_name: normalizedName,
          avatar_key: avatarKey,
          frame_key: frameKey,
        })
        .eq("id", playerIdentity.user_id);

      if (profileError) {
        setErrorMessage(profileError.message);
        return;
      }

      const { error: authError } = await supabase.auth.updateUser({
        data: {
          display_name: normalizedName,
        },
      });

      if (authError) {
        console.error("Error actualizando metadata de usuario:", authError);
      }

      setMessage("Perfil actualizado correctamente.");

      const refreshedIdentity = await getPlayerIdentity();
      setPlayerIdentity(refreshedIdentity);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto max-w-6xl rounded-[34px] border border-white/10 bg-zinc-950/90 p-10 text-center">
          <p className="text-3xl font-bold">Cargando perfil...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/"
          className="mb-6 inline-flex rounded-2xl bg-orange-500 px-5 py-3 font-bold text-black transition hover:bg-orange-400"
        >
          ← Volver
        </Link>

        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[34px] border border-orange-500/15 bg-zinc-950/90 p-8 shadow-[0_0_40px_rgba(249,115,22,0.05)] md:p-10">
            <div className="mb-6 inline-flex rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-2 text-sm text-orange-200">
              Vista previa de perfil
            </div>

            <div className="flex flex-col items-center text-center">
              <div
                className={`flex h-40 w-40 items-center justify-center rounded-full border-4 bg-black text-6xl ${selectedFrame.className}`}
              >
                <span>{selectedAvatar.emoji}</span>
              </div>

              <h1 className="mt-6 text-4xl font-extrabold">{displayName || "Jugador"}</h1>
              <p className="mt-2 text-white/60">
                {playerIdentity?.is_guest ? "Invitado" : "Usuario registrado"}
              </p>

              <div className="mt-6 grid w-full gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-sm uppercase tracking-[0.18em] text-white/50">Puntos</p>
                  <p className="mt-2 text-3xl font-extrabold">
                    {playerIdentity?.points ?? 0}
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-sm uppercase tracking-[0.18em] text-white/50">Correo</p>
                  <p className="mt-2 text-lg font-bold break-all">
                    {email || "No disponible"}
                  </p>
                </div>
              </div>

              <div className="mt-6 w-full rounded-3xl border border-orange-500/15 bg-orange-500/5 p-5 text-left">
                <p className="text-sm uppercase tracking-[0.18em] text-orange-300">
                  Próxima fase
                </p>
                <p className="mt-2 text-white/70">
                  Más adelante aquí podremos agregar tienda de cosméticos, marcos premium,
                  títulos, insignias y recompensas por puntos.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[34px] border border-orange-500/15 bg-zinc-950/90 p-8 shadow-[0_0_40px_rgba(249,115,22,0.05)] md:p-10">
            <div className="mb-6 inline-flex rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-2 text-sm text-orange-200">
              Personalización básica
            </div>

            {playerIdentity?.is_guest && (
              <div className="mb-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-yellow-300">
                Estás viendo el perfil como invitado. Para guardar cambios permanentes necesitas una cuenta registrada.
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-semibold uppercase tracking-[0.18em] text-white/60">
                  Nombre visible
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={20}
                  className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-500/50"
                />
              </div>

              <div>
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-white/60">
                  Elige un avatar
                </p>

                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
                  {AVATARS.map((avatar) => (
                    <button
                      key={avatar.key}
                      type="button"
                      onClick={() => setAvatarKey(avatar.key)}
                      className={`rounded-2xl border p-4 text-center transition ${
                        avatarKey === avatar.key
                          ? "border-orange-500 bg-orange-500/10"
                          : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                      }`}
                    >
                      <div className="text-3xl">{avatar.emoji}</div>
                      <p className="mt-2 text-sm font-bold">{avatar.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-white/60">
                  Elige un marco
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                  {FRAMES.map((frame) => (
                    <button
                      key={frame.key}
                      type="button"
                      onClick={() => setFrameKey(frame.key)}
                      className={`rounded-2xl border p-4 text-left transition ${
                        frameKey === frame.key
                          ? "border-orange-500 bg-orange-500/10"
                          : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                      }`}
                    >
                      <p className="font-bold">{frame.label}</p>
                      <p className="mt-1 text-sm text-white/60">
                        Marco decorativo para tu perfil
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={saving || !!playerIdentity?.is_guest}
                className="w-full rounded-2xl bg-orange-500 px-5 py-3.5 text-lg font-bold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Guardar perfil"}
              </button>

              {message && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-emerald-300">
                  {message}
                </div>
              )}

              {errorMessage && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-300">
                  {errorMessage}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
