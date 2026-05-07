// 📍 Ruta del archivo: components/games/personaje-secreto/PersonajeSecretSummary.tsx

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
};

export default function PersonajeSecretSummary({
  players,
  gameState,
  currentPlayerKey,
}: Props) {
  if (gameState.phase !== "finished") return null;

  return (
    <div className="rounded-[28px] border border-emerald-500/20 bg-emerald-500/10 p-5">
      <h2 className="text-xl font-black text-emerald-200">
        🎭 Personajes revelados
      </h2>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {players.map((player) => {
          const key = getPsPlayerKey(player);
          const secret = gameState.secrets[key];
          const isMe = key === currentPlayerKey;

          return (
            <div
              key={player.id}
              className="rounded-2xl border border-white/10 bg-black/25 p-4"
            >
              <p className="font-black text-white">
                {player.player_name} {isMe ? "(Tú)" : ""}
              </p>

              <p className="mt-1 text-sm text-white/70">
                Personaje:{" "}
                <span className="font-black text-orange-300">
                  {secret?.secret ?? "No registrado"}
                </span>
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}