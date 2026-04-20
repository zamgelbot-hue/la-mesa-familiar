import type {
  Choice,
  GameState,
  ModeConfig,
  RoomPlayer,
  RoundOutcome,
  RoundSoundType,
} from "./pptTypes";

export const DEFAULT_STATE: GameState = {
  round: 1,
  playerChoices: {},
  scores: {},
  roundWinner: null,
  resultText: null,
  resultDetail: null,
  champion: null,
  matchOver: false,
  rematchVotes: [],
  canAdvanceRound: false,
};

export const getPlayerStorageKey = (roomCode: string) => `lmf:player:${roomCode}`;

export function getModeConfig(
  roomVariant?: string | null,
  roomSettings?: Record<string, any> | null
): ModeConfig {
  const bestOfFromSettings = Number(roomSettings?.best_of ?? 0);
  const roundsToWinFromSettings = Number(roomSettings?.rounds_to_win ?? 0);

  if (bestOfFromSettings > 0 && roundsToWinFromSettings > 0) {
    return {
      bestOf: bestOfFromSettings,
      roundsToWin: roundsToWinFromSettings,
      modeLabel: `Mejor de ${bestOfFromSettings}`,
      variantLabel: `Mejor ${roundsToWinFromSettings} de ${bestOfFromSettings}`,
    };
  }

  if (roomVariant === "bo5") {
    return {
      bestOf: 5,
      roundsToWin: 3,
      modeLabel: "Mejor de 5",
      variantLabel: "Mejor 3 de 5",
    };
  }

  if (roomVariant === "bo7") {
    return {
      bestOf: 7,
      roundsToWin: 4,
      modeLabel: "Mejor de 7",
      variantLabel: "Mejor 4 de 7",
    };
  }

  return {
    bestOf: 3,
    roundsToWin: 2,
    modeLabel: "Mejor de 3",
    variantLabel: "Mejor 2 de 3",
  };
}

export function getChoiceLabel(choice: Exclude<Choice, null>) {
  if (choice === "piedra") return "Piedra";
  if (choice === "papel") return "Papel";
  return "Tijera";
}

export function getRoundOutcome(
  a: Exclude<Choice, null>,
  b: Exclude<Choice, null>
): RoundOutcome {
  if (a === b) {
    return {
      winnerSide: "empate",
      winningChoice: null,
      losingChoice: null,
      detailText: "Empate",
      sound: "empate",
    };
  }

  if (a === "piedra" && b === "tijera") {
    return {
      winnerSide: "a",
      winningChoice: "piedra",
      losingChoice: "tijera",
      detailText: "Piedra vence a Tijera",
      sound: "piedra",
    };
  }

  if (a === "tijera" && b === "papel") {
    return {
      winnerSide: "a",
      winningChoice: "tijera",
      losingChoice: "papel",
      detailText: "Tijera vence a Papel",
      sound: "tijera",
    };
  }

  if (a === "papel" && b === "piedra") {
    return {
      winnerSide: "a",
      winningChoice: "papel",
      losingChoice: "piedra",
      detailText: "Papel vence a Piedra",
      sound: "papel",
    };
  }

  if (b === "piedra" && a === "tijera") {
    return {
      winnerSide: "b",
      winningChoice: "piedra",
      losingChoice: "tijera",
      detailText: "Piedra vence a Tijera",
      sound: "piedra",
    };
  }

  if (b === "tijera" && a === "papel") {
    return {
      winnerSide: "b",
      winningChoice: "tijera",
      losingChoice: "papel",
      detailText: "Tijera vence a Papel",
      sound: "tijera",
    };
  }

  return {
    winnerSide: "b",
    winningChoice: "papel",
    losingChoice: "piedra",
    detailText: "Papel vence a Piedra",
    sound: "papel",
  };
}

export function buildFreshState(playerList: RoomPlayer[]): GameState {
  const playerChoices: Record<string, Choice> = {};
  const scores: Record<string, number> = {};

  for (const player of playerList) {
    playerChoices[player.player_name] = null;
    scores[player.player_name] = 0;
  }

  return {
    round: 1,
    playerChoices,
    scores,
    roundWinner: null,
    resultText: null,
    resultDetail: null,
    champion: null,
    matchOver: false,
    rematchVotes: [],
    canAdvanceRound: false,
  };
}

export function playPPTSfx(type: RoundSoundType) {
  if (typeof window === "undefined") return;

  const AudioCtx =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioCtx) return;

  const ctx = new AudioCtx();
  const now = ctx.currentTime;

  const makeTone = (
    frequency: number,
    start: number,
    duration: number,
    oscType: OscillatorType,
    gainValue: number
  ) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = oscType;
    osc.frequency.setValueAtTime(frequency, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(start + duration);
  };

  if (type === "piedra") {
    makeTone(120, now, 0.15, "square", 0.07);
    makeTone(90, now + 0.04, 0.2, "square", 0.05);
  } else if (type === "papel") {
    makeTone(380, now, 0.12, "sine", 0.05);
    makeTone(520, now + 0.08, 0.14, "sine", 0.04);
  } else if (type === "tijera") {
    makeTone(900, now, 0.08, "triangle", 0.05);
    makeTone(1150, now + 0.07, 0.08, "triangle", 0.04);
  } else if (type === "empate") {
    makeTone(260, now, 0.08, "sine", 0.04);
    makeTone(260, now + 0.1, 0.08, "sine", 0.04);
  } else if (type === "victoria") {
    makeTone(440, now, 0.12, "triangle", 0.05);
    makeTone(554, now + 0.14, 0.12, "triangle", 0.05);
    makeTone(659, now + 0.28, 0.18, "triangle", 0.06);
  }

  window.setTimeout(() => {
    ctx.close().catch(() => {});
  }, 700);
}
