// 📍 Ruta del archivo: components/games/loteria-mexicana/LoteriaHeader.tsx

import { GameSecondaryButton } from "@/components/games/core";

type Props = {
  roomCode: string;
  deckName: string;
  gameStatusLabel: string;
  isHost: boolean;
  leavingToRoom: boolean;
  onBackToRoom: () => void;
  onTerminateMatch: () => void;
};

export default function LoteriaHeader({
  roomCode,
  deckName,
  gameStatusLabel,
  isHost,
  leavingToRoom,
  onBackToRoom,
  onTerminateMatch,
}: Props) {
  return (
    <section className="rounded-[32px] border border-orange-500/20 bg-zinc-950/95 p-6 shadow-[0_0_40px_rgba(249,115,22,0.06)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-300/80">
            La Mesa Familiar
          </p>

          <h1 className="mt-2 text-3xl font-black md:text-4xl">
            🎴 Lotería Mexicana
          </h1>

          <p className="mt-2 text-sm text-white/60">
            Sala: <span className="font-bold text-orange-300">{roomCode}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
              Estado
            </p>
            <p className="mt-1 font-bold text-white">{gameStatusLabel}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
              Deck
            </p>
            <p className="mt-1 font-bold text-white">{deckName}</p>
          </div>

          <GameSecondaryButton onClick={onBackToRoom} disabled={leavingToRoom}>
            {leavingToRoom ? "Volviendo..." : "Volver a sala"}
          </GameSecondaryButton>

          {isHost && (
            <button
              type="button"
              onClick={onTerminateMatch}
              disabled={leavingToRoom}
              className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {leavingToRoom ? "Terminando..." : "Terminar partida"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}