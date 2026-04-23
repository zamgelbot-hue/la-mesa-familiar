import {
  FinalStanding,
  GlobalRewardBreakdown,
  PlayerRoundAnswer,
  QuestionDifficulty,
  QuestionPlayerSummary,
  RoundResolution,
  RoundScoreResult,
} from "./questionTypes";
import { clamp } from "./questionUtils";

const BASE_POINTS_BY_DIFFICULTY: Record<QuestionDifficulty, number> = {
  facil: 10,
  media: 12,
  dificil: 14,
};

const MAX_SPEED_BONUS_BY_DIFFICULTY: Record<QuestionDifficulty, number> = {
  facil: 3,
  media: 4,
  dificil: 5,
};

export function calculateSpeedBonus(
  responseTimeMs: number,
  answerTimeMs: number,
  difficulty: QuestionDifficulty,
): number {
  if (answerTimeMs <= 0) return 0;

  const normalized = 1 - clamp(responseTimeMs / answerTimeMs, 0, 1);
  const maxBonus = MAX_SPEED_BONUS_BY_DIFFICULTY[difficulty] ?? 4;

  return Math.round(normalized * maxBonus);
}

export function calculateRoundPoints(params: {
  isCorrect: boolean;
  responseTimeMs: number;
  answerTimeMs: number;
  difficulty: QuestionDifficulty;
}): { roundPoints: number; speedBonus: number } {
  const { isCorrect, responseTimeMs, answerTimeMs, difficulty } = params;

  if (!isCorrect) {
    return {
      roundPoints: 0,
      speedBonus: 0,
    };
  }

  const basePoints = BASE_POINTS_BY_DIFFICULTY[difficulty] ?? 10;
  const speedBonus = calculateSpeedBonus(responseTimeMs, answerTimeMs, difficulty);

  return {
    roundPoints: basePoints + speedBonus,
    speedBonus,
  };
}

export function resolveRound(params: {
  answers: PlayerRoundAnswer[];
  players: QuestionPlayerSummary[];
  answerTimeMs: number;
  difficulty: QuestionDifficulty;
  roundNumber: number;
  questionId: string;
  correctOriginalIndex: number;
}): RoundResolution {
  const {
    answers,
    players,
    answerTimeMs,
    difficulty,
    roundNumber,
    questionId,
    correctOriginalIndex,
  } = params;

  const answerMap = new Map(answers.map((a) => [a.playerId, a]));

  const results: RoundScoreResult[] = players.map((player) => {
    const answer = answerMap.get(player.playerId);

    if (!answer) {
      return {
        playerId: player.playerId,
        isCorrect: false,
        selectedOriginalIndex: null,
        responseTimeMs: null,
        speedBonus: 0,
        roundPoints: 0,
        totalScore: player.score,
      };
    }

    const score = calculateRoundPoints({
      isCorrect: answer.isCorrect,
      responseTimeMs: answer.responseTimeMs,
      answerTimeMs,
      difficulty,
    });

    return {
      playerId: player.playerId,
      isCorrect: answer.isCorrect,
      selectedOriginalIndex: answer.selectedOriginalIndex,
      responseTimeMs: answer.responseTimeMs,
      speedBonus: score.speedBonus,
      roundPoints: score.roundPoints,
      totalScore: player.score + score.roundPoints,
    };
  });

  return {
    roundNumber,
    questionId,
    correctOriginalIndex,
    results,
  };
}

export function applyRoundResultsToPlayers(
  players: QuestionPlayerSummary[],
  roundResults: RoundScoreResult[],
): QuestionPlayerSummary[] {
  const resultMap = new Map(roundResults.map((r) => [r.playerId, r]));

  return players.map((player) => {
    const result = resultMap.get(player.playerId);
    if (!result) return player;

    const nextCorrect = player.correctAnswers + (result.isCorrect ? 1 : 0);
    const nextIncorrect = player.incorrectAnswers + (result.isCorrect ? 0 : 1);

    let averageResponseMs = player.averageResponseMs;
    if (result.responseTimeMs !== null) {
      const totalAnsweredBefore = player.correctAnswers + player.incorrectAnswers;
      if (averageResponseMs === null || totalAnsweredBefore <= 0) {
        averageResponseMs = result.responseTimeMs;
      } else {
        averageResponseMs = Math.round(
          (averageResponseMs * totalAnsweredBefore + result.responseTimeMs) /
            (totalAnsweredBefore + 1),
        );
      }
    }

    return {
      ...player,
      score: result.totalScore,
      correctAnswers: nextCorrect,
      incorrectAnswers: nextIncorrect,
      averageResponseMs,
      hasAnsweredCurrentRound: false,
    };
  });
}

export function buildFinalStandings(players: QuestionPlayerSummary[]): FinalStanding[] {
  const sorted = [...players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.correctAnswers !== a.correctAnswers) return b.correctAnswers - a.correctAnswers;

    const aAvg = a.averageResponseMs ?? Number.MAX_SAFE_INTEGER;
    const bAvg = b.averageResponseMs ?? Number.MAX_SAFE_INTEGER;
    return aAvg - bAvg;
  });

  return sorted.map((player, index) => {
    const totalAnswered = player.correctAnswers + player.incorrectAnswers;
    const accuracy =
      totalAnswered > 0 ? Math.round((player.correctAnswers / totalAnswered) * 100) : 0;

    return {
      playerId: player.playerId,
      name: player.name,
      score: player.score,
      correctAnswers: player.correctAnswers,
      incorrectAnswers: player.incorrectAnswers,
      averageResponseMs: player.averageResponseMs,
      accuracy,
      position: index + 1,
    };
  });
}

export function calculateGlobalRewards(
  standings: FinalStanding[],
): GlobalRewardBreakdown[] {
  return standings.map((player) => {
    let placementPoints = 0;

    if (player.position === 1) placementPoints = 20;
    else if (player.position === 2) placementPoints = 10;
    else if (player.position === 3) placementPoints = 5;

    const participationPoints = 2;
    const accuracyBonus = player.accuracy >= 80 ? 5 : 0;
    const streakBonus = player.correctAnswers > 0 && player.incorrectAnswers === 0 ? 5 : 0;

    return {
      playerId: player.playerId,
      placementPoints,
      participationPoints,
      accuracyBonus,
      streakBonus,
      totalReward: placementPoints + participationPoints + accuracyBonus + streakBonus,
    };
  });
}
