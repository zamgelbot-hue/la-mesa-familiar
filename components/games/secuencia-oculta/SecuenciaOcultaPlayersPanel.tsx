// 📍 Ruta del archivo: components/games/secuencia-oculta/SecuenciaOcultaPlayersPanel.tsx

import type { SecuenciaPlayer, SecuenciaGameState } from "./secuenciaOcultaTypes";

type Props = {
  players: SecuenciaPlayer[];
  gameState: SecuenciaGameState;
  currentPlayerKey: string | null;
};

export default function SecuenciaOcultaPlayersPanel({
  players,
  gameState,
  currentPlayerKey,
}: Props) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-zinc-950/90 p-5">
      <h2 className="text-xl font-black">👥 Jugadores</h2>

      <div className="mt-4 space-y-3">
        {players.map((player) => {
          const isTurn = player.key === gameState.currentTurnKey;
          const isMe = player.key === currentPlayerKey;

          return (
            <div
              key={player.key}
              className={
                isTurn
                  ? "rounded-2xl border border-orange-400/40 bg-orange-500/15 p-4"
                  : "rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              }
            >
              <p className="font-black text-white">
                {player.name} {isMe ? "(Tú)" : ""}
              </p>

              <p className={isTurn ? "text-orange-300" : "text-white/45"}>
                {isTurn ? "Tiene el turno" : "Esperando"}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}