"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Copy,
  Crown,
  Loader2,
  Sparkles,
  Users,
  Gamepad2,
} from "lucide-react";
import ShareRoomButton from "./ShareRoomButton";

type Player = {
  id: string;
  name: string;
  is_ready: boolean;
  is_host?: boolean;
  avatar_url?: string | null;
};

type RoomLobbyProps = {
  roomCode: string;
  players: Player[];
  currentUserId?: string;
  isStarting?: boolean;
  gameName?: string;
  onCopyCode?: () => void;
  onReadyToggle?: () => void;
  onStartGame?: () => void;
  canStart?: boolean;
  isCurrentUserReady?: boolean;
};

export default function RoomLobby({
  roomCode,
  players,
  currentUserId,
  isStarting = false,
  gameName = "Lotería Mexicana",
  onCopyCode,
  onReadyToggle,
  onStartGame,
  canStart = false,
  isCurrentUserReady = false,
}: RoomLobbyProps) {
  const [copied, setCopied] = useState(false);
  const [joinMessage, setJoinMessage] = useState<string | null>(null);
  const prevPlayersRef = useRef<Player[]>(players);

  const roomUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/sala/${roomCode}`
      : `/sala/${roomCode}`;

  const playerCount = players.length;
  const everyoneReady = players.length >= 2 && players.every((p) => p.is_ready);
  const waitingForMorePlayers = playerCount < 2;

  const statusText = useMemo(() => {
    if (isStarting) return "Iniciando partida...";
    if (everyoneReady) return "Todos listos";
    if (waitingForMorePlayers) return "Esperando jugadores...";
    return "Esperando que todos estén listos";
  }, [isStarting, everyoneReady, waitingForMorePlayers]);

  useEffect(() => {
    const prevIds = new Set(prevPlayersRef.current.map((p) => p.id));
    const newPlayer = players.find((p) => !prevIds.has(p.id));

    if (newPlayer && prevPlayersRef.current.length > 0) {
      setJoinMessage(`${newPlayer.name} se unió a la sala`);
      const timer = setTimeout(() => setJoinMessage(null), 2500);
      prevPlayersRef.current = players;
      return () => clearTimeout(timer);
    }

    prevPlayersRef.current = players;
  }, [players]);

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
      onCopyCode?.();
    } catch (error) {
      console.error("No se pudo copiar el código:", error);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0b] text-white">
      {/* Fondo */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-120px] h-[320px] w-[320px] -translate-x-1/2 rounded-full bg-orange-500/15 blur-3xl" />
        <div className="absolute bottom-[-80px] right-[-40px] h-[260px] w-[260px] rounded-full bg-orange-400/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,140,40,0.12),transparent_35%)]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        {/* Toast unión */}
        {joinMessage && (
          <div className="fixed left-1/2 top-5 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-top-3 duration-300">
            <div className="rounded-full border border-orange-400/30 bg-zinc-900/90 px-4 py-2 text-sm text-orange-100 shadow-lg backdrop-blur">
              <span className="inline-flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-orange-400" />
                {joinMessage}
              </span>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-xl sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-200">
                <Gamepad2 className="h-3.5 w-3.5" />
                Sala multijugador
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {gameName}
                </h1>
                <p className="mt-1 text-sm text-zinc-400">
                  Reúne a tu familia y prepárense para jugar.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="rounded-2xl border border-white/10 bg-zinc-900/80 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                    Código de sala
                  </p>
                  <div className="mt-1 text-2xl font-black tracking-[0.35em] text-orange-300">
                    {roomCode}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10 active:scale-[0.98]"
                >
                  <Copy className="h-4 w-4" />
                  {copied ? "Copiado" : "Copiar código"}
                </button>

                <ShareRoomButton roomCode={roomCode} roomUrl={roomUrl} gameName={gameName} />
              </div>
            </div>

            <div
              className={`rounded-2xl border px-4 py-3 transition ${
                everyoneReady
                  ? "border-emerald-400/30 bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.12)]"
                  : "border-orange-400/20 bg-orange-500/10"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    isStarting
                      ? "bg-orange-500/20 text-orange-300"
                      : everyoneReady
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-zinc-800 text-orange-300"
                  }`}
                >
                  {isStarting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : everyoneReady ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Clock3 className="h-5 w-5" />
                  )}
                </div>

                <div>
                  <p className="text-sm font-semibold">{statusText}</p>
                  <p className="text-xs text-zinc-400">
                    {playerCount}/2 jugadores conectados
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Layout principal */}
        <div className="grid flex-1 gap-6 lg:grid-cols-[1.25fr_0.9fr]">
          {/* Jugadores */}
          <section className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-xl sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold sm:text-xl">Jugadores en sala</h2>
                <p className="text-sm text-zinc-400">
                  Esperando confirmación de ambos participantes
                </p>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900/70 px-3 py-1 text-xs text-zinc-300">
                <Users className="h-3.5 w-3.5" />
                {playerCount}/2
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[0, 1].map((slot) => {
                const player = players[slot];

                if (!player) {
                  return (
                    <div
                      key={slot}
                      className="group relative overflow-hidden rounded-3xl border border-dashed border-white/10 bg-zinc-900/40 p-5 transition hover:border-orange-400/20 hover:bg-zinc-900/60"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 via-transparent to-orange-500/5 opacity-0 transition group-hover:opacity-100" />
                      <div className="relative flex min-h-[180px] flex-col items-center justify-center text-center">
                        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-500">
                          <Users className="h-6 w-6" />
                        </div>
                        <p className="font-semibold text-zinc-200">Esperando jugador...</p>
                        <p className="mt-1 max-w-[220px] text-sm text-zinc-500">
                          Comparte el código o el link de la sala para que alguien se una.
                        </p>
                      </div>
                    </div>
                  );
                }

                const isCurrentUser = player.id === currentUserId;

                return (
                  <div
                    key={player.id}
                    className={`group relative overflow-hidden rounded-3xl border p-5 transition duration-300 hover:-translate-y-1 ${
                      player.is_ready
                        ? "border-orange-400/30 bg-orange-500/10 shadow-[0_0_30px_rgba(249,115,22,0.14)]"
                        : "border-white/10 bg-zinc-900/60 hover:border-white/20"
                    }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
                    {player.is_ready && (
                      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-orange-400/15 blur-2xl" />
                    )}

                    <div className="relative flex items-start gap-4">
                      <div className="relative">
                        {player.avatar_url ? (
                          <img
                            src={player.avatar_url}
                            alt={player.name}
                            className="h-16 w-16 rounded-2xl object-cover ring-2 ring-white/10"
                          />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-300 text-xl font-bold text-white shadow-lg">
                            {player.name.charAt(0).toUpperCase()}
                          </div>
                        )}

                        {player.is_ready && (
                          <div className="absolute -bottom-1 -right-1 rounded-full border border-zinc-900 bg-emerald-400 p-1 text-zinc-950 shadow-md">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-base font-bold text-white sm:text-lg">
                            {player.name}
                          </h3>

                          {player.is_host && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-yellow-400/20 bg-yellow-500/10 px-2 py-0.5 text-[11px] font-medium text-yellow-300">
                              <Crown className="h-3 w-3" />
                              Host
                            </span>
                          )}

                          {isCurrentUser && (
                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-zinc-300">
                              Tú
                            </span>
                          )}
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                              player.is_ready
                                ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/20"
                                : "bg-zinc-800 text-zinc-300 ring-1 ring-white/10"
                            }`}
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${
                                player.is_ready ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"
                              }`}
                            />
                            {player.is_ready ? "Listo para jugar" : "Aún no está listo"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Acciones */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onReadyToggle}
                className={`inline-flex min-h-[52px] flex-1 items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition active:scale-[0.99] ${
                  isCurrentUserReady
                    ? "border border-emerald-400/30 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/20"
                    : "border border-orange-400/30 bg-orange-500 text-white shadow-lg shadow-orange-500/20 hover:bg-orange-400"
                }`}
              >
                {isCurrentUserReady ? "Listo ✅" : "Estoy listo"}
              </button>

              <button
                type="button"
                onClick={onStartGame}
                disabled={!canStart || isStarting}
                className={`inline-flex min-h-[52px] flex-1 items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition active:scale-[0.99] ${
                  canStart && !isStarting
                    ? "bg-white text-zinc-950 hover:bg-zinc-200"
                    : "cursor-not-allowed bg-zinc-800 text-zinc-500"
                }`}
              >
                {isStarting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Iniciando...
                  </span>
                ) : everyoneReady ? (
                  "Iniciar partida"
                ) : (
                  "Esperando listos"
                )}
              </button>
            </div>
          </section>

          {/* Preview / info lateral */}
          <aside className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">Preview del juego</h2>
                  <p className="text-sm text-zinc-400">{gameName}</p>
                </div>
                <div className="rounded-full border border-orange-400/20 bg-orange-500/10 px-3 py-1 text-xs text-orange-200">
                  En vivo
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <div
                      key={i}
                      className="aspect-square rounded-xl border border-white/5 bg-gradient-to-br from-zinc-800 to-zinc-900"
                    />
                  ))}
                </div>

                <div className="mt-4">
                  <p className="mb-2 text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Historial de cartas
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {["El Gallo", "La Sirena", "La Mano", "El Corazón"].map((card) => (
                      <span
                        key={card}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300"
                      >
                        {card}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section
              className={`rounded-3xl border p-5 transition ${
                everyoneReady
                  ? "border-emerald-400/25 bg-emerald-500/10 shadow-[0_0_25px_rgba(16,185,129,0.10)]"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <h3 className="text-base font-bold">Estado de la partida</h3>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-2xl bg-black/20 px-4 py-3">
                  <span className="text-sm text-zinc-300">Jugadores conectados</span>
                  <span className="text-sm font-semibold text-white">{playerCount}/2</span>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-black/20 px-4 py-3">
                  <span className="text-sm text-zinc-300">Juego seleccionado</span>
                  <span className="text-sm font-semibold text-orange-300">Lotería</span>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-black/20 px-4 py-3">
                  <span className="text-sm text-zinc-300">Listos para iniciar</span>
                  <span
                    className={`text-sm font-semibold ${
                      everyoneReady ? "text-emerald-300" : "text-zinc-300"
                    }`}
                  >
                    {everyoneReady ? "Sí" : "No todavía"}
                  </span>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-black/20 p-4">
                <p className="text-sm text-zinc-300">
                  {everyoneReady ? (
                    <span className="inline-flex items-center gap-2 text-emerald-300">
                      <Sparkles className="h-4 w-4 animate-pulse" />
                      Todo listo. Ya pueden comenzar la partida.
                    </span>
                  ) : waitingForMorePlayers ? (
                    <span className="text-zinc-400">
                      Comparte la sala para invitar al segundo jugador.
                    </span>
                  ) : (
                    <span className="text-zinc-400">
                      Ambos jugadores deben marcar “Estoy listo”.
                    </span>
                  )}
                </p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
