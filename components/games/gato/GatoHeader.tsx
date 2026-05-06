// 📍 Ruta del archivo: components/games/gato/GatoHeader.tsx

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
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-[0_0_40px_rgba(255,255,255,0.03)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-white/45">
            La Mesa Familiar
          </p>

          <h1 className="mt-1 text-3xl font-black text-white">El Gato</h1>

          <div className="mt-2 space-y-1 text-sm text-white/70">
            <p>
              Sala: <span className="font-bold text-white">{roomCode}</span>
            </p>
            <p>
              Estado:{" "}
              <span className="font-bold text-orange-200">{roomStatus}</span>
            </p>
            <p>
              Jugador actual:{" "}
              <span className="font-bold text-emerald-300">
                {currentPlayerName || "Detectando..."}
              </span>
            </p>
          </div>

          {isVsBot && (
            <div className="mt-3 inline-flex rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-3 py-1.5 text-xs font-bold text-cyan-200">
              Modo contra bot · recompensa mínima: 1 punto
            </div>
          )}
        </div>

        <div className="flex flex-col items-start gap-3 md:items-end">
          <div className="rounded-2xl bg-black/25 px-5 py-3 text-center">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-white/40">
              Variante
            </p>
            <p className="text-lg font-black text-yellow-300">{modeLabel}</p>
          </div>

          <button
            type="button"
            onClick={onBackToRoom}
            className="rounded-2xl bg-orange-500 px-4 py-2 text-sm font-bold text-black transition hover:bg-orange-400"
          >
            Volver a sala
          </button>
        </div>
      </div>
    </div>
  );
}