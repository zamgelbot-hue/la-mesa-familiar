// 📍 Ruta del archivo: components/games/loteria-mexicana/LoteriaStatusPanel.tsx

import { unlockAudioElement, playStartVoice } from "./loteriaAudioManager";
import { unlockLoteriaAudio } from "./loteriaSounds";

type Props = {
  status?: "waiting" | "playing" | "finished" | null;
  isHost: boolean;
  startingMatch: boolean;
  roomPlayersCount: number;
  message?: string;
  errorMessage?: string;
  onStartMatch: () => void;
};

export default function LoteriaStatusPanel({
  status,
  isHost,
  startingMatch,
  roomPlayersCount,
  message,
  errorMessage,
  onStartMatch,
}: Props) {
  return (
    <div className="space-y-4">
      {errorMessage && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-300">
          {errorMessage}
        </div>
      )}

      {message && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-emerald-300">
          {message}
        </div>
      )}

      {status === "waiting" && (
        <div className="rounded-[30px] border border-orange-500/15 bg-orange-500/10 p-5">
          <h2 className="text-2xl font-bold text-white">
            Partida lista para comenzar
          </h2>

          <p className="mt-2 text-white/65">
            {isHost
              ? "Cuando estés listo, inicia la lotería para comenzar a cantar cartas."
              : "Esperando a que el host inicie la partida."}
          </p>

          {isHost && (
            <button
              type="button"
              onClick={async () => {
                await unlockLoteriaAudio();
                await unlockAudioElement();
                playStartVoice();
                onStartMatch();
              }}
              disabled={startingMatch || roomPlayersCount < 2}
              className="mt-5 rounded-2xl bg-orange-500 px-5 py-3 font-extrabold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {startingMatch ? "Preparando salida..." : "Iniciar lotería"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}