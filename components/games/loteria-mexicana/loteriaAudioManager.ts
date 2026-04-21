let sharedAudio: HTMLAudioElement | null = null;

function getSharedAudio() {
  if (typeof window === "undefined") return null;

  if (!sharedAudio) {
    sharedAudio = new Audio();
    sharedAudio.preload = "auto";
    sharedAudio.volume = 1;
  }

  return sharedAudio;
}

export async function unlockAudioElement() {
  const audio = getSharedAudio();
  if (!audio) return;

  try {
    // usar un archivo REAL que sí existe
    audio.src = "/audio/loteria/corre_y_se_va_con.mp3";
    audio.muted = true;
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    audio.muted = false;
  } catch (err) {
    console.error("unlockAudioElement error:", err);
  }
}

async function playAudio(src: string) {
  const audio = getSharedAudio();
  if (!audio) return;

  try {
    audio.pause();
    audio.currentTime = 0;
    audio.src = src;
    audio.load();
    await audio.play();
  } catch (err) {
    console.error("Audio error:", err);
  }
}

export async function playStartVoice() {
  await playAudio("/audio/loteria/corre_y_se_va_con.mp3");
}

export async function playWinVoice() {
  await playAudio("/audio/loteria/loteria.mp3");
}

export async function playCardVoice(cardKey: string) {
  await playAudio(`/audio/loteria/cartas/${cardKey}.mp3`);
}
