type SoundKey =
  | "round_start"
  | "timer_warning"
  | "correct"
  | "wrong"
  | "reveal"
  | "victory";

const SOUND_PATHS: Record<SoundKey, string> = {
  round_start: "/audio/pregunta/round_start.mp3",
  timer_warning: "/audio/pregunta/timer_warning.mp3",
  correct: "/audio/pregunta/correct.mp3",
  wrong: "/audio/pregunta/wrong.mp3",
  reveal: "/audio/pregunta/reveal.mp3",
  victory: "/audio/pregunta/victory.mp3",
};

export function createGameSounds() {
  const cache = new Map<SoundKey, HTMLAudioElement>();

  function getAudio(key: SoundKey) {
    if (!cache.has(key)) {
      const audio = new Audio(SOUND_PATHS[key]);
      audio.volume = 0.7;
      cache.set(key, audio);
    }
    return cache.get(key)!;
  }

  function play(key: SoundKey) {
    const audio = getAudio(key);

    // reinicia si ya estaba sonando
    audio.currentTime = 0;

    audio.play().catch(() => {
      // evitar errores por autoplay policies
    });
  }

  return {
    play,
  };
}
