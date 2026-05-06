// 📍 Ruta del archivo: components/games/guerra-total/GuerraTotalPlayerPanel.tsx

import type { GtGameState, GtRoomPlayer } from "./guerraTotalTypes";
import { getGtPlayerKey } from "./guerraTotalUtils";

type Props = {
  players: GtRoomPlayer[];
  gameState: GtGameState;
  currentPlayerKey: string | null;
};

export default function GuerraTotalPlayerPanel({
  players,
  gameState,
  currentPlayerKey,
}: Props) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-zinc-950/90 p-5">
      <h2 className="text-xl font-black">🧩 Estado</h2>

      <div className="mt-4 space-y-3">
        {players.map((player) => {
          const key = getGtPlayerKey(player);
          const board = gameState.boards[key];

          return (
            <div
              key={player.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <p className="font-black">
                {player.player_name} {key === currentPlayerKey ? "(Tú)" : ""}
              </p>

              <p className={board?.ready ? "text-emerald-300" : "text-yellow-300"}>
                {board?.ready ? "Formación lista" : "Colocando unidades..."}
              </p>
            </div>
          );
        })}
      </div>

      {gameState.phase === "battle" && (
        <div className="mt-4 rounded-2xl border border-purple-500/20 bg-purple-500/10 p-4">
          <p className="text-sm font-bold text-purple-200">🎲 Turno actual</p>
          <p className="mt-1 text-xl font-black">
            {gameState.currentTurnName ?? "Jugador"}
          </p>
        </div>
      )}
    </div>
  );
}