// 📍 Ruta del archivo: components/room/RoomActionsBar.tsx

type Props = {
  isHost: boolean;
  isReady: boolean;
  canStartGame: boolean;
  starting: boolean;
  leaving: boolean;
  roomStatus: string;
  onToggleReady: () => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
};

export default function RoomActionsBar({
  isHost,
  isReady,
  canStartGame,
  starting,
  leaving,
  roomStatus,
  onToggleReady,
  onStartGame,
  onLeaveRoom,
}: Props) {
  const waitingRoom = roomStatus === "waiting";

  return (
    <div className="rounded-[30px] border border-white/10 bg-zinc-950/90 p-5">
      <div className="flex flex-col gap-4">
        {waitingRoom && (
          <>
            <button
              type="button"
              onClick={onToggleReady}
              className={`rounded-2xl px-5 py-4 text-lg font-extrabold transition ${
                isReady
                  ? "bg-emerald-500 text-black hover:bg-emerald-400"
                  : "bg-orange-500 text-black hover:bg-orange-400"
              }`}
            >
              {isReady ? "✅ Estoy listo" : "🟠 Marcar listo"}
            </button>

            {isHost && (
              <button
                type="button"
                onClick={onStartGame}
                disabled={!canStartGame || starting}
                className="rounded-2xl bg-cyan-500 px-5 py-4 text-lg font-extrabold text-black transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {starting ? "Iniciando..." : "🎮 Iniciar partida"}
              </button>
            )}
          </>
        )}

        <button
          type="button"
          onClick={onLeaveRoom}
          disabled={leaving}
          className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-lg font-bold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {leaving
            ? "Saliendo..."
            : isHost
              ? "Cerrar sala"
              : "Salir de la sala"}
        </button>
      </div>
    </div>
  );
}
