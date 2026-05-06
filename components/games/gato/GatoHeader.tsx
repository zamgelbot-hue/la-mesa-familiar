// 📍 Ruta del archivo: components/games/gato/GatoHeader.tsx

import {
  GameBadge,
  GamePrimaryButton,
  GameTopBar,
} from "@/components/games/core";

type Props = {
  roomCode: string;
  roomStatus: string;
  currentPlayerName: string;
  modeLabel: string;
  isVsBot: boolean;
  onBackToRoom: () => void;
};

export default function GatoHeader({
  roomCode,
  roomStatus,
  currentPlayerName,
  modeLabel,
  isVsBot,
  onBackToRoom,
}: Props) {
  return (
    <div>
      <GameTopBar
        title="El Gato"
        subtitle="La Mesa Familiar"
        rightContent={
          <div className="flex flex-col items-start gap-3 md:items-end">
            <div className="rounded-2xl border border-white/10 bg-black/25 px-5 py-3 text-center">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/40">
                Variante
              </p>

              <p className="text-lg font-black text-yellow-300">{modeLabel}</p>
            </div>

            <GamePrimaryButton onClick={onBackToRoom}>
              Volver a sala
            </GamePrimaryButton>
          </div>
        }
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <GameBadge tone="orange">Sala: {roomCode}</GameBadge>

        <GameBadge tone="warning">Estado: {roomStatus}</GameBadge>

        <GameBadge tone="success">
          Jugador: {currentPlayerName || "Detectando..."}
        </GameBadge>

        {isVsBot && (
          <GameBadge className="border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
            VS BOT · recompensa mínima: 1 punto
          </GameBadge>
        )}
      </div>
    </div>
  );
}