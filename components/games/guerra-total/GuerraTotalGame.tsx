// 📍 Ruta del archivo: components/games/guerra-total/GuerraTotalGame.tsx

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GameResultOverlay } from "@/components/games/core";

import GuerraTotalBoard from "./GuerraTotalBoard";
import GuerraTotalHeader from "./GuerraTotalHeader";
import GuerraTotalPlayerPanel from "./GuerraTotalPlayerPanel";
import GuerraTotalResultSummary from "./GuerraTotalResultSummary";
import GuerraTotalShipsPanel from "./GuerraTotalShipsPanel";
import GuerraTotalStatusPanel from "./GuerraTotalStatusPanel";

import type {
  GtCell,
  GtGameState,
  GtOrientation,
  GtRoomPlayer,
  GtShot,
  GtVariant,
} from "./guerraTotalTypes";

import {
  allShipsPlaced,
  allShipsSunk,
  buildShipCells,
  createEmptyPlayerBoard,
  createInitialGtGameState,
  createShipFromTemplate,
  getGtPlayerKey,
  getGtVariantTheme,
  getNextUnplacedShipId,
  getRandomFirstTurn,
  GT_DEFAULT_BOARD_SIZE,
  GT_SHIP_TEMPLATES,
  hasAlreadyShot,
  isPlacementValid,
  resolveShot,
} from "./guerraTotalUtils";

