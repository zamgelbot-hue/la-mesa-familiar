let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;

  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioContextClass) return null;

  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }

  return audioCtx;
}

export async function unlockLoteriaAudio() {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      // ignore
    }
  }
}

function playTone({
  frequency,
  duration,
  type = "sine",
  gain = 0.03,
  when = 0,
}: {
  frequency: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  when?: number;
}) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const startAt = ctx.currentTime + when;
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startAt);

  gainNode.gain.setValueAtTime(0.0001, startAt);
  gainNode.gain.exponentialRampToValueAtTime(gain, startAt + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.02);
}

function fallbackStartSound() {
  playTone({ frequency: 392, duration: 0.12, type: "triangle", gain: 0.03, when: 0 });
  playTone({ frequency: 523, duration: 0.16, type: "triangle", gain: 0.035, when: 0.11 });
  playTone({ frequency: 659, duration: 0.22, type: "triangle", gain: 0.04, when: 0.22 });
}

function fallbackCardSound() {
  playTone({ frequency: 440, duration: 0.07, type: "sine", gain: 0.025, when: 0 });
  playTone({ frequency: 554, duration: 0.09, type: "sine", gain: 0.025, when: 0.08 });
}

function fallbackMarkSound() {
  playTone({ frequency: 740, duration: 0.05, type: "square", gain: 0.02, when: 0 });
  playTone({ frequency: 920, duration: 0.06, type: "square", gain: 0.02, when: 0.05 });
}

function fallbackInvalidSound() {
  playTone({ frequency: 280, duration: 0.08, type: "sawtooth", gain: 0.018, when: 0 });
  playTone({ frequency: 240, duration: 0.11, type: "sawtooth", gain: 0.016, when: 0.06 });
}

function fallbackExpiredSound() {
  playTone({ frequency: 320, duration: 0.06, type: "triangle", gain: 0.018, when: 0 });
  playTone({ frequency: 220, duration: 0.12, type: "triangle", gain: 0.018, when: 0.07 });
}

function fallbackWinSound() {
  playTone({ frequency: 523, duration: 0.10, type: "triangle", gain: 0.035, when: 0 });
  playTone({ frequency: 659, duration: 0.12, type: "triangle", gain: 0.035, when: 0.10 });
  playTone({ frequency: 784, duration: 0.15, type: "triangle", gain: 0.04, when: 0.22 });
  playTone({ frequency: 1046, duration: 0.28, type: "triangle", gain: 0.045, when: 0.36 });
}

async function playAudioFile(
  src: string,
  fallback?: () => void
) {
  if (typeof window === "undefined") return;

  try {
    await unlockLoteriaAudio();

    const audio = new Audio(src);
    audio.preload = "auto";
    audio.volume = 1;

    await audio.play();
  } catch {
    fallback?.();
  }
}

export async function playLoteriaStartVoice() {
  await playAudioFile("/audio/loteria/corre_y_se_va_con.mp3", fallbackStartSound);
}

export async function playLoteriaCardVoice(cardKey: string) {
  await playAudioFile(`/audio/loteria/cartas/${cardKey}.mp3`, fallbackCardSound);
}

export async function playLoteriaMarkSound() {
  fallbackMarkSound();
}

export async function playLoteriaInvalidSound() {
  fallbackInvalidSound();
}

export async function playLoteriaExpiredSound() {
  fallbackExpiredSound();
}

export async function playLoteriaWinVoice() {
  await playAudioFile("/audio/loteria/loteria.mp3", fallbackWinSound);
}
