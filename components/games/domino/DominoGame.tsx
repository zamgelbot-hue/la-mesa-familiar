// 📍 Ruta del archivo: components/games/domino/DominoGame.tsx

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { GameResultOverlay } from "@/components/games/core";

import DominoBoard from "./DominoBoard";
import DominoHand from "./DominoHand";
import DominoHeader from "./DominoHeader";
import DominoPlayersPanel from "./DominoPlayersPanel";
import DominoResultSummary from "./DominoResultSummary";
import DominoStatusPanel from "./DominoStatusPanel";
import type {
  DominoRoomPlayerRow,
  DominoSide,
  DominoState,
} from "./dominoTypes";
import {
  DOMINO_STATE_KEY,
  createInitialDominoState,
  getDominoPlayerKey,
  getPlayableTiles,
  getValidSidesForTile,
  mapRoomPlayersToDominoPlayers,
  normalizeDominoState,
  drawDominoTile,
  passDominoTurn,
  placeDominoTile,
  sortDominoRoomPlayers,
} from "./dominoUtils";

type DominoGameProps = {
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

function detectStoredPlayerName(roomCode: string) {
  if (typeof window === "undefined") return "";

  const keys = [
    `lmf:player:${roomCode}`,
    `la-mesa-player-name-${roomCode}`,
    `mesa-player-name-${roomCode}`,
    "playerName",
  ];

  for (const key of keys) {
    const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (!raw) continue;

    if (raw.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.playerName) return String(parsed.playerName).trim();
      } catch {}
    }

    if (raw.trim()) return raw.trim();
  }

  return "";
}

function persistPlayerName(roomCode: string, playerName: string) {
  if (typeof window === "undefined") return;

  const payload = JSON.stringify({
    roomCode,
    playerName,
    savedAt: new Date().toISOString(),
  });

  localStorage.setItem(`lmf:player:${roomCode}`, payload);
  sessionStorage.setItem(`lmf:player:${roomCode}`, payload);
}

function playDominoTone(type: "tap" | "pass" | "win" | "error") {
  if (typeof window === "undefined") return;

  try {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContextClass();

    const notes: Record<"tap" | "pass" | "win" | "error", number[]> = {
      tap: [392, 523.25],
      pass: [220, 196],
      win: [523.25, 659.25, 783.99, 1046.5],
      error: [164.81, 146.83],
    };

    notes[type].forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const startAt = audioContext.currentTime + index * 0.08;

      oscillator.type = type === "error" ? "sawtooth" : "triangle";
      oscillator.frequency.value = frequency;

      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.12, startAt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.14);

      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + 0.18);
    });
  } catch {}
}