type GuerraTotalGameProps = {
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

export default function GuerraTotalGame({
  roomCode,
  roomVariant,
}: GuerraTotalGameProps) {
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const winSoundPlayedRef = useRef(false);

  const [room, setRoom] = useState<RoomRow | null>(null);
  const [players, setPlayers] = useState<GtRoomPlayer[]>([]);
  const [gameState, setGameState] = useState<GtGameState>(
    createInitialGtGameState(
      (roomVariant as GtVariant) ?? "mar",
      GT_DEFAULT_BOARD_SIZE,
    ),
  );

  const [selectedShipId, setSelectedShipId] = useState(
    GT_SHIP_TEMPLATES[0].id,
  );
  const [orientation, setOrientation] =
    useState<GtOrientation>("horizontal");
  const [hoveredCell, setHoveredCell] = useState<GtCell | null>(null);
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

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    );
  }, [players]);

  const currentPlayer = useMemo(() => {
    return (
      sortedPlayers.find((player) => player.player_name === currentPlayerName) ??
      null
    );
  }, [sortedPlayers, currentPlayerName]);

  const currentPlayerKey = currentPlayer
    ? getGtPlayerKey(currentPlayer)
    : null;

  const isHost = !!currentPlayer?.is_host;

  const opponent = useMemo(() => {
    if (!currentPlayerKey) return null;

    return (
      sortedPlayers.find(
        (player) => getGtPlayerKey(player) !== currentPlayerKey,
      ) ?? null
    );
  }, [sortedPlayers, currentPlayerKey]);

  const opponentKey = opponent ? getGtPlayerKey(opponent) : null;

  const myBoard = currentPlayerKey
    ? gameState.boards[currentPlayerKey] ?? null
    : null;

  const opponentBoard = opponentKey
    ? gameState.boards[opponentKey] ?? null
    : null;

  const theme = getGtVariantTheme(gameState.variant ?? roomVariant);
  const boardSize = gameState.boardSize ?? GT_DEFAULT_BOARD_SIZE;
  const isMyTurn =
    !!currentPlayerKey && gameState.currentTurnKey === currentPlayerKey;

  const selectedTemplate = useMemo(() => {
    return (
      GT_SHIP_TEMPLATES.find((ship) => ship.id === selectedShipId) ??
      GT_SHIP_TEMPLATES[0]
    );
  }, [selectedShipId]);

  const placedShipIds = useMemo(() => {
    return new Set((myBoard?.ships ?? []).map((ship) => ship.id));
  }, [myBoard]);

  const previewCells = useMemo(() => {
    if (!hoveredCell || gameState.phase !== "placing" || myBoard?.ready) {
      return [];
    }

    return buildShipCells(hoveredCell, selectedTemplate.size, orientation);
  }, [
    hoveredCell,
    gameState.phase,
    myBoard?.ready,
    selectedTemplate.size,
    orientation,
  ]);

  const previewIsValid = useMemo(() => {
    if (!hoveredCell || previewCells.length === 0) return false;

    return isPlacementValid(previewCells, myBoard?.ships ?? [], boardSize);
  }, [hoveredCell, previewCells, myBoard?.ships, boardSize]);

  const extractGtState = useCallback(
    (settings: Record<string, any> | null | undefined): GtGameState => {
      const saved = settings?.guerra_total;

      if (!saved) {
        return createInitialGtGameState(
          (roomVariant as GtVariant) ?? "mar",
          GT_DEFAULT_BOARD_SIZE,
        );
      }

      return {
        ...createInitialGtGameState(
          (roomVariant as GtVariant) ?? "mar",
          GT_DEFAULT_BOARD_SIZE,
        ),
        ...saved,
        boards: saved.boards ?? {},
        shots: saved.shots ?? [],
      };
    },
    [roomVariant],
  );

  const updateGtState = useCallback(
    async (updater: (current: GtGameState) => GtGameState) => {
      if (!room) return;

      setSaving(true);

      const currentSettings = room.room_settings ?? {};
      const currentState = extractGtState(currentSettings);
      const nextState = updater(currentState);

      const nextSettings = {
        ...currentSettings,
        guerra_total: nextState,
      };

      const { error } = await supabase
        .from("rooms")
        .update({ room_settings: nextSettings })
        .eq("code", roomCode);

      if (error) {
        console.error("Error actualizando Guerra Total:", error);
        alert("No se pudo actualizar la partida.");
      } else {
        setGameState(nextState);
        setRoom((prev) =>
          prev ? { ...prev, room_settings: nextSettings } : prev,
        );
      }

      setSaving(false);
    },
    [room, roomCode, supabase, extractGtState],
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

    if (data.status === "closed") {
      router.replace("/");
      return;
    }

    if (data.status === "waiting") {
      router.replace(`/sala/${roomCode}`);
      return;
    }

    setRoom(data as RoomRow);
    setGameState(extractGtState(data.room_settings));
  }, [roomCode, router, supabase, extractGtState]);

  const loadPlayers = useCallback(async () => {
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

    setPlayers((data ?? []) as GtRoomPlayer[]);
  }, [roomCode, supabase]);

  const playToneSequence = (
    notes: number[],
    type: OscillatorType = "triangle",
    volume = 0.14,
    duration = 0.16,
  ) => {
    try {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;

      const audioContext = new AudioContextClass();

      notes.forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const startAt = audioContext.currentTime + index * 0.1;

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

  const playPlaceSound = () =>
    playToneSequence([392, 523.25], "sine", 0.1, 0.12);

  const playWaterSound = () =>
    playToneSequence([196, 164.81], "sine", 0.08, 0.14);

  const playHitSound = () =>
    playToneSequence([110, 220, 110], "sawtooth", 0.11, 0.12);

  const playSunkSound = () =>
    playToneSequence([220, 293.66, 392], "square", 0.1, 0.14);

  const playWinSound = () =>
    playToneSequence([523.25, 659.25, 783.99, 1046.5], "triangle", 0.22, 0.28);

  const ensureMyBoard = async () => {
    if (!currentPlayer || !currentPlayerKey) return;

    await updateGtState((current) => {
      if (current.boards[currentPlayerKey]) return current;

      return {
        ...current,
        variant: (roomVariant as GtVariant) ?? current.variant ?? "mar",
        boardSize: current.boardSize ?? GT_DEFAULT_BOARD_SIZE,
        boards: {
          ...current.boards,
          [currentPlayerKey]: createEmptyPlayerBoard(
            currentPlayerKey,
            currentPlayer.player_name,
          ),
        },
      };
    });
  };

  const handlePlaceShip = async (cell: GtCell) => {
    if (!currentPlayer || !currentPlayerKey) return;
    if (gameState.phase !== "placing") return;

    if (placedShipIds.has(selectedTemplate.id)) {
      alert("Esa unidad ya fue colocada.");
      return;
    }

    const currentBoard =
      myBoard ??
      createEmptyPlayerBoard(currentPlayerKey, currentPlayer.player_name);

    const cells = buildShipCells(cell, selectedTemplate.size, orientation);

    if (!isPlacementValid(cells, currentBoard.ships, boardSize)) {
      alert("No puedes colocar esa unidad ahí.");
      return;
    }

    const nextShip = createShipFromTemplate(selectedTemplate, cells);

    await updateGtState((current) => {
      const board =
        current.boards[currentPlayerKey] ??
        createEmptyPlayerBoard(currentPlayerKey, currentPlayer.player_name);

      return {
        ...current,
        boards: {
          ...current.boards,
          [currentPlayerKey]: {
            ...board,
            ships: [...board.ships, nextShip],
          },
        },
      };
    });

    playPlaceSound();

    const nextPlacedShipIds = new Set([...placedShipIds, selectedTemplate.id]);
    const nextUnplacedShipId = getNextUnplacedShipId(
      selectedTemplate.id,
      nextPlacedShipIds,
    );

    if (nextUnplacedShipId) {
      setSelectedShipId(nextUnplacedShipId);
    }

    setHoveredCell(null);
  };

  const handleResetFleet = async () => {
    if (!currentPlayer || !currentPlayerKey) return;

    const ok = window.confirm(
      "¿Quieres borrar tu formación y volver a colocar unidades?",
    );

    if (!ok) return;

    await updateGtState((current) => {
      const board =
        current.boards[currentPlayerKey] ??
        createEmptyPlayerBoard(currentPlayerKey, currentPlayer.player_name);

      return {
        ...current,
        phase: "placing",
        currentTurnKey: null,
        currentTurnName: null,
        winnerKey: null,
        winnerName: null,
        boards: {
          ...current.boards,
          [currentPlayerKey]: {
            ...board,
            ready: false,
            ships: [],
            shotsReceived: [],
          },
        },
        shots: current.shots.filter(
          (shot) =>
            shot.attackerKey !== currentPlayerKey &&
            shot.targetKey !== currentPlayerKey,
        ),
      };
    });

    setSelectedShipId(GT_SHIP_TEMPLATES[0].id);
    setHoveredCell(null);
  };

  const handleReadyFleet = async () => {
    if (!currentPlayer || !currentPlayerKey || !myBoard) return;

    if (!allShipsPlaced(myBoard)) {
      alert("Primero coloca todas tus unidades.");
      return;
    }

    await updateGtState((current) => {
      const nextBoards = {
        ...current.boards,
        [currentPlayerKey]: {
          ...current.boards[currentPlayerKey],
          ready: true,
        },
      };

      const readyPlayers = sortedPlayers.every((player) => {
        const key = getGtPlayerKey(player);
        return nextBoards[key]?.ready;
      });

      const next: GtGameState = {
        ...current,
        boards: nextBoards,
      };

      if (readyPlayers && sortedPlayers.length >= 2) {
        const first = getRandomFirstTurn(sortedPlayers);
        const firstKey = first
          ? getGtPlayerKey(first)
          : getGtPlayerKey(sortedPlayers[0]);

        next.phase = "battle";
        next.currentTurnKey = firstKey;
        next.currentTurnName =
          sortedPlayers.find((player) => getGtPlayerKey(player) === firstKey)
            ?.player_name ?? null;
      }

      return next;
    });
  };

  const handleAttack = async (cell: GtCell) => {
    if (!currentPlayer || !currentPlayerKey || !opponent || !opponentKey) {
      return;
    }

    if (gameState.phase !== "battle") return;

    if (!isMyTurn) {
      alert("Todavía no es tu turno.");
      return;
    }

    if (!opponentBoard) {
      alert("El rival todavía no tiene tablero.");
      return;
    }

    if (hasAlreadyShot(gameState.shots, currentPlayerKey, opponentKey, cell)) {
      alert("Ya atacaste esa casilla.");
      return;
    }

    const nextTurn = {
      key: opponentKey,
      name: opponent.player_name,
    };

    await updateGtState((current) => {
      const targetBoard = current.boards[opponentKey];

      if (!targetBoard) return current;

      const baseShot: GtShot = {
        id: crypto.randomUUID(),
        attackerKey: currentPlayerKey,
        attackerName: currentPlayer.player_name,
        targetKey: opponentKey,
        targetName: opponent.player_name,
        cell,
        result: "water",
        sunkShipName: null,
        createdAt: new Date().toISOString(),
      };

      const resolved = resolveShot(targetBoard, baseShot);

      const shot: GtShot = {
        ...baseShot,
        result: resolved.result,
        sunkShipName: resolved.sunkShipName,
      };

      const nextBoards = {
        ...current.boards,
        [opponentKey]: resolved.nextBoard,
      };

      const winner = allShipsSunk(resolved.nextBoard);

      return {
        ...current,
        phase: winner ? "finished" : current.phase,
        winnerKey: winner ? currentPlayerKey : current.winnerKey,
        winnerName: winner ? currentPlayer.player_name : current.winnerName,
        currentTurnKey: winner ? current.currentTurnKey : nextTurn.key,
        currentTurnName: winner ? current.currentTurnName : nextTurn.name,
        boards: nextBoards,
        shots: [shot, ...(current.shots ?? [])],
      };
    });
  };

  const handleRematch = async () => {
    if (!room) return;

    const nextGameState = createInitialGtGameState(
      (roomVariant as GtVariant) ?? "mar",
      GT_DEFAULT_BOARD_SIZE,
    );

    const currentSettings = room.room_settings ?? {};
    const nextSettings = {
      ...currentSettings,
      guerra_total: nextGameState,
    };

    const { error } = await supabase
      .from("rooms")
      .update({
        status: "playing",
        room_settings: nextSettings,
      })
      .eq("code", roomCode);

    if (error) {
      console.error("Error iniciando revancha:", error);
      alert("No se pudo iniciar la revancha.");
      return;
    }

    setSelectedShipId(GT_SHIP_TEMPLATES[0].id);
    setOrientation("horizontal");
    setHoveredCell(null);
    setGameState(nextGameState);
    setRoom((prev) =>
      prev ? { ...prev, status: "playing", room_settings: nextSettings } : prev,
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
      await Promise.all([loadRoom(), loadPlayers()]);
      setLoading(false);
    };

    void boot();
  }, [loadRoom, loadPlayers]);

  useEffect(() => {
    const channel = supabase
      .channel(`guerra-total-${roomCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rooms",
          filter: `code=eq.${roomCode}`,
        },
        async () => {
          await loadRoom();
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
        async () => {
          await loadPlayers();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, roomCode, loadRoom, loadPlayers]);

  useEffect(() => {
    if (currentPlayer && currentPlayerKey && room && !myBoard) {
      void ensureMyBoard();
    }
  }, [currentPlayer, currentPlayerKey, room, myBoard]);

  useEffect(() => {
    const latestShot = gameState.shots[0];

    if (!latestShot) return;

    if (latestShot.result === "water") playWaterSound();
    if (latestShot.result === "hit") playHitSound();
    if (latestShot.result === "sunk") playSunkSound();
  }, [gameState.shots]);

  useEffect(() => {
    if (gameState.phase === "finished" && gameState.winnerKey) {
      if (!winSoundPlayedRef.current) {
        winSoundPlayedRef.current = true;
        playWinSound();
      }
    }

    if (gameState.phase !== "finished") {
      winSoundPlayedRef.current = false;
    }
  }, [gameState.phase, gameState.winnerKey]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto max-w-5xl rounded-[32px] border border-white/10 bg-zinc-950 p-8 text-center">
          <p className="text-2xl font-black">Cargando Guerra Total...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white md:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <GuerraTotalHeader
          theme={theme}
          boardSize={boardSize}
          isHost={isHost}
          onBackToSala={handleBackToSala}
          onCloseRoom={handleCloseRoom}
        />

        <GameResultOverlay
          show={gameState.phase === "finished"}
          tone={gameState.winnerKey === currentPlayerKey ? "win" : "lose"}
          title={
            gameState.winnerKey === currentPlayerKey
              ? "¡Ganaste la batalla!"
              : "Batalla terminada"
          }
          subtitle={
            gameState.winnerName
              ? `${gameState.winnerName} destruyó todas las unidades enemigas.`
              : "La batalla ha terminado."
          }
          winnerName={gameState.winnerName}
          resultText="Guerra Total finalizada"
          primaryActionLabel="Revancha"
          secondaryActionLabel="Volver a sala"
          onPrimaryAction={handleRematch}
          onSecondaryAction={handleBackToSala}
        />

        <section className="grid gap-5 xl:grid-cols-[360px_1fr]">
          <aside className="space-y-5">
            <GuerraTotalPlayerPanel
              players={sortedPlayers}
              gameState={gameState}
              currentPlayerKey={currentPlayerKey}
            />

            {gameState.phase === "placing" && (
              <GuerraTotalShipsPanel
                theme={theme}
                selectedShipId={selectedShipId}
                placedShipIds={placedShipIds}
                orientation={orientation}
                myBoard={myBoard}
                onSelectShip={setSelectedShipId}
                onOrientationChange={setOrientation}
                onReadyFleet={handleReadyFleet}
                onResetFleet={handleResetFleet}
              />
            )}

            <GuerraTotalResultSummary shots={gameState.shots} theme={theme} />
          </aside>

          <div className="space-y-5">
            <section className="grid gap-5 lg:grid-cols-2">
              <GuerraTotalBoard
                kind="mine"
                title={`🛡️ Mi ${theme.boardLabel}`}
                subtitle="Coloca tus unidades y revisa impactos recibidos."
                boardSize={boardSize}
                gameState={gameState}
                theme={theme}
                myBoard={myBoard}
                opponentBoard={opponentBoard}
                currentPlayerKey={currentPlayerKey}
                opponentKey={opponentKey}
                isMyTurn={isMyTurn}
                saving={saving}
                previewCells={previewCells}
                previewIsValid={previewIsValid}
                selectedShipId={selectedShipId}
                onHoverCell={setHoveredCell}
                onPlaceShip={handlePlaceShip}
                onAttack={handleAttack}
              />

              <GuerraTotalBoard
                kind="enemy"
                title="🎯 Territorio enemigo"
                subtitle="Ataca una casilla cuando sea tu turno."
                boardSize={boardSize}
                gameState={gameState}
                theme={theme}
                myBoard={myBoard}
                opponentBoard={opponentBoard}
                currentPlayerKey={currentPlayerKey}
                opponentKey={opponentKey}
                isMyTurn={isMyTurn}
                saving={saving}
                previewCells={previewCells}
                previewIsValid={previewIsValid}
                selectedShipId={selectedShipId}
                onHoverCell={setHoveredCell}
                onPlaceShip={handlePlaceShip}
                onAttack={handleAttack}
              />
            </section>

            <GuerraTotalStatusPanel gameState={gameState} isMyTurn={isMyTurn} />
          </div>
        </section>
      </div>
    </main>
  );
}