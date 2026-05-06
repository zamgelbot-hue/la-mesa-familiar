// 📍 Ruta del archivo: components/games/memorama/MemoramaStatusPanel.tsx

import { GamePrimaryButton, GameSection } from "@/components/games/core";
import type { MemoramaGameState } from "./types";

type Props = {
  gameState: MemoramaGameState;
  isHost: boolean;
  isMyTurn: boolean;
  saving: boolean;
  playersCount: number;
  turnSecondsLeft: number;
  turnSecondsLimit: number;
  onStartGame: () => void;
  onRematch: () => void;
};

export default function MemoramaStatusPanel({
  gameState,
  isHost,
  isMyTurn,
  saving,
  playersCount,
  turnSecondsLeft,
  turnSecondsLimit,
  onStartGame,
  onRematch,
}: Props) {
  return (
    <GameSection title="🎮 Estado">
      {gameState.phase === "waiting" && (
        <div className="mt-4 space-y-3">
          <p className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-100">
            Listo para iniciar Memorama.
          </p>

          {isHost ? (
            <GamePrimaryButton
              type="button"
              onClick={onStartGame}
              disabled={saving || playersCount < 2}
              className="w-full text-black"
            >
              Iniciar partida
            </GamePrimaryButton>
          ) : (
            <p className="text-sm text-white/50">
              Esperando que el host inicie la partida.
            </p>
          )}
        </div>
      )}

      {gameState.phase === "playing" && (
        <div
          className={
            isMyTurn
              ? "mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4"
              : "mt-4 rounded-2xl border border-purple-500/20 bg-purple-500/10 p-4"
          }
        >
          <p className="text-sm font-bold text-white/60">Turno actual</p>

          <p className="mt-1 text-2xl font-black">
            {gameState.currentTurnName ?? "Jugador"}
          </p>

          <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-3">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">
              Tiempo
            </p>

            <p className="mt-1 text-4xl font-black text-orange-300">
              {turnSecondsLeft}s
            </p>
          </div>

          <p className="mt-2 text-sm text-white/60">
            {gameState.isResolving
              ? "Resolviendo selección..."
              : isMyTurn
                ? `Elige 2 cartas antes de ${turnSecondsLimit} segundos.`
                : "Espera tu turno."}
          </p>

          {gameState.lastResult === "match" && (
            <p className="mt-2 text-sm font-bold text-emerald-300">
              ✅ Pareja encontrada.
            </p>
          )}

          {gameState.lastResult === "miss" && (
            <p className="mt-2 text-sm font-bold text-red-300">
              ❌ No era pareja.
            </p>
          )}

          {gameState.lastResult === "timeout" && (
            <p className="mt-2 text-sm font-bold text-yellow-300">
              ⏳ Tiempo agotado.
            </p>
          )}
        </div>
      )}

      {gameState.phase === "finished" && (
        <div className="mt-4 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-300">
            Partida terminada
          </p>

          <p className="mt-2 text-3xl font-black">
            {gameState.winnerName === "Empate"
              ? "🤝 Empate"
              : `🏆 ${gameState.winnerName}`}
          </p>

          {isHost && (
            <GamePrimaryButton
              type="button"
              onClick={onRematch}
              className="mt-4 w-full text-black"
            >
              Revancha
            </GamePrimaryButton>
          )}
        </div>
      )}
    </GameSection>
  );
}