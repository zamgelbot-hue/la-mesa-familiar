// 📍 Ruta del archivo: components/games/memorama/MemoramaResultSummary.tsx

import { GameResultOverlay } from "@/components/games/core";
import type { MemoramaGameState } from "./types";

type Props = {
  gameState: MemoramaGameState;
  currentPlayerKey: string | null;
  isHost: boolean;
  onBackToSala: () => void;
  onRematch: () => void;
};

export default function MemoramaResultSummary({
  gameState,
  currentPlayerKey,
  isHost,
  onBackToSala,
  onRematch,
}: Props) {
  const isFinished = gameState.phase === "finished";
  const isDraw = gameState.winnerName === "Empate";
  const isWinner = !!currentPlayerKey && gameState.winnerKey === currentPlayerKey;

  const title = isDraw
    ? "¡Empate!"
    : isWinner
      ? "¡Ganaste!"
      : "Partida terminada";

  const subtitle = isDraw
    ? "Memorama terminó sin ganador único."
    : isWinner
      ? "Encontraste más parejas y ganaste la partida."
      : `${gameState.winnerName ?? "Otro jugador"} ganó esta partida.`;

  const tone = isDraw ? "draw" : isWinner ? "win" : "lose";

  return (
    <GameResultOverlay
      show={isFinished}
      tone={tone}
      title={title}
      subtitle={subtitle}
      winnerName={gameState.winnerName}
      resultText={
        isDraw
          ? "Ambos jugadores terminaron con el mismo marcador."
          : `${gameState.winnerName ?? "El ganador"} ganó Memorama.`
      }
      primaryActionLabel="Volver a sala"
      secondaryActionLabel={isHost ? "Revancha" : undefined}
      onPrimaryAction={onBackToSala}
      onSecondaryAction={isHost ? onRematch : undefined}
    />
  );
}