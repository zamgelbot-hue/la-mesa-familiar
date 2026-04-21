let currentAudio: HTMLAudioElement | null = null;

function playAudio(src: string) {
  try {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    const audio = new Audio(src);
    audio.volume = 1;

    currentAudio = audio;

    audio.play().catch(() => {
      // móvil puede bloquear autoplay
    });
  } catch (err) {
    console.error("Audio error:", err);
  }
}

export function playStartVoice() {
  playAudio("/audio/loteria/corre_y_se_va_con.mp3");
}

export function playWinVoice() {
  playAudio("/audio/loteria/loteria.mp3");
}

export function playCardVoice(cardKey: string) {
  playAudio(`/audio/loteria/cartas/${cardKey}.mp3`);
}
