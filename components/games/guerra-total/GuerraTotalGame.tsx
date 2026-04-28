// 📍 components/games/guerra-total/GuerraTotalGame.tsx

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { GtCell, GtGameState, GtShip, GtShot, GtVariant } from "./gtTypes";
import {
  allShipsPlaced,
  allShipsSunk,
  buildShipCells,
  cellKey,
  createEmptyPlayerBoard,
  createInitialGtGameState,
  createShipFromTemplate,
  getGtPlayerKey,
  getGtVariantTheme,
  getRandomFirstTurn,
  GT_SHIP_TEMPLATES,
  hasAlreadyShot,
  isCellInList,
  isPlacementValid,
  resolveShot,
} from "./gtUtils";

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

type RoomPlayerRow = {
  id: string;
  room_code: string;
  user_id: string | null;
  player_name: string;
  is_host: boolean;
  is_guest: boolean;
  is_ready: boolean;
  created_at: string;
};

type Orientation = "horizontal" | "vertical";

export default function GuerraTotalGame({
  roomCode,
  roomVariant,
}: GuerraTotalGameProps) {
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const winSoundPlayedRef = useRef(false);

  const [room, setRoom] = useState<RoomRow | null>(null);
  const [players, setPlayers] = useState<RoomPlayerRow[]>([]);
  const [gameState, setGameState] = useState<GtGameState>(
    createInitialGtGameState((roomVariant as GtVariant) ?? "mar", 8),
  );
  const [selectedShipId, setSelectedShipId] = useState(GT_SHIP_TEMPLATES[0].id);
  const [orientation, setOrientation] = useState<Orientation>("horizontal");
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
    return [...players].sort((a, b) => a.created_at.localeCompare(b.created_at));
  }, [players]);

  const currentPlayer = useMemo(() => {
    return sortedPlayers.find((p) => p.player_name === currentPlayerName) ?? null;
  }, [sortedPlayers, currentPlayerName]);

  const currentPlayerKey = currentPlayer ? getGtPlayerKey(currentPlayer) : null;
  const isHost = !!currentPlayer?.is_host;

  const opponent = useMemo(() => {
    if (!currentPlayerKey) return null;
    return sortedPlayers.find((p) => getGtPlayerKey(p) !== currentPlayerKey) ?? null;
  }, [sortedPlayers, currentPlayerKey]);

  const opponentKey = opponent ? getGtPlayerKey(opponent) : null;

  const myBoard = currentPlayerKey ? gameState.boards[currentPlayerKey] : null;
  const opponentBoard = opponentKey ? gameState.boards[opponentKey] : null;
  const theme = getGtVariantTheme(gameState.variant ?? roomVariant);

  const isMyTurn = !!currentPlayerKey && gameState.currentTurnKey === currentPlayerKey;
  const boardSize = gameState.boardSize ?? 8;

  const selectedTemplate = useMemo(() => {
    return GT_SHIP_TEMPLATES.find((ship) => ship.id === selectedShipId) ?? GT_SHIP_TEMPLATES[0];
  }, [selectedShipId]);

  const placedShipIds = useMemo(() => {
    return new Set((myBoard?.ships ?? []).map((ship) => ship.id));
  }, [myBoard]);

  const allPlayersReady =
    sortedPlayers.length >= 2 &&
    sortedPlayers.every((player) => {
      const key = getGtPlayerKey(player);
      return gameState.boards[key]?.ready;
    });

  const extractGtState = (settings: Record<string, any> | null | undefined): GtGameState => {
    const saved = settings?.guerra_total;

    if (!saved) {
      return createInitialGtGameState((roomVariant as GtVariant) ?? "mar", 8);
    }

    return {
      ...createInitialGtGameState((roomVariant as GtVariant) ?? "mar", 8),
      ...saved,
      boards: saved.boards ?? {},
      shots: saved.shots ?? [],
    };
  };

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
        setRoom((prev) => (prev ? { ...prev, room_settings: nextSettings } : prev));
      }

      setSaving(false);
    },
    [room, roomCode, supabase],
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
  }, [roomCode, router, supabase]);

  const loadPlayers = useCallback(async () => {
    const { data, error } = await supabase
      .from("room_players")
      .select("id, room_code, user_id, player_name, is_host, is_guest, is_ready, created_at")
      .eq("room_code", roomCode)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error cargando jugadores:", error);
      return;
    }

    setPlayers((data ?? []) as RoomPlayerRow[]);
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

  const playPlaceSound = () => playToneSequence([392, 523.25], "sine", 0.1, 0.12);
  const playWaterSound = () => playToneSequence([196, 164.81], "sine", 0.08, 0.14);
  const playHitSound = () => playToneSequence([110, 220, 110], "sawtooth", 0.11, 0.12);
  const playSunkSound = () => playToneSequence([220, 293.66, 392], "square", 0.1, 0.14);
  const playWinSound = () => playToneSequence([523.25, 659.25, 783.99, 1046.5], "triangle", 0.22, 0.28);

  const ensureMyBoard = async () => {
    if (!currentPlayer || !currentPlayerKey) return;

    await updateGtState((current) => {
      if (current.boards[currentPlayerKey]) return current;

      return {
        ...current,
        variant: ((roomVariant as GtVariant) ?? current.variant ?? "mar"),
        boardSize: current.boardSize ?? 8,
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
      myBoard ?? createEmptyPlayerBoard(currentPlayerKey, currentPlayer.player_name);

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

    const nextUnplaced = GT_SHIP_TEMPLATES.find(
      (ship) => ship.id !== selectedTemplate.id && !placedShipIds.has(ship.id),
    );

    if (nextUnplaced) setSelectedShipId(nextUnplaced.id);
  };

  const handleResetFleet = async () => {
    if (!currentPlayer || !currentPlayerKey) return;

    const ok = window.confirm("¿Quieres borrar tu formación y volver a colocar unidades?");
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
        shots: current.shots.filter((shot) => shot.attackerKey !== currentPlayerKey && shot.targetKey !== currentPlayerKey),
      };
    });

    setSelectedShipId(GT_SHIP_TEMPLATES[0].id);
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
        const firstKey = first ? getGtPlayerKey(first) : getGtPlayerKey(sortedPlayers[0]);

        next.phase = "battle";
        next.currentTurnKey = firstKey;
        next.currentTurnName =
          sortedPlayers.find((player) => getGtPlayerKey(player) === firstKey)?.player_name ??
          null;
      }

      return next;
    });
  };

  const handleAttack = async (cell: GtCell) => {
    if (!currentPlayer || !currentPlayerKey || !opponent || !opponentKey) return;

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

    const currentSettings = room.room_settings ?? {};
    const nextSettings = {
      ...currentSettings,
      guerra_total: createInitialGtGameState((roomVariant as GtVariant) ?? "mar", 8),
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
    setGameState(createInitialGtGameState((roomVariant as GtVariant) ?? "mar", 8));
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

  const getMyCellStatus = (cell: GtCell) => {
    const ship = myBoard?.ships.find((item) => isCellInList(cell, item.cells));
    const shot = myBoard?.shotsReceived.find((item) => item.cell.row === cell.row && item.cell.col === cell.col);

    if (shot?.result === "water") return "miss-received";
    if (shot?.result === "hit" || shot?.result === "sunk") return "hit-received";
    if (ship) return "ship";

    return "empty";
  };

  const getEnemyCellStatus = (cell: GtCell) => {
    const shot = gameState.shots.find(
      (item) =>
        item.attackerKey === currentPlayerKey &&
        item.targetKey === opponentKey &&
        item.cell.row === cell.row &&
        item.cell.col === cell.col,
    );

    if (!shot) return "unknown";
    if (shot.result === "water") return "water";
    if (shot.result === "hit") return "hit";
    return "sunk";
  };

    const getCellClass = (status: string, clickable = false) => {
    const base =
      "aspect-square rounded-lg border text-xs font-black transition flex items-center justify-center";

    const cursor = clickable ? " cursor-pointer hover:scale-[1.04]" : "";

    if (status === "ship") {
      return `${base}${cursor} ${theme.shipCellClass}`;
    }

    if (status === "hit" || status === "hit-received") {
      return `${base}${cursor} ${theme.hitCellClass}`;
    }

    if (status === "sunk") {
      return `${base}${cursor} ${theme.sunkCellClass}`;
    }

    if (status === "water" || status === "miss-received") {
      return `${base}${cursor} ${theme.missCellClass}`;
    }

    return `${base}${cursor} ${theme.emptyCellClass}`;
  };

  const renderBoard = (kind: "mine" | "enemy") => {
    return (
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: boardSize * boardSize }, (_, index) => {
          const cell = {
            row: Math.floor(index / boardSize),
            col: index % boardSize,
          };

          const status =
            kind === "mine" ? getMyCellStatus(cell) : getEnemyCellStatus(cell);

          const clickable =
            kind === "mine"
              ? gameState.phase === "placing" && !myBoard?.ready
              : gameState.phase === "battle" && isMyTurn && !!opponentKey;

          const label =
  status === "ship"
    ? theme.unitIcon
    : status === "hit" || status === "hit-received"
      ? theme.hitIcon
      : status === "sunk"
        ? theme.sunkIcon
        : status === "water" || status === "miss-received"
          ? theme.missIcon
          : theme.emptyIcon;

          return (
            <button
              key={cellKey(cell)}
              type="button"
              disabled={!clickable || saving}
              onClick={() => {
                if (kind === "mine") {
                  void handlePlaceShip(cell);
                } else {
                  void handleAttack(cell);
                }
              }}
              className={getCellClass(status, clickable)}
              title={`${cell.row + 1}-${cell.col + 1}`}
            >
              {label}
            </button>
          );
        })}
      </div>
    );
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
        <section className="rounded-[32px] border border-orange-500/20 bg-zinc-950/95 p-6 shadow-[0_0_40px_rgba(249,115,22,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-300/80">
                La Mesa Familiar
              </p>
              <h1 className="mt-2 text-3xl font-black md:text-4xl">
                {theme.icon} Guerra Total
              </h1>
              <p className="mt-2 text-sm text-white/60">
                Campo:{" "}
                <span className="font-bold text-orange-300">{theme.label}</span>{" "}
                · Tablero {boardSize}x{boardSize}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleBackToSala}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white hover:bg-white/10"
              >
                Volver a sala
              </button>

              {isHost && (
                <button
                  type="button"
                  onClick={handleCloseRoom}
                  className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200 hover:bg-red-500/20"
                >
                  Terminar sala
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[360px_1fr]">
          <aside className="space-y-5">
            <div className="rounded-[28px] border border-white/10 bg-zinc-950/90 p-5">
              <h2 className="text-xl font-black">🧩 Estado</h2>

              <div className="mt-4 space-y-3">
                {sortedPlayers.map((player) => {
                  const key = getGtPlayerKey(player);
                  const board = gameState.boards[key];

                  return (
                    <div
                      key={player.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                    >
                      <p className="font-black">
                        {player.player_name} {key === currentPlayerKey ? "(Tú)" : ""}
                      </p>
                      <p className={board?.ready ? "text-emerald-300" : "text-yellow-300"}>
                        {board?.ready ? "Formación lista" : "Colocando unidades..."}
                      </p>
                    </div>
                  );
                })}
              </div>

              {gameState.phase === "battle" && (
                <div className="mt-4 rounded-2xl border border-purple-500/20 bg-purple-500/10 p-4">
                  <p className="text-sm font-bold text-purple-200">🎲 Turno actual</p>
                  <p className="mt-1 text-xl font-black">
                    {gameState.currentTurnName ?? "Jugador"}
                  </p>
                </div>
              )}
            </div>

            {gameState.phase === "placing" && (
              <div className="rounded-[28px] border border-cyan-500/20 bg-zinc-950/90 p-5">
                <h2 className="text-xl font-black text-cyan-200">
                  🛠️ Colocar {theme.unitLabel}
                </h2>

                <div className="mt-4 space-y-3">
                  <select
                    value={selectedShipId}
                    onChange={(e) => setSelectedShipId(e.target.value)}
                    disabled={myBoard?.ready}
                    className="min-h-[46px] w-full rounded-2xl border border-white/10 bg-black/40 px-4 text-white outline-none"
                  >
                    {GT_SHIP_TEMPLATES.map((ship) => (
                      <option
                        key={ship.id}
                        value={ship.id}
                        disabled={placedShipIds.has(ship.id)}
                      >
                        {ship.name} · {ship.size} casillas
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    disabled={myBoard?.ready}
                    onClick={() =>
                      setOrientation((current) =>
                        current === "horizontal" ? "vertical" : "horizontal",
                      )
                    }
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-black text-white hover:bg-white/10 disabled:opacity-50"
                  >
                    Orientación: {orientation === "horizontal" ? "Horizontal" : "Vertical"}
                  </button>

                  <button
                    type="button"
                    disabled={!myBoard || !allShipsPlaced(myBoard) || myBoard.ready}
                    onClick={handleReadyFleet}
                    className="w-full rounded-2xl bg-orange-500 px-4 py-3 font-black text-black hover:bg-orange-400 disabled:opacity-50"
                  >
                    Confirmar formación
                  </button>

                  <button
                    type="button"
                    disabled={myBoard?.ready}
                    onClick={handleResetFleet}
                    className="w-full rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 font-black text-red-200 hover:bg-red-500/20 disabled:opacity-50"
                  >
                    Reiniciar formación
                  </button>
                </div>
              </div>
            )}

            <div className="rounded-[28px] border border-white/10 bg-zinc-950/90 p-5">
              <h2 className="text-xl font-black">📜 Últimos ataques</h2>

              <div className="mt-4 max-h-[360px] space-y-2 overflow-y-auto pr-1">
                {gameState.shots.length === 0 && (
                  <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/50">
                    Todavía no hay ataques.
                  </p>
                )}

                {gameState.shots.slice(0, 20).map((shot) => (
                  <div
                    key={shot.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                  >
                    <p className="text-sm text-white/70">
                      <span className="font-bold text-white">{shot.attackerName}</span>{" "}
                      atacó {shot.cell.row + 1}-{shot.cell.col + 1}
                    </p>
                    <p
                      className={
                        shot.result === "water"
                          ? "text-sm font-bold text-sky-300"
                          : shot.result === "hit"
                            ? "text-sm font-bold text-red-300"
                            : "text-sm font-bold text-orange-300"
                      }
                    >
                      {shot.result === "water"
                        ? theme.waterLabel
                        : shot.result === "hit"
                          ? theme.hitLabel
                          : `${theme.sunkLabel}: ${shot.sunkShipName}`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <div className="space-y-5">
            {gameState.phase === "finished" && (
              <div className="relative overflow-hidden rounded-[32px] border border-orange-500/40 bg-gradient-to-br from-orange-500/20 via-zinc-950 to-yellow-500/10 p-8 text-center shadow-[0_0_60px_rgba(249,115,22,0.18)]">
                <div className="pointer-events-none absolute inset-0 opacity-20">
                  <div className="absolute left-8 top-6 text-5xl">🎉</div>
                  <div className="absolute right-10 top-10 text-5xl">🏆</div>
                  <div className="absolute bottom-8 left-12 text-5xl">💥</div>
                  <div className="absolute bottom-6 right-14 text-5xl">{theme.icon}</div>
                </div>

                <div className="relative z-10">
                  <p className="text-sm font-black uppercase tracking-[0.24em] text-orange-300">
                    Ganador de la batalla
                  </p>

                  <h2 className="mt-3 text-5xl font-black text-white md:text-6xl">
                    {gameState.winnerName ?? "Jugador"}
                  </h2>

                  <p className="mx-auto mt-3 max-w-xl text-sm text-white/60">
                    Destruyó todas las unidades enemigas.
                  </p>

                  <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={handleRematch}
                      className="rounded-2xl bg-orange-500 px-6 py-3 font-black text-black hover:bg-orange-400"
                    >
                      Revancha
                    </button>

                    <button
                      type="button"
                      onClick={handleBackToSala}
                      className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 font-black text-white hover:bg-white/10"
                    >
                      Volver a sala
                    </button>
                  </div>
                </div>
              </div>
            )}

            <section className="grid gap-5 lg:grid-cols-2">
              <div className={theme.mineBoardClass}>
                <h2 className="text-xl font-black text-cyan-200">
                  🛡️ Mi {theme.boardLabel}
                </h2>
                <p className="mt-1 text-sm text-white/50">
                  Coloca tus unidades y revisa impactos recibidos.
                </p>

                <div className="mt-4">{renderBoard("mine")}</div>
              </div>

              <div className={theme.enemyBoardClass}>
                <h2 className="text-xl font-black text-orange-300">
                  🎯 Territorio enemigo
                </h2>
                <p className="mt-1 text-sm text-white/50">
                  Ataca una casilla cuando sea tu turno.
                </p>

                <div className="mt-4">{renderBoard("enemy")}</div>
              </div>
            </section>

            {gameState.phase === "placing" && (
              <div className="rounded-[28px] border border-yellow-500/20 bg-yellow-500/10 p-5">
                <h2 className="text-xl font-black text-yellow-200">
                  ⏳ Preparando batalla
                </h2>
                <p className="mt-2 text-sm text-white/70">
                  Ambos jugadores deben colocar todas sus unidades y confirmar formación.
                </p>
              </div>
            )}

            {gameState.phase === "battle" && (
              <div
                className={
                  isMyTurn
                    ? "rounded-[28px] border border-emerald-500/20 bg-emerald-500/10 p-5"
                    : "rounded-[28px] border border-purple-500/20 bg-purple-500/10 p-5"
                }
              >
                <h2 className="text-xl font-black">
                  {isMyTurn ? "🔥 Es tu turno de atacar" : "⏳ Esperando ataque rival"}
                </h2>
                <p className="mt-2 text-sm text-white/70">
                  {isMyTurn
                    ? "Elige una casilla en el territorio enemigo."
                    : `Le toca a ${gameState.currentTurnName ?? "tu rival"}.`}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
