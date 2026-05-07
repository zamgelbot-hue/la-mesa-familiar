// 📍 Ruta del archivo: components/games/personaje-secreto/PersonajeActionPanel.tsx

type Props = {
  show: boolean;
  questionInput: string;
  guessInput: string;
  suggestedQuestions: string[];
  saving: boolean;
  allPicked: boolean;
  isMyTurn: boolean;
  hasPendingQuestionsForMe: boolean;
  hasPendingGuessesForMe: boolean;
  onQuestionInputChange: (value: string) => void;
  onGuessInputChange: (value: string) => void;
  onAskQuestion: () => void;
  onSubmitGuess: () => void;
};

export default function PersonajeActionPanel({
  show,
  questionInput,
  guessInput,
  suggestedQuestions,
  saving,
  allPicked,
  isMyTurn,
  hasPendingQuestionsForMe,
  hasPendingGuessesForMe,
  onQuestionInputChange,
  onGuessInputChange,
  onAskQuestion,
  onSubmitGuess,
}: Props) {
  if (!show) return null;

  return (
    <>
      <div className="rounded-[28px] border border-emerald-500/20 bg-zinc-950/90 p-5">
        <h2 className="text-xl font-black text-emerald-300">
          💬 Haz tu pregunta
        </h2>

        <p className="mt-2 text-sm text-white/60">
          Solo puedes preguntar cuando sea tu turno.
        </p>

        <div className="mt-4 flex flex-col gap-3 md:flex-row">
          <input
            value={questionInput}
            onChange={(e) => onQuestionInputChange(e.target.value)}
            placeholder="Ejemplo: ¿Tu personaje usa gorra?"
            disabled={!isMyTurn || hasPendingQuestionsForMe}
            className="min-h-[48px] flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-emerald-400 disabled:opacity-50"
          />

          <button
            type="button"
            disabled={saving || !allPicked || !isMyTurn || hasPendingQuestionsForMe}
            onClick={onAskQuestion}
            className="rounded-2xl bg-emerald-500 px-5 py-3 font-black text-black hover:bg-emerald-400 disabled:opacity-60"
          >
            Preguntar
          </button>
        </div>
      </div>

      <div className="rounded-[28px] border border-sky-500/20 bg-zinc-950/90 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-black text-sky-200">
            💡 Preguntas sugeridas
          </h2>

          <span className="text-xs font-bold text-white/40">Desliza ↓</span>
        </div>

        <div className="mt-4 max-h-[140px] overflow-y-auto pr-2">
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => onQuestionInputChange(question)}
                disabled={!isMyTurn}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/80 hover:border-orange-400/60 hover:bg-orange-500/10 disabled:opacity-40"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-orange-500/20 bg-zinc-950/90 p-5">
        <h2 className="text-xl font-black text-orange-300">
          🕵️ Adivinar personaje
        </h2>

        <div className="mt-4 flex flex-col gap-3 md:flex-row">
          <input
            value={guessInput}
            onChange={(e) => onGuessInputChange(e.target.value)}
            placeholder="Ejemplo: Mario Bros"
            disabled={!isMyTurn || hasPendingGuessesForMe}
            className="min-h-[48px] flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-orange-400 disabled:opacity-50"
          />

          <button
            type="button"
            disabled={saving || !allPicked || !isMyTurn || hasPendingGuessesForMe}
            onClick={onSubmitGuess}
            className="rounded-2xl bg-orange-500 px-5 py-3 font-black text-black hover:bg-orange-400 disabled:opacity-60"
          >
            Adivinar
          </button>
        </div>
      </div>
    </>
  );
}