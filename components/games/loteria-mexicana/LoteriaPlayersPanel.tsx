// 📍 Ruta del archivo: components/games/loteria-mexicana/LoteriaPlayersPanel.tsx

type RoomPlayerRow = {
  id: string;
  user_id: string | null;
  player_name: string;
  is_host: boolean | null;
  is_guest: boolean | null;
  is_ready: boolean | null;
};

type Props = {
  roomPlayers: RoomPlayerRow[];
  currentPlayerName?: string | null;
  opponentName?: string | null;
  calledCount: number;
  winnerLabel?: string | null;
  matchFinished: boolean;
};

export default function LoteriaPlayersPanel({
  roomPlayers,
  currentPlayerName,
  opponentName,
  calledCount,
  winnerLabel,
  matchFinished,
}: Props) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
          Jugador actual
        </p>
        <p className="mt-1 text-lg font-bold text-white">
          {currentPlayerName ?? "Jugador"}
        </p>
      </div>

      <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
          Rival
        </p>
        <p className="mt-1 text-lg font-bold text-white">
          {opponentName ?? "Esperando rival"}
        </p>
      </div>

      <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
          Cartas cantadas
        </p>
        <p className="mt-1 text-lg font-bold text-orange-300">{calledCount}</p>
      </div>

      <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
          Resultado
        </p>
        <p className="mt-1 text-lg font-bold text-white">
          {winnerLabel
            ? `${winnerLabel} ganó`
            : matchFinished
              ? "Partida finalizada"
              : `${roomPlayers.length} jugador(es)`}
        </p>
      </div>
    </section>
  );
}