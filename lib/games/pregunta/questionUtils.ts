import {
  QuestionCategory,
  QuestionDifficulty,
  QuestionForRound,
  QuestionOptionView,
  QuestionRow,
} from "./questionTypes";

export function shuffleArray<T>(items: T[]): T[] {
  const clone = [...items];

  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }

  return clone;
}

export function makeOptionId(questionId: string, originalIndex: number): string {
  return `${questionId}_opt_${originalIndex}`;
}

export function mapQuestionRowToRoundQuestion(row: QuestionRow): QuestionForRound {
  const options: QuestionOptionView[] = row.options.map((text, index) => ({
    id: makeOptionId(row.id, index),
    originalIndex: index,
    text,
  }));

  const shuffledOptions = shuffleArray(options);

  return {
    id: row.id,
    category: row.category,
    difficulty: row.difficulty,
    questionText: row.question_text,
    options: shuffledOptions,
    correctOriginalIndex: row.correct_index,
    explanation: row.explanation ?? null,
  };
}

export function getRemainingMs(targetIsoDate: string | null): number {
  if (!targetIsoDate) return 0;
  return Math.max(0, new Date(targetIsoDate).getTime() - Date.now());
}

export function hasRoundExpired(targetIsoDate: string | null): boolean {
  return getRemainingMs(targetIsoDate) <= 0;
}

export function difficultyWeight(difficulty: QuestionDifficulty): number {
  switch (difficulty) {
    case "facil":
      return 1;
    case "media":
      return 1.15;
    case "dificil":
      return 1.3;
    default:
      return 1;
  }
}

export function categoryLabel(category: QuestionCategory): string {
  switch (category) {
    case "espanol":
      return "Español";
    case "matematicas":
      return "Matemáticas";
    case "ingles":
      return "Inglés";
    case "geografia":
      return "Geografía";
    case "ciencias":
      return "Ciencias";
    case "sabelotodo":
      return "¡Sabelotodo!";
    default:
      return category;
  }
}

export function difficultyLabel(difficulty: QuestionDifficulty): string {
  switch (difficulty) {
    case "facil":
      return "Fácil";
    case "media":
      return "Media";
    case "dificil":
      return "Difícil";
    default:
      return difficulty;
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function calculateResponseTimeMs(
  roundStartedAtIso: string | null,
  answeredAtIso?: string,
): number {
  if (!roundStartedAtIso) return 0;

  const start = new Date(roundStartedAtIso).getTime();
  const end = answeredAtIso ? new Date(answeredAtIso).getTime() : Date.now();

  return Math.max(0, end - start);
}

export function buildRoundQuestionSet(
  questions: QuestionRow[],
  totalRounds: number,
): QuestionForRound[] {
  return shuffleArray(questions)
    .slice(0, totalRounds)
    .map(mapQuestionRowToRoundQuestion);
}

export function excludeRecentlyUsedQuestions(
  questions: QuestionRow[],
  recentQuestionIds: string[],
): QuestionRow[] {
  if (!recentQuestionIds.length) return questions;
  const excludeSet = new Set(recentQuestionIds);
  return questions.filter((q) => !excludeSet.has(q.id));
}
