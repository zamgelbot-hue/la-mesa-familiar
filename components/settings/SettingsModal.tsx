// 📍 Ruta del archivo: components/settings/SettingsModal.tsx

"use client";

import {
  DEFAULT_AUDIO_SETTINGS,
  getAudioSettings,
  saveAudioSettings,
  type LmfAudioSettings,
} from "@/lib/audio/audioSettings";
import { Music, Sparkles, Volume2, X } from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function SettingsModal({ open, onClose }: Props) {
  const [settings, setSettings] = useState<LmfAudioSettings>(
    DEFAULT_AUDIO_SETTINGS,
  );

  useEffect(() => {
    if (!open) return;

    setSettings(getAudioSettings());
  }, [open]);

  if (!open) return null;

  const updateSetting = (key: keyof LmfAudioSettings) => {
    const next = {
      ...settings,
      [key]: !settings[key],
    };

    setSettings(next);
    saveAudioSettings(next);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[32px] border border-orange-500/20 bg-zinc-950 p-6 shadow-[0_0_50px_rgba(249,115,22,0.18)]">
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

        <div className="mt-6 space-y-3">
          <ToggleCard
            icon={<Music className="h-5 w-5" />}
            title="Música"
            description="Controla la música global del sistema."
            enabled={settings.musicEnabled}
            onClick={() => updateSetting("musicEnabled")}
          />

          <ToggleCard
            icon={<Volume2 className="h-5 w-5" />}
            title="Sonidos"
            description="Respuestas, botones y notificaciones."
            enabled={settings.soundEnabled}
            onClick={() => updateSetting("soundEnabled")}
          />

          <ToggleCard
            icon={<Sparkles className="h-5 w-5" />}
            title="Efectos"
            description="Explosiones, animaciones y FX."
            enabled={settings.effectsEnabled}
            onClick={() => updateSetting("effectsEnabled")}
          />
        </div>
      </div>
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
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-[24px] border border-white/10 bg-white/[0.04] p-4 text-left transition hover:bg-white/[0.08]"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-orange-300">{icon}</div>

        <div>
          <p className="font-black text-white">{title}</p>

          <p className="mt-1 text-sm text-white/50">{description}</p>
        </div>
      </div>

      <div
        className={`rounded-full px-3 py-1 text-xs font-black ${
          enabled
            ? "bg-emerald-500/15 text-emerald-300"
            : "bg-red-500/15 text-red-300"
        }`}
      >
        {enabled ? "ON" : "OFF"}
      </div>
    </button>
  );
}