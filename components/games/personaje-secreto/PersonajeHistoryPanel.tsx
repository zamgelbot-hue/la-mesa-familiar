// 📍 Ruta del archivo: components/games/personaje-secreto/PersonajeHistoryPanel.tsx

import type { PsGuess, PsQuestion } from "./psTypes";
import { getPsAnswerEmoji, getPsAnswerLabel } from "./psUtils";

type Props = {
  questions: PsQuestion[];
  guesses: PsGuess[];
};

export default function PersonajeHistoryPanel({
  questions,
  guesses,
}: Props) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-zinc-950/90 p-5">
      <h2 className="text-xl font-black">📜 Historial</h2>

      <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-2">
        {questions.map((question) => (
          <div
            key={question.id}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
          >
            <p className="text-xs text-white/40">
              {question.fromName} preguntó a {question.toName}
            </p>

            <p className="mt-1 font-bold text-white">{question.question}</p>

            <p className="mt-2 text-sm text-white/70">
              Respuesta:{" "}
              {question.answer ? (
                <span className="font-black text-orange-300">
                  {getPsAnswerEmoji(question.answer)}{" "}
                  {getPsAnswerLabel(question.answer)}
                </span>
              ) : (
                <span className="font-bold text-yellow-300">Pendiente</span>
              )}
            </p>
          </div>
        ))}

        {guesses.map((guess) => (
          <div
            key={guess.id}
            className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4"
          >
            <p className="text-xs text-white/40">
              {guess.playerName} intentó adivinar a {guess.targetName}
            </p>

            <p className="mt-1 font-bold text-white">{guess.guess}</p>

            <p className="mt-2 text-sm">
              Resultado:{" "}
              {guess.result === "correct" ? (
                <span className="font-black text-emerald-300">Correcto</span>
              ) : guess.result === "wrong" ? (
                <span className="font-black text-red-300">Incorrecto</span>
              ) : (
                <span className="font-black text-yellow-300">
                  Esperando confirmación
                </span>
              )}
            </p>
          </div>
        ))}

        {questions.length === 0 && guesses.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-white/60">
            Aún no hay preguntas ni intentos.
          </div>
        )}
      </div>
    </div>
  );
}