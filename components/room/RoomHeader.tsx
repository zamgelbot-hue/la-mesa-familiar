// 📍 Ruta del archivo: components/room/RoomHeader.tsx

import ShareRoomButton from "@/components/room/ShareRoomButton";
import type { Game, Room } from "@/lib/room/roomTypes";

type Props = {
  code: string;
  room: Room;
  game: Game | null;
  copied: boolean;
  joiningInvite: boolean;
  starting: boolean;
  allReady: boolean;
  sortedPlayersCount: number;
  roomMaxPlayers: number;
  minPlayersToStart: number;
  isVsBot: boolean;
  variantLabel: string;
  onCopyCode: () => void;
};

export default function RoomHeader({
  code,
  room,
  game,
  copied,
  joiningInvite,
  starting,
  allReady,
  sortedPlayersCount,
  roomMaxPlayers,
  minPlayersToStart,
  isVsBot,
  variantLabel,
  onCopyCode,
}: Props) {
  return (
    <div className="relative overflow-hidden rounded-[34px] border border-white/10 bg-zinc-950/90 p-6 shadow-[0_0_40px_rgba(249,115,22,0.05)] md:p-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-120px] h-[260px] w-[260px] -translate-x-1/2 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute bottom-[-80px] right-[-40px] h-[220px] w-[220px] rounded-full bg-orange-400/10 blur-3xl" />
      </div>

      <div className="relative flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="inline-flex items-center rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-200">
            Lobby
          </div>

          <h1 className="mt-4 text-4xl font-extrabold md:text-5xl">
            {game?.name ?? "Sala"}
          </h1>

          <p className="mt-3 text-base text-white/70 md:text-lg">
            {sortedPlayersCount}/{roomMaxPlayers}{" "}
            {isVsBot ? "jugador" : "jugadores"} —{" "}
            {joiningInvite
              ? "Uniéndote a la sala..."
              : starting
                ? "Iniciando partida..."
                : allReady
                  ? "Todo listo"
                  : sortedPlayersCount < minPlayersToStart
                    ? "Esperando jugadores..."
                    : "Esperando confirmación"}
          </p>

          <p className="mt-2 text-sm text-orange-200">
            Variante activa:{" "}
            <span className="font-bold text-white">{variantLabel}</span>
          </p>

          <p className="mt-2 text-sm text-white/55">
            Tipo de sala:{" "}
            <span className="font-bold text-white">
              {room.visibility === "public"
                ? "Pública 🌍"
                : room.visibility === "friends"
                  ? "Solo amigos 👥"
                  : "Privada 🔒"}
            </span>
          </p>

          {isVsBot && (
            <p className="mt-2 inline-flex rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-sm font-bold text-cyan-200">
              Modo contra bot · recompensa mínima 1 punto
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4 xl:items-end">
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl bg-orange-500 px-5 py-3 text-xl font-extrabold tracking-[0.25em] text-black shadow-[0_0_25px_rgba(249,115,22,0.18)] sm:text-2xl">
              {room.code}
            </div>

            <button
              onClick={onCopyCode}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-bold text-white transition hover:bg-white/10"
            >
              {copied ? "Copiado" : "Copiar código"}
            </button>

            <ShareRoomButton
              roomCode={room.code}
              roomUrl={
                typeof window !== "undefined"
                  ? `${window.location.origin}/sala/${room.code}`
                  : undefined
              }
              gameName={game?.name ?? "La Mesa Familiar"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
