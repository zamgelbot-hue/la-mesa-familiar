// 📍 Ruta del archivo: components/games/secuencia-oculta/SecuenciaOcultaGame.tsx

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GameResultOverlay } from "@/components/games/core";

import SecuenciaOcultaBoard from "./SecuenciaOcultaBoard";
import SecuenciaOcultaHeader from "./SecuenciaOcultaHeader";
import SecuenciaOcultaPlayersPanel from "./SecuenciaOcultaPlayersPanel";
import SecuenciaOcultaResultSummary from "./SecuenciaOcultaResultSummary";
import SecuenciaOcultaStatusPanel from "./SecuenciaOcultaStatusPanel";

import type {
  SecuenciaCell,
  SecuenciaGameState,
  SecuenciaMove,
  SecuenciaPlayer,
} from "./secuenciaOcultaTypes";

import {
  clearFailedCells,
  createInitialSecuenciaGameState,
  getNextPlayer,
  getSecuenciaPlayerKey,
  getSecuenciaVariantLabel,
  hideAllCells,
  markFailedCell,
  revealCell,
} from "./secuenciaOcultaUtils";

type Props = {
  roomCode: string;
  roomVariant?: string | null;
  roomSettings?: Record<string, any> | null;
};

type RoomRow = {
  code: string;
  status: string;
  game_slug: string | null;
  game_variant: string | null;
  room_settings: Record<string, any> | null;
};

type RoomPlayerRow = {
  id: string;
  room_code: string;
  user_id: string | null;
  player_name: string;
  is_host: boolean | null;
  is_guest: boolean | null;
  is_ready: boolean | null;
  created_at: string;
};

const FAIL_HIDE_DELAY_MS = 850;

