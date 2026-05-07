// 📍 Ruta del archivo: components/games/pregunta/QuestionBoard.tsx

import type {
  QuestionForRound,
  QuestionGamePhase,
} from "@/lib/games/pregunta/questionTypes";
import {
  categoryLabel,
  difficultyLabel,
} from "@/lib/games/pregunta/questionUtils";

type Props = {
  currentQuestion: QuestionForRound | null;
  phase: QuestionGamePhase;
  selectedOptionIndex: number | null;
  onSelectOption: (originalIndex: number) => void;
};

export default function QuestionBoard({
  currentQuestion,
  phase,
  selectedOptionIndex,
  onSelectOption,
}: Props) {
  if (!currentQuestion) {
    return (
      <div className="rounded-[30px] border border-orange-500/15 bg-zinc-950/90 p-6">
        <div className="text-white/60">Esperando pregunta...</div>
      </div>
    );
  }

  const isRevealPhase =
    phase === "reveal" || phase === "scoreboard" || phase === "finished";

  return (
    <div className="rounded-[30px] border border-orange-500/15 bg-zinc-950/90 p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-300">
          {categoryLabel(currentQuestion.category)}
        </span>

        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-neutral-300">
          {difficultyLabel(currentQuestion.difficulty)}
        </span>
      </div>

      <h2 className="mt-4 text-2xl font-bold leading-snug text-white">
        {currentQuestion.questionText}
      </h2>

      {phase === "question" ? (
        <div className="mt-6 rounded-2xl border border-orange-500/20 bg-orange-500/10 px-4 py-6 text-center text-orange-200">
          Prepárate... las respuestas aparecerán en un momento.
        </div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {currentQuestion.options.map((option) => {
            const isSelected = selectedOptionIndex === option.originalIndex;
            const isCorrect =
              isRevealPhase &&
              option.originalIndex === currentQuestion.correctOriginalIndex;
            const isWrongSelected = isRevealPhase && isSelected && !isCorrect;

            return (
              <button
                key={option.id}
                type="button"
                disabled={phase !== "answer" || selectedOptionIndex !== null}
                onClick={() => onSelectOption(option.originalIndex)}
                className={[
                  "min-h-[92px] rounded-2xl border px-4 py-4 text-left transition disabled:cursor-not-allowed",
                  isCorrect
                    ? "border-emerald-400/40 bg-emerald-500/20"
                    : isWrongSelected
                      ? "border-red-400/40 bg-red-500/20"
                      : isSelected
                        ? "border-orange-400/40 bg-orange-500/20"
                        : "border-white/10 bg-white/5 hover:border-orange-400/30 hover:bg-orange-500/10",
                ].join(" ")}
              >
                <span className="text-base font-medium text-white">
                  {option.text}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {phase === "answer" && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
          Elige una opción antes de que termine el tiempo.
        </div>
      )}

      {phase === "reveal" && (
        <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          Respuesta correcta revelada.
        </div>
      )}

      {phase === "scoreboard" && (
        <div className="mt-5 rounded-2xl border border-orange-500/20 bg-orange-500/10 px-4 py-3 text-sm text-orange-200">
          Preparando siguiente ronda...
        </div>
      )}
    </div>
  );
}