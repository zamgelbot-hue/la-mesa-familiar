// 📍 Ruta del archivo: components/room/RoomAccessNotice.tsx

import Link from "next/link";
import type { RoomPlayer } from "@/lib/room/roomTypes";

type Props = {
  code: string;
  needsAccess: boolean;
  needsIdentitySelection: boolean;
  players: RoomPlayer[];
  onSelectIdentity: (playerName: string) => void;
};

export default function RoomAccessNotice({
  code,
  needsAccess,
  needsIdentitySelection,
  players,
  onSelectIdentity,
}: Props) {
  if (needsAccess) {
    return (
      <div className="relative mt-8 rounded-[28px] border border-cyan-400/25 bg-cyan-500/10 p-6">
        <p className="text-lg font-semibold text-cyan-300">
          Para unirte a esta sala primero necesitas una identidad activa
        </p>

        <p className="mt-1 text-white/70">
          Puedes iniciar sesión, crear tu cuenta o entrar como invitado.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={`/acceso?next=${encodeURIComponent(`/sala/${code}`)}`}
            className="rounded-2xl bg-orange-500 px-5 py-3 font-bold text-black transition hover:bg-orange-400"
          >
            Continuar
          </Link>

          <Link
            href="/"
            className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-bold text-white transition hover:bg-white/10"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  if (needsIdentitySelection) {
    return (
      <div className="relative mt-8 rounded-[28px] border border-cyan-400/25 bg-cyan-500/10 p-6">
        <p className="text-lg font-semibold text-cyan-300">
          Este navegador todavía no sabe qué jugador eres
        </p>

        <p className="mt-1 text-white/70">
          Selecciona tu identidad una sola vez en este navegador.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {players.map((player) => (
            <button
              key={player.id}
              onClick={() => onSelectIdentity(player.player_name)}
              className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4 text-left transition hover:bg-white/15"
            >
              <p className="text-lg font-bold">
                {player.player_name} {player.is_host ? "👑" : ""}
              </p>

              <p className="text-sm text-white/60">
                Usar esta identidad en este navegador
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
