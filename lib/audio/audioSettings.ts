// 📍 Ruta del archivo: lib/audio/audioSettings.ts

export type LmfAudioSettings = {
  musicEnabled: boolean;
  soundEnabled: boolean;
  effectsEnabled: boolean;
};

export const DEFAULT_AUDIO_SETTINGS: LmfAudioSettings = {
  musicEnabled: true,
  soundEnabled: true,
  effectsEnabled: true,
};

const STORAGE_KEY = "lmf:audio-settings";

export function getAudioSettings(): LmfAudioSettings {
  if (typeof window === "undefined") return DEFAULT_AUDIO_SETTINGS;

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_AUDIO_SETTINGS;

    return {
      ...DEFAULT_AUDIO_SETTINGS,
      ...JSON.parse(saved),
    };
  } catch {
    return DEFAULT_AUDIO_SETTINGS;
  }
}

export function saveAudioSettings(settings: LmfAudioSettings) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(
    new CustomEvent("lmf:audio-settings-changed", {
      detail: settings,
    }),
  );
}

export function areSoundsEnabled() {
  const settings = getAudioSettings();
  return settings.soundEnabled;
}

export function areEffectsEnabled() {
  const settings = getAudioSettings();
  return settings.effectsEnabled;
}

export function isMusicEnabled() {
  const settings = getAudioSettings();
  return settings.musicEnabled;
}