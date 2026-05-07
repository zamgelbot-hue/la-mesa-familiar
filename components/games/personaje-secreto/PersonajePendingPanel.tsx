// 📍 Ruta del archivo: components/games/personaje-secreto/PersonajePendingPanel.tsx

import type { PsAnswer, PsGuess, PsQuestion } from "./psTypes";
import { getPsAnswerEmoji, getPsAnswerLabel } from "./psUtils";

type Props = {
  pendingQuestionsForMe: PsQuestion[];
  pendingGuessesForMe: PsGuess[];
  saving: boolean;
  onAnswerQuestion: (questionId: string, answer: PsAnswer) => void;
  onConfirmGuess: (guessId: string, result: "correct" | "wrong") => void;
};

export default function PersonajePendingPanel({
  pendingQuestionsForMe,
  pendingGuessesForMe,
  saving,
  onAnswerQuestion,
  onConfirmGuess,
}: Props) {
  if (pendingQuestionsForMe.length === 0 && pendingGuessesForMe.length === 0) {
    return null;
  }

  return (
    <div className="rounded-[28px] border border-yellow-500/25 bg-yellow-500/10 p-5">
      <h2 className="text-xl font-black text-yellow-200">
        ⚠️ Pendientes para ti
      </h2>

      <div className="mt-4 space-y-4">
        {pendingQuestionsForMe.map((question) => (
          <div
            key={question.id}
            className="rounded-2xl border border-white/10 bg-black/25 p-4"
          >
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/40">
              Pregunta de {question.fromName}
            </p>

            <p className="mt-2 font-bold text-white">{question.question}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {(["si", "no", "probablemente"] as PsAnswer[]).map((answer) => (
                <button
                  key={answer}
                  type="button"
                  disabled={saving}
                  onClick={() => onAnswerQuestion(question.id, answer)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-black text-white hover:bg-white/10 disabled:opacity-60"
                >
                  {getPsAnswerEmoji(answer)} {getPsAnswerLabel(answer)}
                </button>
              ))}
            </div>
          </div>
        ))}

        {pendingGuessesForMe.map((guess) => (
          <div
            key={guess.id}
            className="rounded-2xl border border-orange-500/20 bg-black/25 p-4"
          >
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/40">
              Intento de {guess.playerName}
            </p>

            <p className="mt-2 font-bold text-white">
              ¿Tu personaje es{" "}
              <span className="text-orange-300">{guess.guess}</span>?
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => onConfirmGuess(guess.id, "correct")}
                className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-black text-black hover:bg-emerald-400 disabled:opacity-60"
              >
                Sí, correcto
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => onConfirmGuess(guess.id, "wrong")}
                className="rounded-2xl bg-red-500 px-4 py-2 text-sm font-black text-white hover:bg-red-400 disabled:opacity-60"
              >
                No, incorrecto
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}