export default function SecuenciaOcultaGame({
  roomCode,
  roomVariant,
}: Props) {
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const hidingRef = useRef(false);

  const [room, setRoom] = useState<RoomRow | null>(null);
  const [roomPlayers, setRoomPlayers] = useState<RoomPlayerRow[]>([]);
  const [gameState, setGameState] = useState<SecuenciaGameState>(
    createInitialSecuenciaGameState(roomVariant, []),
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const currentPlayerName = useMemo(() => {
    if (typeof window === "undefined") return "";

    const canonical = localStorage.getItem(`lmf:player:${roomCode}`);

    if (canonical) {
      try {
        const parsed = JSON.parse(canonical);
        if (parsed?.playerName) return String(parsed.playerName);
      } catch {}
    }

    return (
      localStorage.getItem(`la-mesa-player-name-${roomCode}`) ||
      localStorage.getItem(`mesa-player-name-${roomCode}`) ||
      localStorage.getItem("playerName") ||
      ""
    );
  }, [roomCode]);

  const sortedRoomPlayers = useMemo(() => {
    return [...roomPlayers].sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    );
  }, [roomPlayers]);

  const players: SecuenciaPlayer[] = useMemo(() => {
    return sortedRoomPlayers.map((player) => ({
      key: getSecuenciaPlayerKey(player),
      name: player.player_name,
      isHost: !!player.is_host,
    }));
  }, [sortedRoomPlayers]);

  const currentRoomPlayer = useMemo(() => {
    return (
      sortedRoomPlayers.find(
        (player) => player.player_name === currentPlayerName,
      ) ??
      sortedRoomPlayers[0] ??
      null
    );
  }, [sortedRoomPlayers, currentPlayerName]);

  const currentPlayerKey = currentRoomPlayer
    ? getSecuenciaPlayerKey(currentRoomPlayer)
    : null;

  const isHost = !!currentRoomPlayer?.is_host;
  const isMyTurn =
    !!currentPlayerKey && gameState.currentTurnKey === currentPlayerKey;

  const variantLabel = getSecuenciaVariantLabel(
    gameState.variant ?? roomVariant,
  );

  const extractGameState = useCallback(
    (settings: Record<string, any> | null | undefined) => {
      const saved = settings?.secuencia_oculta;

      if (!saved) {
        return createInitialSecuenciaGameState(roomVariant, players);
      }

      return {
        ...createInitialSecuenciaGameState(roomVariant, players),
        ...saved,
        cells: saved.cells ?? [],
        moves: saved.moves ?? [],
      } as SecuenciaGameState;
    },
    [roomVariant, players],
  );

  const updateGameState = useCallback(
    async (updater: (current: SecuenciaGameState) => SecuenciaGameState) => {
      if (!room) return;

      setSaving(true);

      const currentSettings = room.room_settings ?? {};
      const currentState = extractGameState(currentSettings);
      const nextState = updater(currentState);

      const nextSettings = {
        ...currentSettings,
        secuencia_oculta: nextState,
      };

      const { error } = await supabase
        .from("rooms")
        .update({ room_settings: nextSettings })
        .eq("code", roomCode);

      if (error) {
        console.error("Error actualizando Secuencia Oculta:", error);
        alert("No se pudo actualizar la partida.");
      } else {
        setGameState(nextState);
        setRoom((prev) =>
          prev ? { ...prev, room_settings: nextSettings } : prev,
        );
      }

      setSaving(false);
    },
    [room, roomCode, supabase, extractGameState],
  );

  const loadRoom = useCallback(async () => {
    const { data, error } = await supabase
      .from("rooms")
      .select("code, status, game_slug, game_variant, room_settings")
      .eq("code", roomCode)
      .maybeSingle();

    if (error) {
      console.error("Error cargando sala:", error);
      return;
    }

    if (!data) return;

    setRoom(data as RoomRow);
    setGameState(extractGameState(data.room_settings));
  }, [supabase, roomCode, extractGameState]);

  const loadRoomPlayers = useCallback(async () => {
    const { data, error } = await supabase
      .from("room_players")
      .select(
        "id, room_code, user_id, player_name, is_host, is_guest, is_ready, created_at",
      )
      .eq("room_code", roomCode)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error cargando jugadores:", error);
      return;
    }

    setRoomPlayers((data ?? []) as RoomPlayerRow[]);
  }, [supabase, roomCode]);

  const ensureGameState = useCallback(async () => {
    if (!room || players.length < 1) return;

    const saved = room.room_settings?.secuencia_oculta;

    if (saved?.cells?.length) return;

    await updateGameState(() =>
      createInitialSecuenciaGameState(roomVariant, players),
    );
  }, [room, players, roomVariant, updateGameState]);

  const playToneSequence = (
    notes: number[],
    type: OscillatorType = "triangle",
    volume = 0.12,
    duration = 0.14,
  ) => {
    try {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;

      const audioContext = new AudioContextClass();

      notes.forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const startAt = audioContext.currentTime + index * 0.08;

        oscillator.type = type;
        oscillator.frequency.value = frequency;

        gain.gain.setValueAtTime(0.0001, startAt);
        gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.start(startAt);
        oscillator.stop(startAt + duration + 0.04);
      });
    } catch (error) {
      console.error("No se pudo reproducir sonido:", error);
    }
  };

  const playCorrectSound = () =>
    playToneSequence([523.25, 659.25], "triangle", 0.1, 0.12);

  const playFailSound = () =>
    playToneSequence([220, 146.83], "sawtooth", 0.08, 0.12);

  const playWinSound = () =>
    playToneSequence([523.25, 659.25, 783.99, 1046.5], "triangle", 0.18, 0.2);

  const handleCellClick = async (cell: SecuenciaCell) => {
    if (!currentPlayerKey || !currentRoomPlayer) return;
    if (gameState.phase !== "playing") return;
    if (!isMyTurn) return;
    if (saving || hidingRef.current) return;

    const expected = gameState.nextNumber;
    const correct = cell.value === expected;

    const move: SecuenciaMove = {
      id: crypto.randomUUID(),
      playerKey: currentPlayerKey,
      playerName: currentRoomPlayer.player_name,
      value: cell.value,
      correct,
      createdAt: new Date().toISOString(),
    };

    if (correct) {
      await updateGameState((current) => {
        const winner = expected >= current.maxNumber;

        return {
          ...current,
          phase: winner ? "finished" : current.phase,
          winnerKey: winner ? currentPlayerKey : current.winnerKey,
          winnerName: winner
            ? currentRoomPlayer.player_name
            : current.winnerName,
          nextNumber: winner ? current.nextNumber : current.nextNumber + 1,
          cells: revealCell(clearFailedCells(current.cells), cell.id),
          moves: [move, ...(current.moves ?? [])],
        };
      });

      if (expected >= gameState.maxNumber) {
        playWinSound();
      } else {
        playCorrectSound();
      }

      return;
    }

    const nextPlayer = getNextPlayer(players, currentPlayerKey);

    await updateGameState((current) => ({
      ...current,
      currentTurnKey: nextPlayer?.key ?? current.currentTurnKey,
      currentTurnName: nextPlayer?.name ?? current.currentTurnName,
      cells: markFailedCell(current.cells, cell.id),
      moves: [move, ...(current.moves ?? [])],
    }));

    playFailSound();

    hidingRef.current = true;

    window.setTimeout(() => {
      void updateGameState((current) => ({
        ...current,
        cells: hideAllCells(current.cells),
      })).finally(() => {
        hidingRef.current = false;
      });
    }, FAIL_HIDE_DELAY_MS);
  };

  const handleRematch = async () => {
    await updateGameState(() =>
      createInitialSecuenciaGameState(roomVariant, players),
    );
  };

  const handleBackToSala = async () => {
    const ok = window.confirm(
      "¿Quieres volver a sala? Todos los jugadores regresarán a la sala.",
    );

    if (!ok) return;

    const { error } = await supabase
      .from("rooms")
      .update({ status: "waiting" })
      .eq("code", roomCode);

    if (error) {
      console.error("Error volviendo a sala:", error);
      alert("No se pudo volver a sala.");
      return;
    }

    router.replace(`/sala/${roomCode}`);
  };

  const handleCloseRoom = async () => {
    if (!isHost) return;

    const ok = window.confirm("¿Seguro que quieres terminar la sala?");
    if (!ok) return;

    const { error } = await supabase
      .from("rooms")
      .update({ status: "closed" })
      .eq("code", roomCode);

    if (error) {
      console.error("Error cerrando sala:", error);
      alert("No se pudo cerrar la sala.");
      return;
    }

    await supabase.from("room_players").delete().eq("room_code", roomCode);
    router.replace("/");
  };

  useEffect(() => {
    const boot = async () => {
      setLoading(true);
      await Promise.all([loadRoomPlayers(), loadRoom()]);
      setLoading(false);
    };

    void boot();
  }, [loadRoom, loadRoomPlayers]);

  useEffect(() => {
    const channel = supabase
      .channel(`secuencia-oculta-${roomCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rooms",
          filter: `code=eq.${roomCode}`,
        },
        () => {
          void loadRoom();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_players",
          filter: `room_code=eq.${roomCode}`,
        },
        () => {
          void loadRoomPlayers();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, roomCode, loadRoom, loadRoomPlayers]);

  useEffect(() => {
    if (!room) return;

    if (room.status === "waiting") {
      router.replace(`/sala/${roomCode}`);
    }

    if (room.status === "closed") {
      router.replace("/");
    }
  }, [room?.status, router, roomCode]);

  useEffect(() => {
    void ensureGameState();
  }, [ensureGameState]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto max-w-5xl rounded-[32px] border border-white/10 bg-zinc-950 p-8 text-center">
          <p className="text-2xl font-black">Cargando Secuencia Oculta...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white md:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <SecuenciaOcultaHeader
          roomCode={roomCode}
          variantLabel={variantLabel}
          isHost={isHost}
          onBackToSala={handleBackToSala}
          onCloseRoom={handleCloseRoom}
        />

        <GameResultOverlay
          show={gameState.phase === "finished"}
          tone={gameState.winnerKey === currentPlayerKey ? "win" : "lose"}
          title={
            gameState.winnerKey === currentPlayerKey
              ? "¡Ganaste la secuencia!"
              : "Secuencia completada"
          }
          subtitle={
            gameState.winnerName
              ? `${gameState.winnerName} descifró el orden completo.`
              : "La partida terminó."
          }
          winnerName={gameState.winnerName}
          resultText="Secuencia Oculta finalizada"
          primaryActionLabel="Revancha"
          secondaryActionLabel="Volver a sala"
          onPrimaryAction={handleRematch}
          onSecondaryAction={handleBackToSala}
        />

        <section className="grid gap-5 xl:grid-cols-[340px_1fr]">
          <aside className="space-y-5">
            <SecuenciaOcultaPlayersPanel
              players={players}
              gameState={gameState}
              currentPlayerKey={currentPlayerKey}
            />

            <SecuenciaOcultaStatusPanel
              gameState={gameState}
              isMyTurn={isMyTurn}
            />

            <SecuenciaOcultaResultSummary moves={gameState.moves} />
          </aside>

          <SecuenciaOcultaBoard
            cells={gameState.cells}
            boardSize={gameState.boardSize}
            isMyTurn={isMyTurn}
            disabled={
              gameState.phase !== "playing" ||
              !isMyTurn ||
              saving ||
              hidingRef.current
            }
            onCellClick={handleCellClick}
          />
        </section>
      </div>
    </main>
  );
}