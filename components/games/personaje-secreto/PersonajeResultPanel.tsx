// 📍 Ruta del archivo: components/games/personaje-secreto/PersonajeResultPanel.tsx

import { GameResultOverlay } from "@/components/games/core";

type Props = {
  show: boolean;
  winnerName: string | null;
  isWinner: boolean;
  isHost: boolean;
  onBackToSala: () => void;
  onRematch: () => void;
};

export default function PersonajeResultPanel({
  show,
  winnerName,
  isWinner,
  isHost,
  onBackToSala,
  onRematch,
}: Props) {
  return (
    <GameResultOverlay
      show={show}
      tone={isWinner ? "win" : "lose"}
      title={isWinner ? "¡Descubriste el personaje!" : "Partida terminada"}
      subtitle={
        winnerName
          ? `${winnerName} ganó Personaje Secreto`
          : "La partida ha terminado."
      }
      resultText={
        winnerName
          ? `${winnerName} adivinó correctamente el personaje secreto.`
          : "Se terminó la partida."
      }
      winnerName={winnerName}
      pointsText="Recompensas calculadas por victoria y participación."
      primaryActionLabel="Volver a sala"
      secondaryActionLabel={isHost ? "Revancha" : undefined}
      onPrimaryAction={onBackToSala}
      onSecondaryAction={isHost ? onRematch : undefined}
    />
  );
}