export type QuestionCategory =
  | "espanol"
  | "matematicas"
  | "ingles"
  | "geografia"
  | "ciencias"
  | "sabelotodo";

export type QuestionDifficulty = "facil" | "media" | "dificil";

export type QuestionGamePhase =
  | "waiting"
  | "intro"
  | "question"
  | "answer"
  | "reveal"
  | "scoreboard"
  | "finished";

export interface QuestionRow {
  id: string;
  category: QuestionCategory;
  difficulty: QuestionDifficulty;
  question_text: string;
  options: string[];
  correct_index: number;
  explanation?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface QuestionOptionView {
  id: string;
  originalIndex: number;
  text: string;
}

export interface QuestionForRound {
  id: string;
  category: QuestionCategory;
  difficulty: QuestionDifficulty;
  questionText: string;
  options: QuestionOptionView[];
  correctOriginalIndex: number;
  explanation?: string | null;
}

export interface QuestionPlayerSummary {
  playerId: string;
  name: string;
  avatarUrl?: string | null;
  score: number;
  correctAnswers: number;
  incorrectAnswers: number;
  averageResponseMs: number | null;
  hasAnsweredCurrentRound?: boolean;
}

export interface QuestionGameSettings {
  totalRounds: number;
  answerTimeMs: number;
  questionRevealMs: number;
  scoreboardMs: number;
  categoryMode: QuestionCategory;
  allowExplanation: boolean;
}

export interface QuestionGameState {
  sessionId: string;
  roomId: string;
  gameSlug: "pregunta";
  hostId: string;
  status: "waiting" | "playing" | "finished";
  phase: QuestionGamePhase;
  currentRound: number;
  totalRounds: number;
  roundStartedAt: string | null;
  answerEndsAt: string | null;
  revealEndsAt: string | null;
  scoreboardEndsAt: string | null;
  currentQuestion: QuestionForRound | null;
  settings: QuestionGameSettings;
  players: QuestionPlayerSummary[];
  winnerPlayerId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlayerRoundAnswer {
  id?: string;
  sessionId: string;
  roomId: string;
  roundNumber: number;
  playerId: string;
  questionId: string;
  selectedOriginalIndex: number;
  isCorrect: boolean;
  responseTimeMs: number;
  answeredAt: string;
}

export interface RoundScoreResult {
  playerId: string;
  isCorrect: boolean;
  selectedOriginalIndex: number | null;
  responseTimeMs: number | null;
  speedBonus: number;
  roundPoints: number;
  totalScore: number;
}

export interface RoundResolution {
  roundNumber: number;
  questionId: string;
  correctOriginalIndex: number;
  results: RoundScoreResult[];
}

export interface FinalStanding {
  playerId: string;
  name: string;
  score: number;
  correctAnswers: number;
  incorrectAnswers: number;
  averageResponseMs: number | null;
  accuracy: number;
  position: number;
}

export interface GlobalRewardBreakdown {
  playerId: string;
  placementPoints: number;
  participationPoints: number;
  accuracyBonus: number;
  streakBonus: number;
  totalReward: number;
}
