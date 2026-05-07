// 📍 Ruta del archivo: lib/audio/useGameSounds.ts

import {
  areEffectsEnabled,
  areSoundsEnabled,
} from "@/lib/audio/audioSettings";

type SoundKey =
  | "round_start"
  | "timer_warning"
  | "correct"
  | "wrong"
  | "reveal"
  | "victory";

type CreateGameSoundsOptions = {
  baseVolume?: number;
};

const SOUND_PATHS: Record<SoundKey, string> = {
  round_start: "/audio/pregunta/round_start.mp3",
  timer_warning: "/audio/pregunta/timer_warning.mp3",
  correct: "/audio/pregunta/correct.mp3",
  wrong: "/audio/pregunta/wrong.mp3",
  reveal: "/audio/pregunta/reveal.mp3",
  victory: "/audio/pregunta/victory.mp3",
};

const EFFECT_SOUNDS: SoundKey[] = [
  "correct",
  "wrong",
  "reveal",
  "victory",
];

export function createGameSounds(options?: CreateGameSoundsOptions) {
  const cache = new Map<SoundKey, HTMLAudioElement>();
  const baseVolume = options?.baseVolume ?? 0.7;

  function getAudio(key: SoundKey) {
    let audio = cache.get(key);

    if (!audio) {
      audio = new Audio(SOUND_PATHS[key]);
      audio.preload = "auto";
      audio.volume = baseVolume;
      cache.set(key, audio);
    }

    return audio;
  }

  function preloadAll() {
    if (!areSoundsEnabled()) return;

    (Object.keys(SOUND_PATHS) as SoundKey[]).forEach((key) => {
      const audio = getAudio(key);
      audio.load();
    });
  }

  function play(key: SoundKey, volume?: number) {
    if (!areSoundsEnabled()) return;

    const isEffect = EFFECT_SOUNDS.includes(key);

    if (isEffect && !areEffectsEnabled()) {
      return;
    }

    const audio = getAudio(key);

    audio.pause();
    audio.currentTime = 0;
    audio.volume = volume ?? baseVolume;

    void audio.play().catch(() => {});
  }

  function stop(key: SoundKey) {
    const audio = cache.get(key);

    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
  }

  function stopAll() {
    cache.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
  }

  return {
    preloadAll,
    play,
    stop,
    stopAll,
  };
}