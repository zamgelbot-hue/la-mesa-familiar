// 📍 Ruta del archivo: components/games/memorama/MemoramaScorePanel.tsx

import { GameSection } from "@/components/games/core";

type RoomPlayer = {
  id: string;
  user_id: string | null;
  player_name: string;
};

type ScoreEntry = {
  pairs?: number;
};

type Props = {
  players: RoomPlayer[];
  scores: Record<string, ScoreEntry>;
  currentTurnKey: string | null;
  currentPlayerKey: string | null;
  getPlayerKey: (player: RoomPlayer) => string;
};

export default function MemoramaScorePanel({
  players,
  scores,
  currentTurnKey,
  currentPlayerKey,
  getPlayerKey,
}: Props) {
  return (
    <GameSection title="🏆 Marcador">
      <div className="mt-4 space-y-3">
        {players.map((player) => {
          const key = getPlayerKey(player);
          const score = scores[key]?.pairs ?? 0;
          const isCurrentTurn = currentTurnKey === key;
          const isMe = key === currentPlayerKey;

          return (
            <div
              key={player.id}
              className={
                isCurrentTurn
                  ? "rounded-2xl border border-orange-400 bg-orange-500/15 p-4 shadow-[0_0_22px_rgba(249,115,22,0.14)]"
                  : "rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              }
            >
              <p className="font-black">
                {player.player_name} {isMe ? "(Tú)" : ""}
              </p>

              <p className="mt-1 text-sm font-bold text-white/60">
                Parejas: <span className="text-orange-300">{score}</span>
              </p>
            </div>
          );
        })}
      </div>
    </GameSection>
  );
}