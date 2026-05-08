// 📍 Ruta del archivo: components/settings/SettingsModal.tsx

"use client";

import {
  DEFAULT_AUDIO_SETTINGS,
  getAudioSettings,
  saveAudioSettings,
  type LmfAudioSettings,
} from "@/lib/audio/audioSettings";
import { createClient } from "@/lib/supabase/client";
import {
  KeyRound,
  LockKeyhole,
  Mail,
  Music,
  ShieldCheck,
  Sparkles,
  User,
  Volume2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function SettingsModal({ open, onClose }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [settings, setSettings] = useState<LmfAudioSettings>(
    DEFAULT_AUDIO_SETTINGS,
  );

  const [loadingUser, setLoadingUser] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [sendingRecovery, setSendingRecovery] = useState(false);

  const [accountMessage, setAccountMessage] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setSettings(getAudioSettings());
    setAccountMessage(null);
    setAccountError(null);

    async function loadUser() {
      setLoadingUser(true);

      const { data } = await supabase.auth.getUser();
      const email = data.user?.email ?? "";

      setUserEmail(email);
      setNewEmail(email);
      setRecoveryEmail(email);

      setLoadingUser(false);
    }

    void loadUser();
  }, [open, supabase]);

  if (!open) return null;

  const hasSession = !!userEmail;

  const updateSetting = (key: keyof LmfAudioSettings) => {
    const next = {
      ...settings,
      [key]: !settings[key],
    };

    setSettings(next);
    saveAudioSettings(next);
  };

  const handleGoToProfile = () => {
    onClose();
    router.push("/perfil");
  };

  const handleGoToAccount = () => {
    onClose();
    router.push("/acceso?next=/");
  };

  const handleUpdateEmail = async () => {
    setAccountMessage(null);
    setAccountError(null);

    const cleanEmail = newEmail.trim().toLowerCase();

    if (!cleanEmail) {
      setAccountError("Escribe un correo válido.");
      return;
    }

    if (cleanEmail === userEmail) {
      setAccountError("Ese correo ya está en tu cuenta.");
      return;
    }

    try {
      setSavingEmail(true);

      const { error } = await supabase.auth.updateUser({
        email: cleanEmail,
      });

      if (error) throw error;

      setAccountMessage(
        "Te enviamos un correo de confirmación. Revisa tu inbox para completar el cambio.",
      );
    } catch (error) {
      console.error("Error actualizando correo:", error);
      setAccountError("No se pudo actualizar el correo. Intenta de nuevo.");
    } finally {
      setSavingEmail(false);
    }
  };

  const handleUpdatePassword = async () => {
    setAccountMessage(null);
    setAccountError(null);

    if (newPassword.length < 6) {
      setAccountError("La contraseña debe tener mínimo 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setAccountError("Las contraseñas no coinciden.");
      return;
    }

    try {
      setSavingPassword(true);

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setNewPassword("");
      setConfirmPassword("");
      setAccountMessage("Contraseña actualizada correctamente.");
    } catch (error) {
      console.error("Error actualizando contraseña:", error);
      setAccountError("No se pudo actualizar la contraseña.");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSendRecovery = async () => {
    setAccountMessage(null);
    setAccountError(null);

    const email = recoveryEmail.trim().toLowerCase();

    if (!email) {
      setAccountError("Escribe el correo de tu cuenta.");
      return;
    }

    try {
      setSendingRecovery(true);

      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/acceso?mode=recovery`
          : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) throw error;

      setAccountMessage(
        "Te enviamos un correo para recuperar tu contraseña.",
      );
    } catch (error) {
      console.error("Error enviando recuperación:", error);
      setAccountError("No se pudo enviar el correo de recuperación.");
    } finally {
      setSendingRecovery(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 px-4 py-8 backdrop-blur-md">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[34px] border border-orange-500/20 bg-zinc-950 shadow-[0_0_70px_rgba(249,115,22,0.20)]">
        <div className="sticky top-0 z-10 border-b border-white/10 bg-zinc-950/95 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">
                Configuración
              </p>

              <h2 className="mt-2 text-3xl font-black text-white">
                ⚙️ Ajustes
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-6 p-6">
          <SettingsSection
            icon={<Volume2 className="h-5 w-5" />}
            title="Audio"
            description="Controla la música, sonidos y efectos de la plataforma."
          >
            <div className="grid gap-3 md:grid-cols-3">
              <ToggleCard
                icon={<Music className="h-5 w-5" />}
                title="Música"
                description="Música global."
                enabled={settings.musicEnabled}
                onClick={() => updateSetting("musicEnabled")}
              />

              <ToggleCard
                icon={<Volume2 className="h-5 w-5" />}
                title="Sonidos"
                description="Botones y avisos."
                enabled={settings.soundEnabled}
                onClick={() => updateSetting("soundEnabled")}
              />

              <ToggleCard
                icon={<Sparkles className="h-5 w-5" />}
                title="Efectos"
                description="Animaciones y FX."
                enabled={settings.effectsEnabled}
                onClick={() => updateSetting("effectsEnabled")}
              />
            </div>
          </SettingsSection>

          <SettingsSection
            icon={<User className="h-5 w-5" />}
            title="Cuenta"
            description="Administra tu perfil, correo y contraseña."
          >
            {loadingUser ? (
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-white/60">
                Cargando cuenta...
              </div>
            ) : hasSession ? (
              <div className="grid gap-4">
                <div className="rounded-3xl border border-orange-500/20 bg-orange-500/10 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
                    Cuenta activa
                  </p>
                  <p className="mt-2 break-all text-lg font-black text-white">
                    {userEmail}
                  </p>

                  <button
                    type="button"
                    onClick={handleGoToProfile}
                    className="mt-4 rounded-2xl bg-orange-500 px-5 py-3 font-black text-black transition hover:bg-orange-400"
                  >
                    Ir a mi perfil
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <ActionCard
                    icon={<Mail className="h-5 w-5" />}
                    title="Cambiar correo"
                    description="Supabase enviará confirmación al nuevo correo."
                  >
                    <input
                      value={newEmail}
                      onChange={(event) => setNewEmail(event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 font-bold text-white outline-none focus:border-orange-500"
                      placeholder="nuevo@correo.com"
                      type="email"
                    />

                    <button
                      type="button"
                      disabled={savingEmail}
                      onClick={handleUpdateEmail}
                      className="mt-3 w-full rounded-2xl bg-orange-500 px-4 py-3 font-black text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingEmail ? "Enviando..." : "Actualizar correo"}
                    </button>
                  </ActionCard>

                  <ActionCard
                    icon={<LockKeyhole className="h-5 w-5" />}
                    title="Cambiar contraseña"
                    description="Actualiza tu contraseña desde tu sesión actual."
                  >
                    <input
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 font-bold text-white outline-none focus:border-orange-500"
                      placeholder="Nueva contraseña"
                      type="password"
                    />

                    <input
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      className="mt-3 w-full rounded-2xl border border-white/10 bg-black px-4 py-3 font-bold text-white outline-none focus:border-orange-500"
                      placeholder="Confirmar contraseña"
                      type="password"
                    />

                    <button
                      type="button"
                      disabled={savingPassword}
                      onClick={handleUpdatePassword}
                      className="mt-3 w-full rounded-2xl bg-orange-500 px-4 py-3 font-black text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingPassword ? "Guardando..." : "Cambiar contraseña"}
                    </button>
                  </ActionCard>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-orange-500/20 bg-orange-500/10 p-5">
                <p className="text-lg font-black text-white">
                  No has iniciado sesión
                </p>
                <p className="mt-2 text-sm text-white/60">
                  Entra con tu cuenta para cambiar correo, contraseña y guardar
                  tus compras.
                </p>

                <button
                  type="button"
                  onClick={handleGoToAccount}
                  className="mt-4 rounded-2xl bg-orange-500 px-5 py-3 font-black text-black transition hover:bg-orange-400"
                >
                  Cuenta
                </button>
              </div>
            )}
          </SettingsSection>

          <SettingsSection
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Seguridad"
            description="Recupera acceso a tu cuenta por correo."
          >
            <ActionCard
              icon={<KeyRound className="h-5 w-5" />}
              title="Recuperar contraseña"
              description="Te enviaremos un enlace para crear una nueva contraseña."
            >
              <input
                value={recoveryEmail}
                onChange={(event) => setRecoveryEmail(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 font-bold text-white outline-none focus:border-orange-500"
                placeholder="correo@ejemplo.com"
                type="email"
              />

              <button
                type="button"
                disabled={sendingRecovery}
                onClick={handleSendRecovery}
                className="mt-3 w-full rounded-2xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 font-black text-orange-200 transition hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sendingRecovery ? "Enviando..." : "Enviar correo"}
              </button>
            </ActionCard>
          </SettingsSection>

          {(accountMessage || accountError) && (
            <div
              className={`rounded-3xl border p-5 text-sm font-bold ${
                accountError
                  ? "border-red-500/25 bg-red-500/10 text-red-200"
                  : "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
              }`}
            >
              {accountError ?? accountMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsSection({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[30px] border border-white/10 bg-white/[0.035] p-5">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-300">
          {icon}
        </div>

        <div>
          <h3 className="text-xl font-black text-white">{title}</h3>
          <p className="mt-1 text-sm text-white/50">{description}</p>
        </div>
      </div>

      {children}
    </section>
  );
}

function ActionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/45 p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="mt-0.5 text-orange-300">{icon}</div>

        <div>
          <p className="font-black text-white">{title}</p>
          <p className="mt-1 text-sm text-white/45">{description}</p>
        </div>
      </div>

      {children}
    </div>
  );
}

function ToggleCard({
  icon,
  title,
  description,
  enabled,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[24px] border border-white/10 bg-black/45 p-4 text-left transition hover:border-orange-500/25 hover:bg-orange-500/10"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-orange-300">{icon}</div>

        <div
          className={`rounded-full px-3 py-1 text-xs font-black ${
            enabled
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-red-500/15 text-red-300"
          }`}
        >
          {enabled ? "ON" : "OFF"}
        </div>
      </div>

      <p className="mt-4 font-black text-white">{title}</p>
      <p className="mt-1 text-sm text-white/50">{description}</p>
    </button>
  );
}