export default function DominoGame({
  roomCode,
  roomVariant,
  roomSettings,
}: DominoGameProps) {
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const code = String(roomCode ?? "").toUpperCase();

  const [room, setRoom] = useState<RoomRow | null>(null);
  const [players, setPlayers] = useState<DominoRoomPlayerRow[]>([]);
  const [gameState, setGameState] = useState<DominoState>(() =>
    normalizeDominoState(null, [], roomVariant),
  );
  const [currentPlayerName, setCurrentPlayerName] = useState("");
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const initializedMatchRef = useRef(false);
  const lastEndSoundKeyRef = useRef("");

  const sortedRoomPlayers = useMemo(
    () => sortDominoRoomPlayers(players),
    [players],
  );

  const dominoPlayers = useMemo(
    () => mapRoomPlayersToDominoPlayers(sortedRoomPlayers),
    [sortedRoomPlayers],
  );

  const currentRoomPlayer = useMemo(() => {
    return (
      sortedRoomPlayers.find(
        (player) => player.player_name === currentPlayerName,
      ) ?? null
    );
  }, [sortedRoomPlayers, currentPlayerName]);

  const currentPlayerKey = currentRoomPlayer
    ? getDominoPlayerKey(currentRoomPlayer)
    : null;

  const currentDominoPlayer = currentPlayerKey
    ? dominoPlayers.find((player) => player.key === currentPlayerKey) ?? null
    : null;

  const isHost = !!currentRoomPlayer?.is_host;
  const isMyTurn =
    !!currentPlayerKey && gameState.current_turn_key === currentPlayerKey;
  const matchOver = gameState.status === "finished";
  const myHand = currentPlayerKey ? gameState.hands[currentPlayerKey] ?? [] : [];
  const playableTiles = getPlayableTiles(myHand, gameState.board);
  const canDraw =
    isMyTurn &&
    playableTiles.length === 0 &&
    gameState.boneyard.length > 0 &&
    !matchOver;
  const canPass =
    isMyTurn &&
    playableTiles.length === 0 &&
    gameState.boneyard.length === 0 &&
    !matchOver;

  const selectedTile = selectedTileId
    ? myHand.find((tile) => tile.id === selectedTileId) ?? null
    : null;

  const validSides = selectedTile
    ? getValidSidesForTile(selectedTile, gameState.board)
    : [];

  const canPlayLeft = validSides.includes("left");
  const canPlayRight = validSides.includes("right");

  const needsIdentitySelection =
    sortedRoomPlayers.length > 0 &&
    (!currentPlayerName ||
      !sortedRoomPlayers.some(
        (player) => player.player_name === currentPlayerName,
      ));

  const fetchRoom = useCallback(async () => {
    const { data, error } = await supabase
      .from("rooms")
      .select("code, status, game_slug, game_variant, room_settings")
      .eq("code", code)
      .maybeSingle();

    if (error) {
      console.error("Error cargando sala de Dominó:", error);
      setMessage("No se pudo cargar la sala.");
      return null;
    }

    if (!data) {
      setMessage("No encontramos esta sala.");
      return null;
    }

    const nextRoom = data as RoomRow;

    if (nextRoom.status === "closed") {
      router.replace("/");
      return null;
    }

    if (nextRoom.status === "waiting") {
      router.replace(`/sala/${code}`);
      return null;
    }

    setRoom(nextRoom);
    return nextRoom;
  }, [code, router, supabase]);

  const fetchPlayers = useCallback(async () => {
    const { data, error } = await supabase
      .from("room_players")
      .select(
        "id, room_code, user_id, player_name, is_host, is_guest, is_ready, created_at",
      )
      .eq("room_code", code)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error cargando jugadores de Dominó:", error);
      setMessage("No se pudieron cargar los jugadores.");
      return [];
    }

    const list = (data ?? []) as DominoRoomPlayerRow[];
    setPlayers(list);

    const storedName = detectStoredPlayerName(code);
    if (storedName && list.some((player) => player.player_name === storedName)) {
      setCurrentPlayerName(storedName);
    }

    return list;
  }, [code, supabase]);

  const writeDominoState = useCallback(
    async (nextState: DominoState) => {
      setSaving(true);

      const { data: freshRoom, error: fetchError } = await supabase
        .from("rooms")
        .select("room_settings")
        .eq("code", code)
        .maybeSingle();

      if (fetchError) {
        console.error("Error leyendo settings antes de guardar Dominó:", fetchError);
        setSaving(false);
        setMessage("No se pudo guardar la jugada.");
        return false;
      }

      const currentSettings = (freshRoom?.room_settings ?? {}) as Record<
        string,
        any
      >;

      const nextSettings = {
        ...currentSettings,
        domino_variant: nextState.variant,
        [DOMINO_STATE_KEY]: {
          ...nextState,
          updated_at: new Date().toISOString(),
        },
      };

      const { error } = await supabase
        .from("rooms")
        .update({ room_settings: nextSettings })
        .eq("code", code);

      if (error) {
        console.error("Error guardando Dominó:", error);
        setMessage("No se pudo guardar la jugada.");
        setSaving(false);
        return false;
      }

      setGameState(nextSettings[DOMINO_STATE_KEY] as DominoState);
      setRoom((prev) =>
        prev ? { ...prev, room_settings: nextSettings } : prev,
      );
      setSaving(false);
      return true;
    },
    [code, supabase],
  );

  const refreshDominoState = useCallback(
    async (playerList = sortedRoomPlayers, roomData?: RoomRow | null) => {
      const latestRoom = roomData === undefined ? await fetchRoom() : roomData;
      const currentPlayers = mapRoomPlayersToDominoPlayers(playerList);
      const incoming = latestRoom?.room_settings?.[DOMINO_STATE_KEY] as
        | Partial<DominoState>
        | null
        | undefined;

      const nextState = normalizeDominoState(
        incoming,
        currentPlayers,
        latestRoom?.game_variant ?? roomVariant,
      );

      setGameState(nextState);
      return nextState;
    },
    [fetchRoom, roomVariant, sortedRoomPlayers],
  );

  const updateDominoState = useCallback(
    async (updater: (current: DominoState) => DominoState) => {
      const { data: freshRoom, error } = await supabase
        .from("rooms")
        .select("code, status, game_slug, game_variant, room_settings")
        .eq("code", code)
        .maybeSingle();

      if (error || !freshRoom) {
        console.error("Error obteniendo estado fresco de Dominó:", error);
        setMessage("No se pudo actualizar la partida.");
        return false;
      }

      const current = normalizeDominoState(
        (freshRoom.room_settings as Record<string, any> | null)?.[
          DOMINO_STATE_KEY
        ],
        dominoPlayers,
        freshRoom.game_variant ?? roomVariant,
      );

      const next = updater(current);
      return writeDominoState(next);
    },
    [code, dominoPlayers, roomVariant, supabase, writeDominoState],
  );

  const ensureDominoState = useCallback(
    async (roomData: RoomRow | null, playerList: DominoRoomPlayerRow[]) => {
      if (!roomData) return;
      if (playerList.length < 2) return;
      if (!isHost && initializedMatchRef.current) return;

      const mappedPlayers = mapRoomPlayersToDominoPlayers(playerList);
      const incoming = roomData.room_settings?.[DOMINO_STATE_KEY] as
        | Partial<DominoState>
        | null
        | undefined;

      const existingHasValidMatch =
        incoming?.game_slug === "domino" &&
        !!incoming.match_id &&
        Array.isArray(incoming.players) &&
        incoming.players.length >= 2;

      if (existingHasValidMatch) {
        setGameState(
          normalizeDominoState(
            incoming,
            mappedPlayers,
            roomData.game_variant ?? roomVariant,
          ),
        );
        initializedMatchRef.current = true;
        return;
      }

      if (!isHost) return;

      const fresh = createInitialDominoState({
        players: mappedPlayers,
        variant:
          roomData.game_variant ??
          roomData.room_settings?.domino_variant ??
          roomVariant ??
          roomSettings?.domino_variant ??
          "clasico_1v1",
      });

      initializedMatchRef.current = true;
      await writeDominoState(fresh);
    },
    [isHost, roomSettings, roomVariant, writeDominoState],
  );

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setLoading(true);
      setMessage("");

      try {
        const { data: roomDataRaw, error: roomError } = await supabase
          .from("rooms")
          .select("code, status, game_slug, game_variant, room_settings")
          .eq("code", code)
          .maybeSingle();

        if (cancelled) return;

        if (roomError) {
          console.error("Error cargando sala de Dominó:", roomError);
          setMessage("No se pudo cargar la sala.");
          return;
        }

        if (!roomDataRaw) {
          setMessage("No encontramos esta sala.");
          return;
        }

        const roomData = roomDataRaw as RoomRow;

        if (roomData.status === "closed") {
          router.replace("/");
          return;
        }

        if (roomData.status === "waiting") {
          router.replace(`/sala/${code}`);
          return;
        }

        setRoom(roomData);

        const { data: playersData, error: playersError } = await supabase
          .from("room_players")
          .select(
            "id, room_code, user_id, player_name, is_host, is_guest, is_ready, created_at",
          )
          .eq("room_code", code)
          .order("created_at", { ascending: true });

        if (cancelled) return;

        if (playersError) {
          console.error("Error cargando jugadores de Dominó:", playersError);
          setMessage("No se pudieron cargar los jugadores.");
          return;
        }

        const playerList = (playersData ?? []) as DominoRoomPlayerRow[];
        setPlayers(playerList);

        const storedName = detectStoredPlayerName(code);
        if (
          storedName &&
          playerList.some((player) => player.player_name === storedName)
        ) {
          setCurrentPlayerName(storedName);
        }

        const mappedPlayers = mapRoomPlayersToDominoPlayers(playerList);
        const incoming = roomData.room_settings?.[DOMINO_STATE_KEY] as
          | Partial<DominoState>
          | null
          | undefined;

        const nextState = normalizeDominoState(
          incoming,
          mappedPlayers,
          roomData.game_variant ?? roomVariant,
        );

        setGameState(nextState);
      } catch (error) {
        console.error("Error iniciando Dominó:", error);
        if (!cancelled) {
          setMessage(
            "No se pudo iniciar Dominó. Regresa a la sala e intenta iniciar otra vez.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void boot();

    const roomChannel = supabase
      .channel(`domino-room-${code}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rooms",
          filter: `code=eq.${code}`,
        },
        async () => {
          if (!cancelled) {
            await refreshDominoState();
          }
        },
      )
      .subscribe();

    const playersChannel = supabase
      .channel(`domino-players-${code}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_players",
          filter: `room_code=eq.${code}`,
        },
        async () => {
          if (!cancelled) {
            await fetchPlayers();
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(roomChannel);
      supabase.removeChannel(playersChannel);
    };
    // IMPORTANTE: no agregues dependencias derivadas aquí.
    // Si se agregan `players/isHost/room`, React reinicia el boot y se queda parpadeando en loading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, roomVariant, router, supabase]);

  useEffect(() => {
    if (gameState.status !== "finished") return;
    if (!gameState.match_id) return;
    if (lastEndSoundKeyRef.current === gameState.match_id) return;

    lastEndSoundKeyRef.current = gameState.match_id;
    playDominoTone(gameState.winner_key === currentPlayerKey ? "win" : "pass");
  }, [gameState.match_id, gameState.status, gameState.winner_key, currentPlayerKey]);

  const handleChooseIdentity = async (playerName: string) => {
    setCurrentPlayerName(playerName);
    persistPlayerName(code, playerName);
    setMessage("");

    const selectedPlayer = sortedRoomPlayers.find(
      (player) => player.player_name === playerName,
    );

    if (!room || !selectedPlayer?.is_host || sortedRoomPlayers.length < 2) {
      return;
    }

    const incoming = room.room_settings?.[DOMINO_STATE_KEY] as
      | Partial<DominoState>
      | null
      | undefined;

    const existingHasValidMatch =
      incoming?.game_slug === "domino" &&
      !!incoming.match_id &&
      Array.isArray(incoming.players) &&
      incoming.players.length >= 2;

    if (existingHasValidMatch) return;

    const mappedPlayers = mapRoomPlayersToDominoPlayers(sortedRoomPlayers);

    const fresh = createInitialDominoState({
      players: mappedPlayers,
      variant:
        room.game_variant ??
        room.room_settings?.domino_variant ??
        roomVariant ??
        roomSettings?.domino_variant ??
        "classic_1v1",
    });

    await writeDominoState(fresh);
  };

  const handleBackToRoom = async () => {
    const { error } = await supabase
      .from("rooms")
      .update({
        status: "waiting",
        started_at: null,
        last_activity_at: new Date().toISOString(),
      })
      .eq("code", code);

    if (error) {
      console.error("Error volviendo a sala desde Dominó:", error);
      setMessage("No se pudo volver a sala. Intenta otra vez.");
      return;
    }

    router.replace(`/sala/${code}`);
  };

  const handleSelectTile = async (tileId: string) => {
    setMessage("");

    if (!currentDominoPlayer || !currentPlayerKey) {
      playDominoTone("error");
      setMessage("Selecciona tu jugador para continuar.");
      return;
    }

    if (matchOver) {
      playDominoTone("error");
      setMessage("La partida ya terminó.");
      return;
    }

    if (!isMyTurn) {
      playDominoTone("error");
      setMessage("Todavía no es tu turno.");
      return;
    }

    const handTile = myHand.find((tile) => tile.id === tileId);
    if (!handTile) return;

    const sides = getValidSidesForTile(handTile, gameState.board);
    if (sides.length === 0) {
      playDominoTone("error");
      setMessage("Esa ficha no conecta con los extremos de la mesa.");
      return;
    }

    setSelectedTileId(tileId);

    if (gameState.board.length === 0) {
      playDominoTone("tap");
      await updateDominoState((current) =>
        placeDominoTile({
          state: current,
          playerKey: currentPlayerKey,
          playerName: currentDominoPlayer.name,
          tileId,
          side: "right",
        }),
      );
      setSelectedTileId(null);
    }
  };

  const handlePlaceTile = async (side: DominoSide) => {
    setMessage("");

    if (!selectedTileId) {
      playDominoTone("error");
      setMessage("Selecciona una ficha primero.");
      return;
    }

    if (!currentDominoPlayer || !currentPlayerKey) {
      playDominoTone("error");
      setMessage("Selecciona tu jugador para continuar.");
      return;
    }

    if (!isMyTurn) {
      playDominoTone("error");
      setMessage("Todavía no es tu turno.");
      return;
    }

    if (!validSides.includes(side)) {
      playDominoTone("error");
      setMessage("Ese lado no acepta la ficha seleccionada.");
      return;
    }

    playDominoTone("tap");

    const saved = await updateDominoState((current) =>
      placeDominoTile({
        state: current,
        playerKey: currentPlayerKey,
        playerName: currentDominoPlayer.name,
        tileId: selectedTileId,
        side,
      }),
    );

    if (saved) setSelectedTileId(null);
  };

  const handleDraw = async () => {
    setMessage("");

    if (!currentDominoPlayer || !currentPlayerKey) {
      playDominoTone("error");
      setMessage("Selecciona tu jugador para continuar.");
      return;
    }

    if (!canDraw) {
      playDominoTone("error");
      setMessage("Solo puedes comer cuando no tienes jugada válida y quedan fichas en el pozo.");
      return;
    }

    playDominoTone("tap");

    await updateDominoState((current) =>
      drawDominoTile({
        state: current,
        playerKey: currentPlayerKey,
        playerName: currentDominoPlayer.name,
      }),
    );

    setSelectedTileId(null);
  };

  const handlePass = async () => {
    setMessage("");

    if (!currentDominoPlayer || !currentPlayerKey) {
      playDominoTone("error");
      setMessage("Selecciona tu jugador para continuar.");
      return;
    }

    if (!canPass) {
      playDominoTone("error");
      setMessage("Solo puedes pasar cuando no tienes jugadas válidas y el pozo está vacío.");
      return;
    }

    playDominoTone("pass");

    await updateDominoState((current) =>
      passDominoTurn({
        state: current,
        playerKey: currentPlayerKey,
        playerName: currentDominoPlayer.name,
      }),
    );

    setSelectedTileId(null);
  };

  const handleRestartMatch = async () => {
    if (!isHost) {
      setMessage("Solo el host puede reiniciar Dominó por ahora.");
      return;
    }

    if (dominoPlayers.length < 2) {
      setMessage("Dominó necesita 2 jugadores.");
      return;
    }

    const fresh = createInitialDominoState({
      players: dominoPlayers,
      variant: room?.game_variant ?? gameState.variant ?? roomVariant,
    });

    setSelectedTileId(null);
    await writeDominoState(fresh);
  };

  const resultTone = useMemo(() => {
    if (!matchOver) return "neutral" as const;
    if (!gameState.winner_key) return "draw" as const;
    return gameState.winner_key === currentPlayerKey ? "win" : "lose";
  }, [currentPlayerKey, gameState.winner_key, matchOver]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black px-4 py-6 text-white md:px-8">
        <section className="mx-auto max-w-5xl rounded-[34px] border border-orange-500/20 bg-zinc-950/90 p-8 text-center shadow-[0_0_45px_rgba(249,115,22,0.08)]">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-300">
            La Mesa Familiar
          </p>
          <h1 className="mt-3 text-3xl font-black text-white">
            Cargando Dominó...
          </h1>
        </section>
      </main>
    );
  }

  if (needsIdentitySelection) {
    return (
      <main className="min-h-screen bg-black px-4 py-6 text-white md:px-8">
        <section className="mx-auto w-full max-w-2xl rounded-[34px] border border-orange-500/20 bg-zinc-950/90 p-7 text-center shadow-[0_0_45px_rgba(249,115,22,0.08)]">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-300">
            Dominó
          </p>
          <h1 className="mt-3 text-4xl font-black text-white">
            ¿Quién eres en esta partida?
          </h1>
          <p className="mt-3 text-white/55">
            Selecciona tu jugador para sincronizar tu mano y tus turnos.
          </p>

          <div className="mt-7 grid gap-3">
            {sortedRoomPlayers.map((player) => (
              <button
                key={player.id}
                type="button"
                onClick={() => handleChooseIdentity(player.player_name)}
                className="rounded-2xl border border-white/10 bg-black px-5 py-4 text-left font-black text-white transition hover:border-orange-500/40 hover:bg-orange-500/10"
              >
                {player.player_name}
                {player.is_host ? (
                  <span className="ml-2 text-xs text-orange-300">Host</span>
                ) : null}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleBackToRoom}
            className="mt-6 rounded-2xl bg-orange-500 px-5 py-3 font-black text-black hover:bg-orange-400"
          >
            Volver a sala
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white md:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
      <DominoHeader
        roomCode={code}
        state={gameState}
        variant={room?.game_variant ?? roomVariant}
        currentPlayerName={currentPlayerName}
        onBackToRoom={handleBackToRoom}
      />

      {dominoPlayers.length < 2 && (
        <section className="rounded-[30px] border border-yellow-500/20 bg-yellow-500/10 p-5 text-yellow-100">
          <h2 className="text-2xl font-black">Esperando jugador</h2>
          <p className="mt-1 text-sm font-semibold text-yellow-100/75">
            Dominó clásico necesita 2 jugadores para iniciar.
          </p>
        </section>
      )}

      <DominoPlayersPanel
        state={gameState}
        currentPlayerKey={currentPlayerKey}
      />

      <DominoStatusPanel
        state={gameState}
        isMyTurn={isMyTurn}
        canPass={canPass}
        canDraw={canDraw}
        saving={saving}
        message={message}
        onPass={handlePass}
        onDraw={handleDraw}
      />

      <DominoBoard
        board={gameState.board}
        selectedTileId={selectedTileId}
        canPlayLeft={canPlayLeft}
        canPlayRight={canPlayRight}
        onPlace={handlePlaceTile}
      />

      <DominoHand
        hand={myHand}
        board={gameState.board}
        selectedTileId={selectedTileId}
        isMyTurn={isMyTurn}
        matchOver={matchOver}
        onSelectTile={handleSelectTile}
      />

      <DominoResultSummary state={gameState} />

      {isHost && matchOver && (
        <section className="rounded-[30px] border border-white/10 bg-zinc-950/90 p-5 text-center">
          <button
            type="button"
            onClick={handleRestartMatch}
            disabled={saving}
            className="rounded-2xl bg-orange-500 px-6 py-3 font-black text-black hover:bg-orange-400 disabled:opacity-50"
          >
            {saving ? "Reiniciando..." : "Revancha"}
          </button>
        </section>
      )}


      <GameResultOverlay
        show={matchOver}
        title={
          gameState.winner_key
            ? gameState.winner_key === currentPlayerKey
              ? "¡Ganaste!"
              : "Partida terminada"
            : "Empate"
        }
        subtitle="Dominó clásico 1v1"
        resultText={gameState.result_text ?? undefined}
        winnerName={gameState.winner_name}
        tone={resultTone}
        primaryActionLabel="Volver a sala"
        secondaryActionLabel={isHost ? "Revancha" : undefined}
        onPrimaryAction={handleBackToRoom}
        onSecondaryAction={isHost ? handleRestartMatch : undefined}
      />
      </div>
    </main>
  );
}
