// 📍 Ruta del archivo: components/games/loteria-mexicana/LoteriaGame.tsx

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  getPlayerIdentity,
  type PlayerIdentity,
} from "@/lib/profile/getPlayerIdentity";
import { applySingleWinnerMatchRewards } from "@/lib/gameRewards";
import { GameResultOverlay } from "@/components/games/core";

import LoteriaBoard from "./LoteriaBoard";
import LoteriaCalledCards from "./LoteriaCalledCards";
import LoteriaClaimButton from "./LoteriaClaimButton";
import LoteriaCurrentCard from "./LoteriaCurrentCard";
import LoteriaHeader from "./LoteriaHeader";
import LoteriaPlayersPanel from "./LoteriaPlayersPanel";
import LoteriaResultSummary from "./LoteriaResultSummary";
import LoteriaStatusPanel from "./LoteriaStatusPanel";

import { getLoteriaDeckBySlug } from "./loteriaDecks";
import type {
  LoteriaGameProps,
  LoteriaMatchPlayerRow,
  LoteriaMatchRow,
  LoteriaWinCondition,
} from "./loteriaTypes";
import {
  canClaimLoteria,
  formatWinningPatternLabel,
  generateBoardCardKeys,
  generateDrawOrder,
  getNextCardToCall,
  getRemainingCardCount,
  isCardExpired,
  isCardMarkable,
  markCard,
  resolveCardVisualState,
  sleep,
  validateLoteriaWin,
} from "./loteriaUtils";
import {
  playLoteriaExpiredSound,
  playLoteriaInvalidSound,
  playLoteriaMarkSound,
} from "./loteriaSounds";
import {
  playCardVoice,
  playWinVoice,
} from "./loteriaAudioManager";

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
  created_at?: string;
};

const LOTERIA_DRAW_INTERVAL_MS = 5000;
const LOTERIA_START_DELAY_MS = 2000;
const DEFAULT_DECK_SLUG = "tradicional";

function resolveLoteriaSettings(room: RoomRow | null): {
  deckSlug: string;
  winCondition: LoteriaWinCondition;
  winConditionLabel: string;
  boardSize: number;
  boardCardCount: number;
} {
  const settings = room?.room_settings ?? {};
  const rawVariant = room?.game_variant ?? "";

  const deckSlug = String(settings.deck_slug ?? DEFAULT_DECK_SLUG);

  const rawWinCondition = String(
    settings.win_condition ??
      (rawVariant === "clasica_esquinas"
        ? "corners"
        : rawVariant === "clasica_llena"
          ? "full_card"
          : "line")
  );

  const winCondition: LoteriaWinCondition =
    rawWinCondition === "corners" || rawWinCondition === "full_card"
      ? rawWinCondition
      : "line";

  const boardSize = Number(settings.board_size ?? 4);

  const winConditionLabel =
    winCondition === "corners"
      ? "4 esquinas"
      : winCondition === "full_card"
        ? "Cartón lleno"
        : "Línea clásica";

  return {
    deckSlug,
    winCondition,
    winConditionLabel,
    boardSize,
    boardCardCount: boardSize * boardSize,
  };
}

