// 📍 Ruta del archivo: components/audio/AudioSettingsButton.tsx

"use client";

import { useEffect, useState } from "react";
import { Music, Settings, Sparkles, Volume2, VolumeX } from "lucide-react";
import {
  DEFAULT_AUDIO_SETTINGS,
  getAudioSettings,
  saveAudioSettings,
  type LmfAudioSettings,
} from "@/lib/audio/audioSettings";

export default function AudioSettingsButton() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<LmfAudioSettings>(
    DEFAULT_AUDIO_SETTINGS,
  );

  useEffect(() => {
    setSettings(getAudioSettings());

    const handleStorage = () => {
      setSettings(getAudioSettings());
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("lmf:audio-settings-changed", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("lmf:audio-settings-changed", handleStorage);
    };
  }, []);

  const updateSetting = (key: keyof LmfAudioSettings) => {
    const nextSettings = {
      ...settings,
      [key]: !settings[key],
    };

    setSettings(nextSettings);
    saveAudioSettings(nextSettings);
  };

  const allMuted =
    !settings.musicEnabled &&
    !settings.soundEnabled &&
    !settings.effectsEnabled;

  return (
    <div className="fixed bottom-5 right-5 z-[80]">
      {open && (
        <div className="mb-3 w-[260px] rounded-[26px] border border-orange-500/20 bg-zinc-950/95 p-4 text-white shadow-[0_0_45px_rgba(249,115,22,0.18)] backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-orange-300">
              Audio
            </p>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/60 hover:bg-white/10"
            >
              Cerrar
            </button>
          </div>

          <div className="mt-4 space-y-2">
            <AudioToggleRow
              icon={<Music className="h-4 w-4" />}
              label="Música"
              enabled={settings.musicEnabled}
              onClick={() => updateSetting("musicEnabled")}
            />

            <AudioToggleRow
              icon={<Volume2 className="h-4 w-4" />}
              label="Sonidos"
              enabled={settings.soundEnabled}
              onClick={() => updateSetting("soundEnabled")}
            />

            <AudioToggleRow
              icon={<Sparkles className="h-4 w-4" />}
              label="Efectos"
              enabled={settings.effectsEnabled}
              onClick={() => updateSetting("effectsEnabled")}
            />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-14 w-14 items-center justify-center rounded-full border border-orange-500/30 bg-orange-500 text-black shadow-[0_0_35px_rgba(249,115,22,0.35)] transition hover:scale-105 hover:bg-orange-400"
        aria-label="Ajustes de audio"
      >
        {allMuted ? (
          <VolumeX className="h-6 w-6" />
        ) : open ? (
          <Settings className="h-6 w-6" />
        ) : (
          <Volume2 className="h-6 w-6" />
        )}
      </button>
    </div>
  );
}

function AudioToggleRow({
  icon,
  label,
  enabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  enabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-left transition hover:bg-white/[0.08]"
    >
      <span className="flex items-center gap-2 text-sm font-bold text-white">
        {icon}
        {label}
      </span>

      <span
        className={`rounded-full px-3 py-1 text-xs font-black ${
          enabled
            ? "bg-emerald-500/15 text-emerald-300"
            : "bg-red-500/15 text-red-300"
        }`}
      >
        {enabled ? "ON" : "OFF"}
      </span>
    </button>
  );
}