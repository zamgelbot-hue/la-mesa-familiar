// 📍 Ruta del archivo: components/games/pregunta/QuestionMessages.tsx

type Props = {
  errorMessage: string;
  message: string;
};

export default function QuestionMessages({ errorMessage, message }: Props) {
  return (
    <>
      {errorMessage && (
        <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-300">
          {errorMessage}
        </div>
      )}

      {message && (
        <div className="mb-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-emerald-300">
          {message}
        </div>
      )}
    </>
  );
}