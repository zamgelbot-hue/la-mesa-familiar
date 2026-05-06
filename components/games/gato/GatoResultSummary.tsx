// 📍 Ruta del archivo: components/games/gato/GatoResultSummary.tsx

import type { GatoState, RoomPlayer } from "./utils";

type Props = {
  state: GatoState;
  players: RoomPlayer[];
};

export default function GatoResultSummary({ state, players }: Props) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-5">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-200">
        Resumen
      </p>

      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between rounded-2xl bg-black/25 px-4 py-3">
          <span className="text-sm text-white/60">Estado</span>
          <span className="font-bold text-white">
            {state.match_over
              ? state.is_draw
                ? "Empate"
                : "Partida terminada"
              : "En juego"}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-black/25 px-4 py-3">
          <span className="text-sm text-white/60">Turno</span>
          <span className="font-bold text-white">
            {state.match_over ? "Finalizado" : state.current_turn ?? "Pendiente"}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-black/25 px-4 py-3">
          <span className="text-sm text-white/60">Tablero</span>
          <span className="font-bold text-white">
            {state.board_size}x{state.board_size}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-black/25 px-4 py-3">
          <span className="text-sm text-white/60">Para ganar</span>
          <span className="font-bold text-white">{state.win_length} en línea</span>
        </div>

        {state.bonus_win_length && (
          <div className="flex items-center justify-between rounded-2xl border border-yellow-400/20 bg-yellow-500/10 px-4 py-3">
            <span className="text-sm text-yellow-100/75">Bonus</span>
            <span className="font-bold text-yellow-200">
              {state.bonus_win_length} en línea
            </span>
          </div>
        )}

        <div className="rounded-2xl bg-black/25 px-4 py-3">
          <p className="text-sm text-white/60">Jugadores</p>

          <div className="mt-3 space-y-2">
            {players.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.04] px-3 py-2"
              >
                <span className="truncate text-sm font-semibold text-white">
                  {player.player_name}
                </span>

                <span className="text-sm font-bold text-orange-200">
                  {state.symbols[player.player_name] ?? "?"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {state.result_text && (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3">
            <p className="text-sm font-bold text-emerald-200">
              {state.result_text}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}