// 📍 Ruta del archivo: components/games/loteria-mexicana/LoteriaResultSummary.tsx

type Props = {
  winnerLabel?: string | null;
  patternLabel: string;
  currentPlayerRematchReady: boolean;
  allPlayersReadyForRematch: boolean;
  isHost: boolean;
  rematchLoading: boolean;
  leavingToRoom: boolean;
  rematchReadyCount: number;
  totalPlayers: number;
  onVoteRematch: () => void;
  onRematch: () => void;
  onTerminateMatch: () => void;
  onBackToRoom: () => void;
};

export default function LoteriaResultSummary({
  winnerLabel,
  patternLabel,
  currentPlayerRematchReady,
  allPlayersReadyForRematch,
  isHost,
  rematchLoading,
  leavingToRoom,
  rematchReadyCount,
  totalPlayers,
  onVoteRematch,
  onRematch,
  onTerminateMatch,
  onBackToRoom,
}: Props) {
  return (
    <section className="rounded-[32px] border border-emerald-500/20 bg-emerald-500/10 p-6 shadow-[0_0_30px_rgba(16,185,129,0.08)]">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300/80">
        Resultado final
      </p>

      <h2 className="mt-2 text-3xl font-extrabold text-white">
        {winnerLabel ? `${winnerLabel} ganó la partida` : "La partida terminó"}
      </h2>

      <p className="mt-3 text-white/65">
        Patrón ganador:{" "}
        <span className="font-bold text-emerald-300">{patternLabel}</span>
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        {!currentPlayerRematchReady && (
          <button
            type="button"
            onClick={onVoteRematch}
            disabled={rematchLoading}
            className="rounded-2xl bg-orange-500 px-5 py-3 font-bold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {rematchLoading ? "Preparando..." : "Quiero revancha"}
          </button>
        )}

        {isHost && allPlayersReadyForRematch && (
          <button
            type="button"
            onClick={onRematch}
            disabled={rematchLoading}
            className="rounded-2xl bg-emerald-500 px-5 py-3 font-bold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {rematchLoading ? "Reiniciando..." : "Iniciar revancha"}
          </button>
        )}

        {isHost && (
          <button
            type="button"
            onClick={onTerminateMatch}
            disabled={leavingToRoom}
            className="rounded-2xl bg-red-500/90 px-4 py-3 font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {leavingToRoom ? "Terminando..." : "Terminar partida"}
          </button>
        )}

        <button
          type="button"
          onClick={onBackToRoom}
          disabled={leavingToRoom}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {leavingToRoom ? "Volviendo..." : "Volver a sala"}
        </button>
      </div>

      <p className="mt-4 text-sm text-white/60">
        Revancha:{" "}
        <span className="font-semibold text-white">
          {rematchReadyCount}/{Math.max(totalPlayers, 2)}
        </span>
      </p>
    </section>
  );
}