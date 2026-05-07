// 📍 Ruta del archivo: components/games/pregunta/QuestionScoreboard.tsx

import type { QuestionPlayerSummary } from "@/lib/games/pregunta/questionTypes";

type Props = {
  players: QuestionPlayerSummary[];
  currentPlayerSessionKey: string | null;
};

export default function QuestionScoreboard({
  players,
  currentPlayerSessionKey,
}: Props) {
  return (
    <div className="rounded-[30px] border border-white/10 bg-zinc-950/90 p-5">
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-200">
        Marcador
      </p>

      <div className="mt-4 space-y-3">
        {players.map((player, index) => {
          const isMe = player.playerId === currentPlayerSessionKey;

          return (
            <div
              key={player.playerId}
              className={`rounded-2xl border px-4 py-3 ${
                isMe
                  ? "border-orange-400/30 bg-orange-500/10"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">
                    #{index + 1} {player.name} {isMe ? "· Tú" : ""}
                  </p>

                  <p className="text-xs text-neutral-400">
                    {player.correctAnswers} correctas · {player.incorrectAnswers} incorrectas
                  </p>
                </div>

                <div className="text-lg font-bold text-orange-400">
                  {player.score}
                </div>
              </div>
            </div>
          );
        })}

        {players.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white/60">
            Esperando jugadores...
          </div>
        )}
      </div>
    </div>
  );
}
