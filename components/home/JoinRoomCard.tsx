// 📍 Ruta del archivo: components/home/JoinRoomCard.tsx

import type { PlayerIdentity } from "@/lib/profile/getPlayerIdentity";
import type { Game, OpenRoom } from "@/lib/home/homeTypes";
import OpenRoomsPanel from "./OpenRoomsPanel";

type Props = {
  playerIdentity: PlayerIdentity | null;
  joinCode: string;
  joining: boolean;
  games: Game[];
  friendRooms: OpenRoom[];
  loadingFriendRooms: boolean;
  publicRooms: OpenRoom[];
  loadingPublicRooms: boolean;
  onJoinCodeChange: (code: string) => void;
  onJoinRoom: () => void;
  onOpenRoomJoin: (code: string) => void;
  onRefreshFriendRooms: () => void;
  onRefreshPublicRooms: () => void;
};

export default function JoinRoomCard({
  playerIdentity,
  joinCode,
  joining,
  games,
  friendRooms,
  loadingFriendRooms,
  publicRooms,
  loadingPublicRooms,
  onJoinCodeChange,
  onJoinRoom,
  onOpenRoomJoin,
  onRefreshFriendRooms,
  onRefreshPublicRooms,
}: Props) {
  return (
    <div className="rounded-[30px] border border-orange-500/15 bg-zinc-950/90 p-7 shadow-[0_0_40px_rgba(249,115,22,0.05)] transition hover:border-orange-500/25 hover:shadow-[0_0_60px_rgba(249,115,22,0.08)]">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-500/10 text-4xl text-orange-500">
        →
      </div>

      <h2 className="text-3xl font-bold">Unirse a sala</h2>
      <p className="mt-3 text-base leading-relaxed text-white/65">
        Ingresa un código de sala para unirte a una sesión existente.
      </p>

      {!playerIdentity && (
        <div className="mt-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
          Para unirte a una sala primero inicia sesión o entra como invitado.
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <input
          value={joinCode}
          onChange={(e) => onJoinCodeChange(e.target.value.toUpperCase())}
          placeholder="CÓDIGO"
          className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black px-4 py-3 text-center tracking-[0.3em] text-white outline-none transition focus:border-orange-500/50"
        />

        <button
          onClick={onJoinRoom}
          disabled={joining || !playerIdentity}
          className="rounded-2xl bg-white/10 px-5 py-3 font-bold transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {joining ? "Uniendo..." : "Unirse"}
        </button>
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-sm uppercase tracking-[0.18em] text-white/50">
          Consejo rápido
        </p>
        <p className="mt-2 text-sm leading-relaxed text-white/65">
          Comparte el código exacto de la sala con tu familia. En cuanto entren,
          podrán marcarse como listos y comenzar la partida.
        </p>
      </div>

      <div className="mt-6 space-y-5">
        <OpenRoomsPanel
          title="Salas de amigos"
          description="Partidas creadas por tus amigos."
          icon="👥"
          accent="cyan"
          label="Amigos"
          rooms={friendRooms}
          games={games}
          loading={loadingFriendRooms}
          emptyMessage="No hay salas de amigos activas."
          loadingMessage="Buscando salas de amigos..."
          onRefresh={onRefreshFriendRooms}
          onJoin={onOpenRoomJoin}
          canJoin={!!playerIdentity}
        />

        <OpenRoomsPanel
          title="Salas públicas"
          description="Partidas abiertas esperando jugadores."
          icon="🌍"
          accent="emerald"
          label="Pública"
          rooms={publicRooms}
          games={games}
          loading={loadingPublicRooms}
          emptyMessage="No hay salas públicas disponibles."
          loadingMessage="Buscando salas públicas..."
          onRefresh={onRefreshPublicRooms}
          onJoin={onOpenRoomJoin}
          canJoin={!!playerIdentity}
        />
      </div>
    </div>
  );
}
