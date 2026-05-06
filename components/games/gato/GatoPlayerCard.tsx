// 📍 Ruta del archivo: components/games/gato/GatoPlayerCard.tsx

import type { RoomPlayer } from "./utils";

type Props = {
  player: RoomPlayer;
  currentPlayerName: string;
  symbol: "X" | "O" | null;
  isCurrentTurn: boolean;
  isWinner: boolean;
};

export default function GatoPlayerCard({
  player,
  currentPlayerName,
  symbol,
  isCurrentTurn,
  isWinner,
}: Props) {
  const isMe = player.player_name === currentPlayerName;

  return (
    <div
      className={`rounded-3xl border p-5 transition ${
        isWinner
          ? "border-yellow-400/40 bg-yellow-500/10 shadow-[0_0_30px_rgba(250,204,21,0.10)]"
          : isCurrentTurn
            ? "border-orange-400/40 bg-orange-500/10 shadow-[0_0_30px_rgba(249,115,22,0.10)]"
            : isMe
              ? "border-emerald-400/35 bg-emerald-500/10"
              : "border-white/10 bg-white/[0.05]"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-xl font-black text-white">
            {player.player_name} {player.is_host ? "👑" : ""}
          </p>

          <p className="mt-1 text-sm text-white/55">
            {isMe
              ? "Tú"
              : player.player_name.includes("Bot Familiar")
                ? "Rival automático"
                : player.is_guest
                  ? "Invitado"
                  : "Jugador"}
          </p>

          {isCurrentTurn && (
            <p className="mt-2 text-sm font-bold text-orange-300">
              Turno actual
            </p>
          )}
        </div>

        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-black/35 text-4xl font-black text-orange-300">
          {symbol ?? "?"}
        </div>
      </div>
    </div>
  );
}