export default function LoteriaGame({ roomCode }: LoteriaGameProps) {
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [playerIdentity, setPlayerIdentity] =
    useState<PlayerIdentity | null>(null);
  const [room, setRoom] = useState<RoomRow | null>(null);
  const [roomPlayers, setRoomPlayers] = useState<RoomPlayerRow[]>([]);
  const [match, setMatch] = useState<LoteriaMatchRow | null>(null);
  const [matchPlayers, setMatchPlayers] = useState<LoteriaMatchPlayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingMatch, setStartingMatch] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [leavingToRoom, setLeavingToRoom] = useState(false);
  const [rematchLoading, setRematchLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [localMarkedCardKeys, setLocalMarkedCardKeys] = useState<string[]>([]);
  const [feedbackPulseCardKey, setFeedbackPulseCardKey] =
    useState<string | null>(null);
  const [feedbackInvalidCardKey, setFeedbackInvalidCardKey] =
    useState<string | null>(null);
  const [phaseLabel, setPhaseLabel] = useState("Carta actual");

  const drawTimerRef = useRef<NodeJS.Timeout | null>(null);
  const creatingMatchRef = useRef(false);
  const lastCurrentCardKeyRef = useRef<string | null>(null);
  const lastWinnerRef = useRef<string | null>(null);
  const rewardsAppliedMatchIdRef = useRef<string | null>(null);

  const loteriaSettings = useMemo(() => resolveLoteriaSettings(room), [room]);

  const deckSlug = match?.deck_slug ?? loteriaSettings.deckSlug;
  const deck = useMemo(() => getLoteriaDeckBySlug(deckSlug), [deckSlug]);

  const winCondition = loteriaSettings.winCondition;
  const winConditionLabel = loteriaSettings.winConditionLabel;
  const boardCardCount = loteriaSettings.boardCardCount;

  const currentRoomPlayer = useMemo(() => {
    if (!playerIdentity) return null;

    return (
      roomPlayers.find((player) => {
        if (playerIdentity.user_id && player.user_id) {
          return player.user_id === playerIdentity.user_id;
        }

        return !player.user_id && player.player_name === playerIdentity.name;
      }) ?? null
    );
  }, [roomPlayers, playerIdentity]);

  const currentMatchPlayer = useMemo(() => {
    if (!currentRoomPlayer) return null;

    return (
      matchPlayers.find((player) => {
        if (currentRoomPlayer.user_id && player.user_id) {
          return player.user_id === currentRoomPlayer.user_id;
        }

        return player.player_name === currentRoomPlayer.player_name;
      }) ?? null
    );
  }, [matchPlayers, currentRoomPlayer]);

  const opponentRoomPlayer = useMemo(() => {
    if (!currentRoomPlayer) return null;

    return (
      roomPlayers.find((player) => player.id !== currentRoomPlayer.id) ?? null
    );
  }, [roomPlayers, currentRoomPlayer]);

  const isHost = !!currentRoomPlayer?.is_host;
  const calledCardKeys = match?.called_card_keys ?? [];
  const currentCardKey = match?.current_card_key ?? null;

  useEffect(() => {
    setLocalMarkedCardKeys(currentMatchPlayer?.marked_card_keys ?? []);
  }, [currentMatchPlayer?.id, currentMatchPlayer?.marked_card_keys]);

  const winningCardKeys = useMemo(() => {
    if (!match || !currentMatchPlayer) return [];

    const result = validateLoteriaWin(
      currentMatchPlayer.board_card_keys ?? [],
      localMarkedCardKeys,
      calledCardKeys,
      winCondition
    );

    return result.winningCardKeys;
  }, [match, currentMatchPlayer, localMarkedCardKeys, calledCardKeys, winCondition]);

  const remainingCount = useMemo(() => {
    return getRemainingCardCount(deck, calledCardKeys);
  }, [deck, calledCardKeys]);

  const winnerLabel = useMemo(() => {
    if (!match?.winner_player_name) return null;
    return match.winner_player_name;
  }, [match]);

  const currentPatternLabel = useMemo(() => {
    return formatWinningPatternLabel(match?.winning_pattern ?? null);
  }, [match?.winning_pattern]);

  const allPlayersReadyForRematch = useMemo(() => {
    if (!matchPlayers.length) return false;

    return (
      matchPlayers.length >= 2 &&
      matchPlayers.every((player) => player.is_rematch_ready)
    );
  }, [matchPlayers]);

  const currentPlayerRematchReady = useMemo(() => {
    return !!currentMatchPlayer?.is_rematch_ready;
  }, [currentMatchPlayer]);

  const canCurrentPlayerClaim = useMemo(() => {
    if (!currentMatchPlayer) return false;

    return canClaimLoteria(
  currentMatchPlayer.board_card_keys ?? [],
  localMarkedCardKeys,
  calledCardKeys,
  winCondition,
);
  }, [currentMatchPlayer, localMarkedCardKeys, calledCardKeys, winCondition]);

  const gameStatusLabel = useMemo(() => {
    if (!match) return "Preparando partida";
    if (match.status === "waiting") return "Esperando inicio";
    if (match.status === "playing") return "Partida en curso";
    return "Partida terminada";
  }, [match]);

  const loadPlayerIdentity = useCallback(async () => {
    const identity = await getPlayerIdentity();
    setPlayerIdentity(identity);
  }, []);

  const loadRoom = useCallback(async () => {
    const { data, error } = await supabase
      .from("rooms")
      .select("code, status, game_slug, game_variant, room_settings")
      .eq("code", roomCode)
      .maybeSingle();

    if (error) {
      console.error("Error cargando room:", error);
      setErrorMessage("No se pudo cargar la sala.");
      return;
    }

    if (!data) {
      setErrorMessage("No encontramos esta sala.");
      return;
    }

    setRoom(data as RoomRow);
  }, [supabase, roomCode]);

  const loadRoomPlayers = useCallback(async () => {
    const { data, error } = await supabase
      .from("room_players")
      .select(
        "id, room_code, user_id, player_name, is_host, is_guest, is_ready, created_at",
      )
      .eq("room_code", roomCode)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error cargando room_players:", error);
      return;
    }

    setRoomPlayers((data ?? []) as RoomPlayerRow[]);
  }, [supabase, roomCode]);

  const loadMatch = useCallback(async () => {
    const { data, error } = await supabase
      .from("loteria_matches")
      .select("*")
      .eq("room_code", roomCode)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error cargando loteria_matches:", error);
      return;
    }

    setMatch((data ?? null) as LoteriaMatchRow | null);
  }, [supabase, roomCode]);

  const loadMatchPlayers = useCallback(
    async (matchId?: string | null) => {
      if (!matchId) {
        setMatchPlayers([]);
        return;
      }

      const { data, error } = await supabase
        .from("loteria_match_players")
        .select("*")
        .eq("match_id", matchId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error cargando loteria_match_players:", error);
        return;
      }

      setMatchPlayers((data ?? []) as LoteriaMatchPlayerRow[]);
    },
    [supabase],
  );

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      await loadPlayerIdentity();
      await Promise.all([loadRoom(), loadRoomPlayers(), loadMatch()]);
    } finally {
      setLoading(false);
    }
  }, [loadPlayerIdentity, loadRoom, loadRoomPlayers, loadMatch]);

  const createMatchIfNeeded = useCallback(async () => {
    if (creatingMatchRef.current) return;
    if (!room) return;
    if (!playerIdentity) return;
    if (!isHost) return;
    if (room.game_slug !== "loteria-mexicana") return;
    if (roomPlayers.length < 2) return;
    if (match) return;

    creatingMatchRef.current = true;

    try {
      const drawOrder = generateDrawOrder(deck);

      const { data: insertedMatch, error: matchError } = await supabase
        .from("loteria_matches")
        .insert({
          room_code: roomCode,
          deck_slug: loteriaSettings.deckSlug,
          status: "waiting",
          draw_order: drawOrder,
          called_card_keys: [],
          current_card_key: null,
          winner_user_id: null,
          winner_player_name: null,
          winning_pattern: null,
          started_at: null,
          finished_at: null,
        })
        .select("*")
        .single();

      if (matchError || !insertedMatch) {
        console.error("Error creando loteria_match:", matchError);
        return;
      }

      const playerRows = roomPlayers.map((player) => ({
        match_id: insertedMatch.id,
        room_code: roomCode,
        user_id: player.user_id,
        player_name: player.player_name,
        board_card_keys: generateBoardCardKeys(deck, boardCardCount),
        marked_card_keys: [],
        has_claimed: false,
        is_rematch_ready: false,
      }));

      const { error: playersError } = await supabase
        .from("loteria_match_players")
        .insert(playerRows);

      if (playersError) {
        console.error("Error creando loteria_match_players:", playersError);
        return;
      }

      setMatch(insertedMatch as LoteriaMatchRow);
      await loadMatchPlayers(insertedMatch.id);
    } finally {
      creatingMatchRef.current = false;
    }
  }, [
    room,
  playerIdentity,
  isHost,
  roomPlayers,
  match,
  deck,
  roomCode,
  supabase,
  loadMatchPlayers,
  loteriaSettings.deckSlug,
  boardCardCount,
  ]);

  const awardLoteriaPoints = useCallback(
    async (winnerUserId: string | null | undefined) => {
      try {
        if (!match?.id) return;
        if (rewardsAppliedMatchIdRef.current === match.id) return;

        const participantUserIds = roomPlayers.map((player) => player.user_id);

        await applySingleWinnerMatchRewards({
          supabase,
          winnerUserId,
          participantUserIds,
          gameType: "loteria",
        });

        rewardsAppliedMatchIdRef.current = match.id;
      } catch (error) {
        console.error("Error otorgando puntos de Lotería:", error);
      }
    },
    [supabase, roomPlayers, match?.id],
  );

  const pulseCard = useCallback((cardKey: string) => {
    setFeedbackPulseCardKey(cardKey);

    window.setTimeout(() => {
      setFeedbackPulseCardKey((prev) => (prev === cardKey ? null : prev));
    }, 550);
  }, []);

  const shakeCard = useCallback((cardKey: string) => {
    setFeedbackInvalidCardKey(cardKey);

    window.setTimeout(() => {
      setFeedbackInvalidCardKey((prev) => (prev === cardKey ? null : prev));
    }, 340);
  }, []);

  const handleStartMatch = useCallback(async () => {
    if (!match || !isHost) return;

    try {
      setStartingMatch(true);
      setMessage("Preparando salida...");
      setErrorMessage("");
      setPhaseLabel("Preparando salida");

      await sleep(LOTERIA_START_DELAY_MS);

      const firstCardKey = getNextCardToCall(match.draw_order ?? [], []);

      const { error } = await supabase
        .from("loteria_matches")
        .update({
          status: "playing",
          started_at: new Date().toISOString(),
          called_card_keys: firstCardKey ? [firstCardKey] : [],
          current_card_key: firstCardKey,
          winner_user_id: null,
          winner_player_name: null,
          winning_pattern: null,
          finished_at: null,
        })
        .eq("id", match.id);

      if (error) {
        console.error("Error iniciando partida:", error);
        setErrorMessage("No se pudo iniciar la partida.");
        return;
      }

      rewardsAppliedMatchIdRef.current = null;
      setMessage("");
      setPhaseLabel("Carta actual");
    } finally {
      setStartingMatch(false);
    }
  }, [match, isHost, supabase]);

  const advanceDraw = useCallback(async () => {
    if (!match) return;
    if (!isHost) return;
    if (match.status !== "playing") return;
    if (match.winner_player_name) return;

    const nextCardKey = getNextCardToCall(
      match.draw_order ?? [],
      calledCardKeys,
    );

    if (!nextCardKey) {
      const { error } = await supabase
        .from("loteria_matches")
        .update({
          status: "finished",
          finished_at: new Date().toISOString(),
        })
        .eq("id", match.id);

      if (error) {
        console.error("Error finalizando partida por agotamiento:", error);
      }

      return;
    }

    const nextCalled = [...calledCardKeys, nextCardKey];

    const { error } = await supabase
      .from("loteria_matches")
      .update({
        called_card_keys: nextCalled,
        current_card_key: nextCardKey,
      })
      .eq("id", match.id);

    if (error) {
      console.error("Error avanzando carta:", error);
    }
  }, [match, isHost, calledCardKeys, supabase]);

  const handleToggleCard = useCallback(
    async (cardKey: string) => {
      if (!match || !currentMatchPlayer) return;
      if (match.status !== "playing") return;

      const boardKeys = currentMatchPlayer.board_card_keys ?? [];
      if (!boardKeys.includes(cardKey)) return;

      const visualState = resolveCardVisualState({
        cardKey,
        currentCardKey,
        boardCardKeys: boardKeys,
        calledCardKeys,
        markedCardKeys: localMarkedCardKeys,
      });

      if (visualState === "marked") {
        setMessage("Esa carta ya quedó marcada definitivamente.");
        pulseCard(cardKey);
        return;
      }

      if (!calledCardKeys.includes(cardKey)) {
        setMessage("Esa carta todavía no ha sido cantada.");
        shakeCard(cardKey);
        void playLoteriaInvalidSound();
        return;
      }

      if (isCardExpired(calledCardKeys, localMarkedCardKeys, cardKey)) {
        setMessage("Esa carta ya expiró. Solo tenías 2 turnos para marcarla.");
        shakeCard(cardKey);
        void playLoteriaExpiredSound();
        return;
      }

      if (
        !isCardMarkable(
          boardKeys,
          calledCardKeys,
          localMarkedCardKeys,
          cardKey,
        )
      ) {
        setMessage("Esa jugada no es válida.");
        shakeCard(cardKey);
        void playLoteriaInvalidSound();
        return;
      }

      setMessage("");
      setErrorMessage("");

      const previousMarked = localMarkedCardKeys;
      const nextMarked = markCard(previousMarked, cardKey);

      setLocalMarkedCardKeys(nextMarked);
      pulseCard(cardKey);
      void playLoteriaMarkSound();

      const { error } = await supabase
        .from("loteria_match_players")
        .update({
          marked_card_keys: nextMarked,
        })
        .eq("id", currentMatchPlayer.id);

      if (error) {
        console.error("Error actualizando marcado:", error);
        setLocalMarkedCardKeys(previousMarked);
        setErrorMessage("No se pudo actualizar tu tablero.");
      }
    },
    [
      match,
      currentMatchPlayer,
      currentCardKey,
      calledCardKeys,
      supabase,
      localMarkedCardKeys,
      pulseCard,
      shakeCard,
    ],
  );

  const handleClaimLoteria = useCallback(async () => {
    if (!match || !currentMatchPlayer) return;

    try {
      setClaiming(true);
      setMessage("");
      setErrorMessage("");

      await new Promise((resolve) => setTimeout(resolve, 120));

      const { data: freshPlayer, error: freshPlayerError } = await supabase
        .from("loteria_match_players")
        .select("marked_card_keys")
        .eq("id", currentMatchPlayer.id)
        .single();

      if (freshPlayerError) {
        console.error(
          "Error leyendo marked_card_keys frescos:",
          freshPlayerError,
        );
      }

      const serverMarked = freshPlayer?.marked_card_keys ?? [];

      const mergedMarked = Array.from(
        new Set([...(localMarkedCardKeys ?? []), ...serverMarked]),
      );

      setLocalMarkedCardKeys(mergedMarked);

      const result = validateLoteriaWin(
        currentMatchPlayer.board_card_keys ?? [],
        mergedMarked,
        calledCardKeys,
        winCondition
      );

      if (!result.isWinner) {
        setMessage(`Aún no completas el objetivo: ${winConditionLabel}.`);
        return;
      }

      const { data: updatedMatch, error } = await supabase
        .from("loteria_matches")
        .update({
          status: "finished",
          winner_user_id: currentMatchPlayer.user_id,
          winner_player_name: currentMatchPlayer.player_name,
          winning_pattern: result.pattern,
          finished_at: new Date().toISOString(),
        })
        .eq("id", match.id)
        .is("winner_player_name", null)
        .select("id, winner_user_id, winner_player_name")
        .maybeSingle();

      if (error) {
        console.error("Error reclamando lotería:", error);
        setErrorMessage("No se pudo validar tu lotería.");
        return;
      }

      if (!updatedMatch) {
        setMessage("La partida ya fue cerrada por otro jugador.");
        return;
      }

      await supabase
        .from("loteria_match_players")
        .update({ has_claimed: true })
        .eq("id", currentMatchPlayer.id);

      await awardLoteriaPoints(currentMatchPlayer.user_id);

      setMessage("¡Lotería validada!");
    } finally {
      setClaiming(false);
    }
  }, [
    match,
    currentMatchPlayer,
    localMarkedCardKeys,
    calledCardKeys,
    supabase,
    awardLoteriaPoints,
  ]);

  const handleBackToRoom = useCallback(async () => {
    try {
      setLeavingToRoom(true);
      setErrorMessage("");
      setMessage("");

      if (match?.id && match.status === "playing") {
        await supabase
          .from("loteria_matches")
          .update({
            status: "finished",
            finished_at: new Date().toISOString(),
          })
          .eq("id", match.id);
      }

      await supabase
        .from("rooms")
        .update({
          status: "waiting",
          started_at: null,
        })
        .eq("code", roomCode);

      await supabase
        .from("room_players")
        .update({ is_ready: false })
        .eq("room_code", roomCode);

      router.replace(`/sala/${roomCode}`);
    } catch (error) {
      console.error("Error volviendo a sala:", error);
      setErrorMessage("No se pudo volver a la sala.");
    } finally {
      setLeavingToRoom(false);
    }
  }, [supabase, router, roomCode, match?.id, match?.status]);

  const handleTerminateMatch = useCallback(async () => {
    if (!isHost) return;
    await handleBackToRoom();
  }, [isHost, handleBackToRoom]);

  const handleRematch = useCallback(async () => {
    if (!match || !currentMatchPlayer || !isHost) return;

    try {
      setRematchLoading(true);
      setErrorMessage("");
      setMessage("");

      await supabase
        .from("loteria_match_players")
        .update({ is_rematch_ready: true })
        .eq("id", currentMatchPlayer.id);

      const freshPlayers = await supabase
        .from("loteria_match_players")
        .select("*")
        .eq("match_id", match.id)
        .order("created_at", { ascending: true });

      if (freshPlayers.error) {
        console.error("Error leyendo rematch players:", freshPlayers.error);
        return;
      }

      const playersNow = (freshPlayers.data ?? []) as LoteriaMatchPlayerRow[];
      const everyoneReady =
        playersNow.length >= 2 &&
        playersNow.every((player) => player.is_rematch_ready);

      if (!everyoneReady) {
        setMessage("Tu revancha quedó lista. Esperando al otro jugador.");
        return;
      }

      const newDrawOrder = generateDrawOrder(deck);

      const resetRows = playersNow.map((player) => ({
        id: player.id,
        board_card_keys: generateBoardCardKeys(deck, boardCardCount),
        marked_card_keys: [],
        has_claimed: false,
        is_rematch_ready: false,
      }));

      for (const row of resetRows) {
        const { error } = await supabase
          .from("loteria_match_players")
          .update({
            board_card_keys: row.board_card_keys,
            marked_card_keys: row.marked_card_keys,
            has_claimed: row.has_claimed,
            is_rematch_ready: row.is_rematch_ready,
          })
          .eq("id", row.id);

        if (error) {
          console.error("Error reseteando jugador de revancha:", error);
          return;
        }
      }

      const { error: matchResetError } = await supabase
        .from("loteria_matches")
        .update({
          status: "waiting",
          draw_order: newDrawOrder,
          called_card_keys: [],
          current_card_key: null,
          winner_user_id: null,
          winner_player_name: null,
          winning_pattern: null,
          started_at: null,
          finished_at: null,
        })
        .eq("id", match.id);

      if (matchResetError) {
        console.error("Error reseteando match de revancha:", matchResetError);
        return;
      }

      rewardsAppliedMatchIdRef.current = null;
      lastWinnerRef.current = null;
      setLocalMarkedCardKeys([]);
      setFeedbackPulseCardKey(null);
      setFeedbackInvalidCardKey(null);
      setPhaseLabel("Carta actual");
      setMessage("Revancha lista. El host puede iniciar otra partida.");
    } finally {
      setRematchLoading(false);
    }
  }, [match, currentMatchPlayer, isHost, supabase, deck]);

  const handleVoteRematch = useCallback(async () => {
    if (!match || !currentMatchPlayer) return;

    try {
      setRematchLoading(true);
      setErrorMessage("");
      setMessage("");

      const { error } = await supabase
        .from("loteria_match_players")
        .update({ is_rematch_ready: true })
        .eq("id", currentMatchPlayer.id);

      if (error) {
        console.error("Error marcando revancha:", error);
        setErrorMessage("No se pudo registrar tu revancha.");
        return;
      }

      if (isHost) {
        setMessage("Tu revancha quedó lista. Si ambos aceptan, se reinicia.");
      } else {
        setMessage("Listo. Esperando que el host reinicie la revancha.");
      }
    } finally {
      setRematchLoading(false);
    }
  }, [match, currentMatchPlayer, supabase, isHost]);

  const loadAfterAuthChange = useCallback(async () => {
    await loadPlayerIdentity();
    await loadRoomPlayers();
    await loadMatch();
  }, [loadPlayerIdentity, loadRoomPlayers, loadMatch]);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (!match?.id) {
      setMatchPlayers([]);
      return;
    }

    void loadMatchPlayers(match.id);
  }, [match?.id, loadMatchPlayers]);

  useEffect(() => {
    void createMatchIfNeeded();
  }, [createMatchIfNeeded]);

  useEffect(() => {
    const roomChannel = supabase
      .channel(`loteria-room-${roomCode}`)
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
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "loteria_matches",
          filter: `room_code=eq.${roomCode}`,
        },
        () => {
          void loadMatch();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [supabase, roomCode, loadRoom, loadRoomPlayers, loadMatch]);

  useEffect(() => {
    if (!match?.id) return;

    const playersChannel = supabase
      .channel(`loteria-match-players-${match.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "loteria_match_players",
          filter: `match_id=eq.${match.id}`,
        },
        () => {
          void loadMatchPlayers(match.id);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(playersChannel);
    };
  }, [supabase, match?.id, loadMatchPlayers]);

  useEffect(() => {
    if (currentCardKey && currentCardKey !== lastCurrentCardKeyRef.current) {
      lastCurrentCardKeyRef.current = currentCardKey;
      setPhaseLabel("Carta actual");
      playCardVoice(currentCardKey);
    }
  }, [currentCardKey]);

  useEffect(() => {
    if (winnerLabel && winnerLabel !== lastWinnerRef.current) {
      lastWinnerRef.current = winnerLabel;
      playWinVoice();
    }
  }, [winnerLabel]);

  useEffect(() => {
    if (!winnerLabel) {
      lastWinnerRef.current = null;
    }
  }, [winnerLabel]);

  useEffect(() => {
    if (!match?.id) return;
    if (match.status !== "finished") return;
    if (!match.winner_user_id) return;
    if (rewardsAppliedMatchIdRef.current === match.id) return;

    void awardLoteriaPoints(match.winner_user_id);
  }, [match?.id, match?.status, match?.winner_user_id, awardLoteriaPoints]);

  useEffect(() => {
    if (drawTimerRef.current) {
      clearInterval(drawTimerRef.current);
      drawTimerRef.current = null;
    }

    if (!match || !isHost) return;
    if (match.status !== "playing") return;
    if (match.winner_player_name) return;

    drawTimerRef.current = setInterval(() => {
      void advanceDraw();
    }, LOTERIA_DRAW_INTERVAL_MS);

    return () => {
      if (drawTimerRef.current) {
        clearInterval(drawTimerRef.current);
        drawTimerRef.current = null;
      }
    };
  }, [match, isHost, advanceDraw]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadAfterAuthChange();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, loadAfterAuthChange]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black px-6 py-12 text-white">
        <div className="mx-auto max-w-6xl rounded-[32px] border border-orange-500/15 bg-zinc-950/90 p-10 text-center">
          Cargando Lotería Mexicana...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <GameResultOverlay
          show={match?.status === "finished" && !!winnerLabel}
          tone={winnerLabel === currentRoomPlayer?.player_name ? "win" : "lose"}
          title={
            winnerLabel === currentRoomPlayer?.player_name
              ? "¡Lotería!"
              : "Partida terminada"
          }
          subtitle={
            winnerLabel
              ? `${winnerLabel} ganó con ${currentPatternLabel}.`
              : "La partida ha terminado."
          }
          winnerName={winnerLabel}
          resultText="Lotería Mexicana finalizada"
          primaryActionLabel={
  isHost
    ? allPlayersReadyForRematch
      ? `Iniciar revancha (${matchPlayers.filter((player) => player.is_rematch_ready).length}/${Math.max(matchPlayers.length, 2)})`
      : currentPlayerRematchReady
        ? `Esperando rival (${matchPlayers.filter((player) => player.is_rematch_ready).length}/${Math.max(matchPlayers.length, 2)})`
        : `Quiero revancha (${matchPlayers.filter((player) => player.is_rematch_ready).length}/${Math.max(matchPlayers.length, 2)})`
    : currentPlayerRematchReady
      ? `Esperando host (${matchPlayers.filter((player) => player.is_rematch_ready).length}/${Math.max(matchPlayers.length, 2)})`
      : `Quiero revancha (${matchPlayers.filter((player) => player.is_rematch_ready).length}/${Math.max(matchPlayers.length, 2)})`
}
secondaryActionLabel="Volver a sala"
onPrimaryAction={() => {
  if (isHost && allPlayersReadyForRematch) {
    void handleRematch();
    return;
  }

  if (!currentPlayerRematchReady) {
    void handleVoteRematch();
  }
}}
onSecondaryAction={() => void handleBackToRoom()}
        />

        <LoteriaHeader
          roomCode={roomCode}
          deckName={`${deck.name} · ${winConditionLabel}`}
          gameStatusLabel={gameStatusLabel}
          isHost={isHost}
          leavingToRoom={leavingToRoom}
          onBackToRoom={() => void handleBackToRoom()}
          onTerminateMatch={() => void handleTerminateMatch()}
        />

        <LoteriaPlayersPanel
          roomPlayers={roomPlayers}
          currentPlayerName={
            currentRoomPlayer?.player_name ?? playerIdentity?.name ?? "Jugador"
          }
          opponentName={opponentRoomPlayer?.player_name ?? null}
          calledCount={calledCardKeys.length}
          winnerLabel={winnerLabel}
          matchFinished={match?.status === "finished"}
        />

        <LoteriaStatusPanel
          status={match?.status ?? null}
          isHost={isHost}
          startingMatch={startingMatch}
          roomPlayersCount={roomPlayers.length}
          message={message}
          errorMessage={errorMessage}
          onStartMatch={() => void handleStartMatch()}
        />

        <section className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
          <div className="space-y-6">
            <LoteriaBoard
              deck={deck}
              boardCardKeys={currentMatchPlayer?.board_card_keys ?? []}
              markedCardKeys={localMarkedCardKeys}
              calledCardKeys={calledCardKeys}
              winningCardKeys={match?.status === "finished" ? winningCardKeys : []}
              currentCardKey={currentCardKey}
              disabled={match?.status !== "playing"}
              feedbackPulseCardKey={feedbackPulseCardKey}
              feedbackInvalidCardKey={feedbackInvalidCardKey}
              onToggleCard={handleToggleCard}
            />
          </div>

          <div className="space-y-6">
            <LoteriaCurrentCard
              deck={deck}
              currentCardKey={currentCardKey}
              remainingCount={remainingCount}
              phaseLabel={phaseLabel}
            />

            <LoteriaClaimButton
              onClaim={() => void handleClaimLoteria()}
              loading={claiming}
              disabled={
                !match ||
                match.status !== "playing" ||
                !currentMatchPlayer ||
                claiming
              }
              helperText={
  canCurrentPlayerClaim
    ? `Tu tablero cumple el objetivo: ${winConditionLabel}. ¡Puedes reclamar tu victoria!`
    : `Objetivo: ${winConditionLabel}. Marca a tiempo las cartas cantadas.`
}
            />

            <LoteriaCalledCards
              deck={deck}
              calledCardKeys={calledCardKeys}
              currentCardKey={currentCardKey}
            />
          </div>
        </section>

        {match?.status === "finished" && (
          <LoteriaResultSummary
            winnerLabel={winnerLabel}
            patternLabel={currentPatternLabel}
            currentPlayerRematchReady={currentPlayerRematchReady}
            allPlayersReadyForRematch={allPlayersReadyForRematch}
            isHost={isHost}
            rematchLoading={rematchLoading}
            leavingToRoom={leavingToRoom}
            rematchReadyCount={
              matchPlayers.filter((player) => player.is_rematch_ready).length
            }
            totalPlayers={matchPlayers.length}
            onVoteRematch={() => void handleVoteRematch()}
            onRematch={() => void handleRematch()}
            onTerminateMatch={() => void handleTerminateMatch()}
            onBackToRoom={() => void handleBackToRoom()}
          />
        )}
      </div>
    </main>
  );
}