// 📍 Ruta del archivo: components/games/personaje-secreto/PersonajeStatusPanel.tsx

import type { PsGameState } from "./psTypes";
import { getPsPlayerKey } from "./psUtils";

type Player = {
  id: string;
  user_id: string | null;
  player_name: string;
};

type Props = {
  players: Player[];
  gameState: PsGameState;
  currentPlayerKey: string | null;
  mySecretText?: string | null;
};

export default function PersonajeStatusPanel({
  players,
  gameState,
  currentPlayerKey,
  mySecretText,
}: Props) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-zinc-950/90 p-5">
      <h2 className="text-xl font-black">🧩 Estado de la partida</h2>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {players.map((player) => {
          const key = getPsPlayerKey(player);
          const picked = !!gameState.secrets[key];
          const isMe = key === currentPlayerKey;

          return (
            <div
              key={player.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <p className="font-black">
                {player.player_name} {isMe ? "(Tú)" : ""}
              </p>

              <p className={picked ? "text-emerald-300" : "text-yellow-300"}>
                {picked ? "Personaje elegido" : "Eligiendo personaje..."}
              </p>

              {isMe && mySecretText && (
                <p className="mt-2 text-sm text-white/60">
                  Tu personaje:{" "}
                  <span className="font-bold text-white">{mySecretText}</span>
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}