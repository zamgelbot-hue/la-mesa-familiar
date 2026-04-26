"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { applyRewardsEngine } from "@/lib/rewards/rewardEngine";
import RoomChat from "@/components/RoomChat";

type GatoGameProps = {
  roomCode: string;
  roomVariant?: string | null;
  roomSettings?: Record<string, any> | null;
};

type RoomPlayer = {
  id: string;
  room_code: string;
  player_name: string;
  is_host: boolean;
  is_ready: boolean;
  created_at: string;
  user_id: string | null;
  is_guest: boolean;
};

type CellValue = "X" | "O" | null;

type GatoState = {
  game_slug: "gato";
  match_id: string;
  board_size: number;
  win_length: number;
  bonus_win_length: number | null;
  board: CellValue[];
  current_turn: string | null;
  symbols: Record<string, "X" | "O">;
  winner: string | null;
  winner_symbol: "X" | "O" | null;
  winning_line: number[];
  is_draw: boolean;
  match_over: boolean;
  result_text: string | null;
  is_bonus_win: boolean;
  rewards_applied: boolean;
  rematch_votes: string[];
};

type GatoSound = "tap" | "error" | "win" | "draw" | "bonus";

const BOT_PLAYER_NAME = "Bot Familiar 🤖";
const BOT_REWARD_COOLDOWN_MS = 60000;

const DEFAULT_STATE: GatoState = {
  game_slug: "gato",
  match_id: "",
  board_size: 3,
  win_length: 3,
  bonus_win_length: null,
  board: Array(9).fill(null),
  current_turn: null,
  symbols: {},
  winner: null,
  winner_symbol: null,
  winning_line: [],
  is_draw: false,
  match_over: false,
  result_text: null,
  is_bonus_win: false,
  rewards_applied: false,
  rematch_votes: [],
};

const getPlayerStorageKey = (roomCode: string) => `lmf:player:${roomCode}`;

function createMatchId() {
  return `gato_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildBotPlayer(roomCode: string): RoomPlayer {
  return {
    id: `bot-gato-${roomCode}`,
    room_code: roomCode,
    player_name: BOT_PLAYER_NAME,
    is_host: false,
    is_ready: true,
    created_at: "9999-12-31T23:59:59.999Z",
    user_id: null,
    is_guest: true,
  };
}

function withBotPlayer(
  realPlayers: RoomPlayer[],
  roomCode: string,
  vsBot: boolean,
) {
  if (!vsBot) return realPlayers;
  if (realPlayers.some((player) => player.player_name === BOT_PLAYER_NAME)) {
    return realPlayers;
  }

  return [...realPlayers, buildBotPlayer(roomCode)];
}

async function applyBotWinReward({
  supabase,
  userId,
}: {
  supabase: any;
  userId: string | null | undefined;
}) {
  if (!userId || userId.startsWith("guest:")) return;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("points, total_points_earned, last_reward_at")
    .eq("id", userId)
    .single();

  if (profileError || !profile) return;

  const lastRewardAt = profile.last_reward_at
    ? new Date(profile.last_reward_at).getTime()
    : 0;

  const now = Date.now();

  if (now - lastRewardAt < BOT_REWARD_COOLDOWN_MS) {
    console.log("⏳ Reward Gato VS Bot en cooldown");
    return;
  }

  const rewardedAt = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      points: (profile.points ?? 0) + 1,
      total_points_earned: (profile.total_points_earned ?? 0) + 1,
      last_reward_at: rewardedAt,
    })
    .eq("id", userId);

  if (updateError) {
    console.error("Error dando reward Gato VS Bot:", updateError);
    return;
  }

  const { error: eventError } = await supabase.from("reward_events").insert({
    user_id: userId,
    game_type: "gato_bot",
    points_awarded: 1,
    placement: 1,
    created_at: rewardedAt,
  });

  if (eventError) {
    console.error("Error guardando reward_event Gato VS Bot:", eventError);
  }
}

function playGatoSound(type: GatoSound) {
  if (typeof window === "undefined") return;

  const AudioCtx =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioCtx) return;

  const ctx = new AudioCtx();
  const now = ctx.currentTime;

  const tone = (
    frequency: number,
    start: number,
    duration: number,
    oscType: OscillatorType = "sine",
    gainValue = 0.05,
  ) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = oscType;
    osc.frequency.setValueAtTime(frequency, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(start + duration);
  };

  if (type === "tap") {
    tone(520, now, 0.08, "triangle", 0.04);
    tone(720, now + 0.05, 0.08, "triangle", 0.035);
  }

  if (type === "error") {
    tone(180, now, 0.09, "square", 0.035);
    tone(130, now + 0.08, 0.12, "square", 0.03);
  }

  if (type === "win") {
    tone(440, now, 0.11, "triangle", 0.045);
    tone(554, now + 0.12, 0.11, "triangle", 0.05);
    tone(659, now + 0.24, 0.18, "triangle", 0.055);
  }

  if (type === "draw") {
    tone(280, now, 0.1, "sine", 0.035);
    tone(280, now + 0.14, 0.1, "sine", 0.035);
  }

  if (type === "bonus") {
    tone(523, now, 0.1, "triangle", 0.045);
    tone(659, now + 0.1, 0.1, "triangle", 0.05);
    tone(784, now + 0.2, 0.12, "triangle", 0.055);
    tone(1046, now + 0.34, 0.2, "sine", 0.06);
  }

  window.setTimeout(() => {
    ctx.close().catch(() => {});
  }, 900);
}

function getModeConfig(
  roomVariant?: string | null,
  roomSettings?: Record<string, any> | null,
) {
  const isVsBot = roomSettings?.vs_bot === true || roomVariant === "bot_clasico";

  const boardSizeFromSettings = Number(roomSettings?.board_size ?? 0);
  const winLengthFromSettings = Number(roomSettings?.win_length ?? 0);
  const bonusWinLengthFromSettings =
    roomSettings?.bonus_win_length === null ||
    roomSettings?.bonus_win_length === undefined
      ? null
      : Number(roomSettings?.bonus_win_length ?? 0);

  if (isVsBot) {
    return {
      boardSize: 3,
      winLength: 3,
      bonusWinLength: null,
      modeLabel: "Vs Bot 3x3",
    };
  }

  if (boardSizeFromSettings > 0 && winLengthFromSettings > 0) {
    return {
      boardSize: boardSizeFromSettings,
      winLength: winLengthFromSettings,
      bonusWinLength:
        bonusWinLengthFromSettings && bonusWinLengthFromSettings > 0
          ? bonusWinLengthFromSettings
          : null,
      modeLabel:
        boardSizeFromSettings === 3
          ? "Clásico 3x3"
          : boardSizeFromSettings === 5
            ? "Grande 5x5"
            : "Épico 7x7",
    };
  }

  if (roomVariant === "grande") {
    return {
      boardSize: 5,
      winLength: 5,
      bonusWinLength: null,
      modeLabel: "Grande 5x5",
    };
  }

  if (roomVariant === "epico") {
    return {
      boardSize: 7,
      winLength: 5,
      bonusWinLength: 7,
      modeLabel: "Épico 7x7",
    };
  }

  return {
    boardSize: 3,
    winLength: 3,
    bonusWinLength: null,
    modeLabel: "Clásico 3x3",
  };
}

function buildFreshState(
  players: RoomPlayer[],
  boardSize: number,
  winLength: number,
  bonusWinLength: number | null,
): GatoState {
  const sorted = [...players].sort((a, b) => {
    if (a.is_host && !b.is_host) return -1;
    if (!a.is_host && b.is_host) return 1;
    return a.created_at.localeCompare(b.created_at);
  });

  const p1 = sorted[0]?.player_name ?? null;
  const p2 = sorted[1]?.player_name ?? null;

  return {
    ...DEFAULT_STATE,
    match_id: createMatchId(),
    board_size: boardSize,
    win_length: winLength,
    bonus_win_length: bonusWinLength,
    board: Array(boardSize * boardSize).fill(null),
    current_turn: p1,
    symbols: {
      ...(p1 ? { [p1]: "X" as const } : {}),
      ...(p2 ? { [p2]: "O" as const } : {}),
    },
  };
}

function checkWinner(
  board: CellValue[],
  boardSize: number,
  winLength: number,
  bonusWinLength: number | null,
) {
  const directions = [
    { row: 0, col: 1 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
    { row: 1, col: -1 },
  ];

  let normalWin: {
    symbol: "X" | "O";
    line: number[];
    isBonus: boolean;
  } | null = null;

  for (let index = 0; index < board.length; index++) {
    const symbol = board[index];
    if (!symbol) continue;

    const startRow = Math.floor(index / boardSize);
    const startCol = index % boardSize;

    for (const direction of directions) {
      const line: number[] = [];
      let row = startRow;
      let col = startCol;

      while (
        row >= 0 &&
        row < boardSize &&
        col >= 0 &&
        col < boardSize &&
        board[row * boardSize + col] === symbol
      ) {
        line.push(row * boardSize + col);
        row += direction.row;
        col += direction.col;
      }

      if (bonusWinLength && line.length >= bonusWinLength) {
        return {
          symbol,
          line,
          isBonus: true,
        };
      }

      if (!normalWin && line.length >= winLength) {
        normalWin = {
          symbol,
          line: line.slice(0, winLength),
          isBonus: false,
        };
      }
    }
  }

  return normalWin;
}

function getBotMove(board: CellValue[], boardSize: number, winLength: number) {
  const emptyIndexes = board
    .map((cell, index) => (cell === null ? index : null))
    .filter((value): value is number => value !== null);

  if (emptyIndexes.length === 0) return null;

  const tryMove = (symbol: "X" | "O") => {
    for (const index of emptyIndexes) {
      const copy = [...board];
      copy[index] = symbol;

      const result = checkWinner(copy, boardSize, winLength, null);

      if (result?.symbol === symbol) {
        return index;
      }
    }

    return null;
  };

  const winningMove = tryMove("O");
  if (winningMove !== null) return winningMove;

  const blockingMove = tryMove("X");
  if (blockingMove !== null) return blockingMove;

  const center = Math.floor((boardSize * boardSize) / 2);
  if (board[center] === null) return center;

  const corners = [0, boardSize - 1, boardSize * (boardSize - 1), boardSize * boardSize - 1];
  const openCorners = corners.filter((index) => board[index] === null);

  if (openCorners.length > 0) {
    return openCorners[Math.floor(Math.random() * openCorners.length)];
  }

  return emptyIndexes[Math.floor(Math.random() * emptyIndexes.length)];
}

export default function GatoGame({
  roomCode,
  roomVariant,
  roomSettings,
}: GatoGameProps) {
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const code = String(roomCode ?? "").toUpperCase();
  const isVsBot = roomSettings?.vs_bot === true || roomVariant === "bot_clasico";

  const { boardSize, winLength, bonusWinLength, modeLabel } = useMemo(
    () => getModeConfig(roomVariant, roomSettings),
    [roomVariant, roomSettings],
  );

  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [gameState, setGameState] = useState<GatoState>(DEFAULT_STATE);
  const [currentPlayerName, setCurrentPlayerName] = useState("");
  const [roomStatus, setRoomStatus] = useState("playing");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const awardingRef = useRef(false);
  const lastEndSoundKeyRef = useRef("");
  const botMoveRef = useRef<NodeJS.Timeout | null>(null);

  const sortedRealPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      if (a.is_host && !b.is_host) return -1;
      if (!a.is_host && b.is_host) return 1;
      return a.created_at.localeCompare(b.created_at);
    });
  }, [players]);

  const sortedPlayers = useMemo(() => {
    return withBotPlayer(sortedRealPlayers, code, isVsBot);
  }, [sortedRealPlayers, code, isVsBot]);

  const currentPlayer = useMemo(() => {
    return (
      sortedRealPlayers.find((p) => p.player_name === currentPlayerName) ?? null
    );
  }, [sortedRealPlayers, currentPlayerName]);

  const isHost = !!currentPlayer?.is_host;
  const bothPlayersPresent = isVsBot
    ? sortedRealPlayers.length >= 1
    : sortedPlayers.length >= 2;

  const mySymbol = currentPlayerName ? gameState.symbols?.[currentPlayerName] : null;
  const isMyTurn = gameState.current_turn === currentPlayerName;

  const detectStoredPlayerName = useCallback((roomCode: string) => {
    if (typeof window === "undefined") return "";

    const canonicalKey = getPlayerStorageKey(roomCode);
    const raw =
      localStorage.getItem(canonicalKey) || sessionStorage.getItem(canonicalKey);

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.playerName) return String(parsed.playerName).trim();
      } catch {}
    }

    return "";
  }, []);

  const persistPlayerName = useCallback((roomCode: string, playerName: string) => {
    if (typeof window === "undefined") return;

    const payload = JSON.stringify({
      roomCode,
      playerName,
      savedAt: new Date().toISOString(),
    });

    localStorage.setItem(getPlayerStorageKey(roomCode), payload);
    sessionStorage.setItem(getPlayerStorageKey(roomCode), payload);
  }, []);

  const normalizeState = useCallback(
    (incoming?: Partial<GatoState> | null): GatoState => {
      const expectedCells = boardSize * boardSize;

      return {
        ...DEFAULT_STATE,
        ...incoming,
        game_slug: "gato",
        board_size: boardSize,
        win_length: winLength,
        bonus_win_length: bonusWinLength,
        board:
          Array.isArray(incoming?.board) && incoming.board.length === expectedCells
            ? incoming.board
            : Array(expectedCells).fill(null),
        symbols: incoming?.symbols ?? {},
        winning_line: incoming?.winning_line ?? [],
        rematch_votes: incoming?.rematch_votes ?? [],
      };
    },
    [boardSize, winLength, bonusWinLength],
  );

  const fetchPlayers = useCallback(async () => {
    const { data, error } = await supabase
      .from("room_players")
      .select("*")
      .eq("room_code", code)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error cargando jugadores de gato:", error);
      return [];
    }

    const list = (data ?? []) as RoomPlayer[];
    setPlayers(list);

    const storedName = detectStoredPlayerName(code);
    if (storedName && list.some((p) => p.player_name === storedName)) {
      setCurrentPlayerName(storedName);
    }

    return list;
  }, [supabase, code, detectStoredPlayerName]);

  const fetchRoom = useCallback(async () => {
    const { data } = await supabase
      .from("rooms")
      .select("status")
      .eq("code", code)
      .maybeSingle();

    if (data?.status) setRoomStatus(data.status);
  }, [supabase, code]);

  const writeGameState = useCallback(
    async (nextState: GatoState) => {
      const { error } = await supabase
        .from("game_state")
        .update({
          state: nextState,
          updated_at: new Date().toISOString(),
        })
        .eq("room_code", code);

      if (error) {
        console.error("Error guardando gato game_state:", error);
        return false;
      }

      setGameState(nextState);
      return true;
    },
    [supabase, code],
  );

  const refreshGameState = useCallback(async () => {
    const { data, error } = await supabase
      .from("game_state")
      .select("state")
      .eq("room_code", code)
      .maybeSingle();

    if (error || !data?.state) return;

    const incoming = data.state as Partial<GatoState>;
    if (incoming.game_slug !== "gato") return;

    setGameState(normalizeState(incoming));
  }, [supabase, code, normalizeState]);

  const ensureGameStateRow = useCallback(
    async (playerList: RoomPlayer[]) => {
      const gamePlayers = withBotPlayer(playerList, code, isVsBot);

      const { data } = await supabase
        .from("game_state")
        .select("id, state")
        .eq("room_code", code)
        .maybeSingle();

      const existing = data?.state as Partial<GatoState> | undefined;
      const hasBotInState =
        existing?.symbols &&
        Object.prototype.hasOwnProperty.call(existing.symbols, BOT_PLAYER_NAME);

      if (
        data &&
        existing?.game_slug === "gato" &&
        existing.board_size === boardSize &&
        (!isVsBot || hasBotInState)
      ) {
        setGameState(normalizeState(existing));
        return;
      }

      const fresh = buildFreshState(
        gamePlayers,
        boardSize,
        winLength,
        bonusWinLength,
      );

      if (data) {
        await supabase
          .from("game_state")
          .update({
            state: fresh,
            updated_at: new Date().toISOString(),
          })
          .eq("room_code", code);

        setGameState(fresh);
        return;
      }

      await supabase.from("game_state").insert({
        room_code: code,
        state: fresh,
        updated_at: new Date().toISOString(),
      });

      setGameState(fresh);
    },
    [
      supabase,
      code,
      boardSize,
      winLength,
      bonusWinLength,
      normalizeState,
      isVsBot,
    ],
  );

  const updateGameState = useCallback(
    async (updater: (prev: GatoState) => GatoState) => {
      const { data } = await supabase
        .from("game_state")
        .select("state")
        .eq("room_code", code)
        .maybeSingle();

      const prevRaw = data?.state as Partial<GatoState> | undefined;
      const prev = normalizeState(prevRaw);
      const next = updater(prev);

      await writeGameState(next);
    },
    [supabase, code, normalizeState, writeGameState],
  );

  const awardRewardsIfNeeded = useCallback(
    async (state: GatoState) => {
      if (!isHost) return;
      if (!state.match_over) return;
      if (state.is_draw) return;
      if (!state.winner) return;
      if (state.rewards_applied) return;
      if (awardingRef.current) return;

      try {
        awardingRef.current = true;

        if (isVsBot) {
          const humanWinner = sortedRealPlayers.find(
            (player) => player.player_name === state.winner,
          );

          if (humanWinner) {
            await applyBotWinReward({
              supabase,
              userId: humanWinner.user_id,
            });
          }

          await updateGameState((prev) => ({
            ...prev,
            rewards_applied: true,
          }));

          return;
        }

        const winner = sortedPlayers.find((p) => p.player_name === state.winner);
        const loser = sortedPlayers.find((p) => p.player_name !== state.winner);

        if (!winner || !loser) return;

        await applyRewardsEngine({
          supabase,
          gameType: "gato",
          players: [
            {
              userId: winner.user_id,
              placement: 1,
              basePoints: state.is_bonus_win ? 7 : 4,
            },
            {
              userId: loser.user_id,
              placement: 2,
              basePoints: 1,
            },
          ],
        });

        await updateGameState((prev) => ({
          ...prev,
          rewards_applied: true,
        }));
      } finally {
        awardingRef.current = false;
      }
    },
    [
      isHost,
      isVsBot,
      sortedRealPlayers,
      sortedPlayers,
      supabase,
      updateGameState,
    ],
  );

  const handleCellClick = async (index: number) => {
    setMessage("");

    if (!bothPlayersPresent) {
      playGatoSound("error");
      return setMessage("Esperando al segundo jugador.");
    }

    if (!currentPlayerName || !currentPlayer) {
      playGatoSound("error");
      return setMessage("Selecciona tu jugador primero.");
    }

    if (gameState.match_over) {
      playGatoSound("error");
      return setMessage("La partida ya terminó.");
    }

    if (!isMyTurn) {
      playGatoSound("error");
      return setMessage(
        gameState.current_turn === BOT_PLAYER_NAME
          ? "Es turno del bot."
          : "Todavía no es tu turno.",
      );
    }

    if (gameState.board[index]) {
      playGatoSound("error");
      return setMessage("Esa casilla ya está ocupada.");
    }

    playGatoSound("tap");

    await updateGameState((prev) => {
      if (prev.match_over) return prev;
      if (prev.current_turn !== currentPlayerName) return prev;
      if (prev.board[index]) return prev;

      const symbol = prev.symbols[currentPlayerName];
      if (!symbol) return prev;

      const nextBoard = [...prev.board];
      nextBoard[index] = symbol;

      const winnerResult = checkWinner(
        nextBoard,
        prev.board_size,
        prev.win_length,
        prev.bonus_win_length,
      );

      if (winnerResult?.symbol) {
        return {
          ...prev,
          board: nextBoard,
          winner: currentPlayerName,
          winner_symbol: winnerResult.symbol,
          winning_line: winnerResult.line,
          is_draw: false,
          match_over: true,
          is_bonus_win: winnerResult.isBonus,
          result_text: winnerResult.isBonus
            ? `🔥 ${currentPlayerName} hizo victoria perfecta`
            : `${currentPlayerName} ganó la partida`,
        };
      }

      const draw = nextBoard.every(Boolean);

      if (draw) {
        return {
          ...prev,
          board: nextBoard,
          current_turn: null,
          is_draw: true,
          match_over: true,
          result_text: "Empate",
        };
      }

      const nextTurn =
        sortedPlayers.find((p) => p.player_name !== currentPlayerName)?.player_name ??
        null;

      return {
        ...prev,
        board: nextBoard,
        current_turn: nextTurn,
      };
    });
  };

  const goBackToRoom = useCallback(async () => {
    const fresh = buildFreshState(
      sortedPlayers,
      boardSize,
      winLength,
      bonusWinLength,
    );

    await supabase
      .from("rooms")
      .update({ status: "waiting", started_at: null })
      .eq("code", code);

    await supabase
      .from("room_players")
      .update({ is_ready: false })
      .eq("room_code", code);

    await supabase
      .from("room_messages")
      .delete()
      .eq("room_code", code)
      .eq("context", "game");

    await writeGameState(fresh);
    router.push(`/sala/${code}`);
  }, [
    sortedPlayers,
    boardSize,
    winLength,
    bonusWinLength,
    supabase,
    code,
    writeGameState,
    router,
  ]);

  const handleRematch = async () => {
    if (!currentPlayerName) return;

    if (isVsBot) {
      await updateGameState(() =>
        buildFreshState(sortedPlayers, boardSize, winLength, bonusWinLength),
      );
      return;
    }

    await updateGameState((prev) => {
      const votes = Array.from(
        new Set([...(prev.rematch_votes ?? []), currentPlayerName]),
      );

      const allAccepted =
        sortedPlayers.length >= 2 &&
        sortedPlayers.every((player) => votes.includes(player.player_name));

      if (allAccepted) {
        return buildFreshState(
          sortedPlayers,
          boardSize,
          winLength,
          bonusWinLength,
        );
      }

      return { ...prev, rematch_votes: votes };
    });
  };

  const handleSelectIdentity = (playerName: string) => {
    persistPlayerName(code, playerName);
    setCurrentPlayerName(playerName);
    playGatoSound("tap");
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setLoading(true);

      const playerList = await fetchPlayers();
      await fetchRoom();
      await ensureGameStateRow(playerList);

      if (mounted) setLoading(false);
    };

    if (code) void init();

    return () => {
      mounted = false;
    };
  }, [code, fetchPlayers, fetchRoom, ensureGameStateRow]);

  useEffect(() => {
    if (!code) return;

    const channel = supabase
      .channel(`gato-game-${code}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_players",
          filter: `room_code=eq.${code}`,
        },
        async () => {
          await fetchPlayers();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_state",
          filter: `room_code=eq.${code}`,
        },
        async () => {
          await refreshGameState();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rooms",
          filter: `code=eq.${code}`,
        },
        async (payload) => {
          const nextStatus = (payload.new as { status?: string } | null)?.status;

          if (nextStatus) {
            setRoomStatus(nextStatus);

            if (nextStatus === "waiting") {
              router.push(`/sala/${code}`);
            }
          } else {
            await fetchRoom();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, code, fetchPlayers, refreshGameState, fetchRoom, router]);

  useEffect(() => {
    if (!isVsBot) return;
    if (!isHost) return;
    if (gameState.match_over) return;
    if (gameState.current_turn !== BOT_PLAYER_NAME) return;

    if (botMoveRef.current) {
      clearTimeout(botMoveRef.current);
    }

    botMoveRef.current = setTimeout(async () => {
      await updateGameState((prev) => {
        if (prev.match_over) return prev;
        if (prev.current_turn !== BOT_PLAYER_NAME) return prev;

        const moveIndex = getBotMove(
          prev.board,
          prev.board_size,
          prev.win_length,
        );

        if (moveIndex === null) return prev;

        const symbol = prev.symbols[BOT_PLAYER_NAME];
        if (!symbol) return prev;

        const nextBoard = [...prev.board];
        nextBoard[moveIndex] = symbol;

        const winnerResult = checkWinner(
          nextBoard,
          prev.board_size,
          prev.win_length,
          prev.bonus_win_length,
        );

        if (winnerResult?.symbol) {
          return {
            ...prev,
            board: nextBoard,
            winner: BOT_PLAYER_NAME,
            winner_symbol: winnerResult.symbol,
            winning_line: winnerResult.line,
            is_draw: false,
            match_over: true,
            is_bonus_win: false,
            result_text: `${BOT_PLAYER_NAME} ganó la partida`,
          };
        }

        const draw = nextBoard.every(Boolean);

        if (draw) {
          return {
            ...prev,
            board: nextBoard,
            current_turn: null,
            is_draw: true,
            match_over: true,
            result_text: "Empate",
          };
        }

        const nextTurn =
          sortedRealPlayers[0]?.player_name ?? currentPlayerName ?? null;

        return {
          ...prev,
          board: nextBoard,
          current_turn: nextTurn,
        };
      });
    }, 650);

    return () => {
      if (botMoveRef.current) {
        clearTimeout(botMoveRef.current);
      }
    };
  }, [
    isVsBot,
    isHost,
    gameState.match_over,
    gameState.current_turn,
    updateGameState,
    sortedRealPlayers,
    currentPlayerName,
  ]);

  useEffect(() => {
    void awardRewardsIfNeeded(gameState);
  }, [gameState, awardRewardsIfNeeded]);

  useEffect(() => {
    if (!gameState.match_over) return;

    const soundKey = `${gameState.match_id}:${gameState.is_draw ? "draw" : gameState.is_bonus_win ? "bonus" : "win"}`;

    if (lastEndSoundKeyRef.current === soundKey) return;
    lastEndSoundKeyRef.current = soundKey;

    if (gameState.is_draw) {
      playGatoSound("draw");
      return;
    }

    if (gameState.is_bonus_win) {
      playGatoSound("bonus");
      return;
    }

    playGatoSound("win");
  }, [
    gameState.match_over,
    gameState.match_id,
    gameState.is_draw,
    gameState.is_bonus_win,
  ]);

  useEffect(() => {
    return () => {
      if (botMoveRef.current) {
        clearTimeout(botMoveRef.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black p-6 text-white">
        <div className="rounded-[32px] border border-orange-500/15 bg-zinc-950/90 p-10 text-center">
          <p className="text-2xl font-bold">Cargando El Gato...</p>
          <p className="mt-2 text-white/60">Preparando tablero.</p>
        </div>
      </main>
    );
  }

  const needsIdentitySelection =
    sortedRealPlayers.length > 0 &&
    (!currentPlayerName ||
      !sortedRealPlayers.some(
        (player) => player.player_name === currentPlayerName,
      ));

  const gridClass =
    gameState.board_size === 7
      ? "grid-cols-7 max-w-2xl gap-2"
      : gameState.board_size === 5
        ? "grid-cols-5 max-w-xl gap-2.5"
        : "grid-cols-3 max-w-md gap-3";

  const cellTextClass =
    gameState.board_size === 7
      ? "text-3xl md:text-5xl"
      : gameState.board_size === 5
        ? "text-4xl md:text-6xl"
        : "text-6xl md:text-7xl";

  return (
    <main className="min-h-screen bg-black p-4 text-white md:p-8">
      <div className="pointer-events-none fixed inset-0 opacity-40">
        <div className="absolute left-1/2 top-0 h-[440px] w-[440px] -translate-x-1/2 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[340px] w-[340px] rounded-full bg-yellow-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <section className="mb-6 rounded-[32px] border border-orange-500/15 bg-zinc-950/90 p-6 shadow-[0_0_40px_rgba(249,115,22,0.06)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-300/80">
                La Mesa Familiar
              </p>
              <h1 className="mt-2 text-4xl font-extrabold">El Gato</h1>
              <p className="mt-2 text-white/65">
                Sala: <span className="font-bold text-orange-300">{code}</span>
              </p>
              <p className="text-white/65">
                Estado: <span className="font-bold text-white">{roomStatus}</span>
              </p>
              <p className="text-white/65">
                Modo: <span className="font-bold text-white">{modeLabel}</span>
              </p>
              <p className="text-white/65">
                Gana conectando{" "}
                <span className="font-bold text-orange-300">{gameState.win_length}</span>
                {gameState.bonus_win_length
                  ? ` · Bonus conectando ${gameState.bonus_win_length}`
                  : ""}
              </p>

              {isVsBot && (
                <p className="mt-2 inline-flex rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-sm font-bold text-cyan-200">
                  Modo contra bot · ganas 1 punto si vences
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={goBackToRoom}
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-bold transition hover:bg-white/10"
              >
                Volver a sala
              </button>

              <button
                type="button"
                onClick={goBackToRoom}
                className="rounded-2xl bg-red-500 px-5 py-3 font-bold transition hover:bg-red-400"
              >
                Terminar partida
              </button>
            </div>
          </div>
        </section>

        {needsIdentitySelection && (
          <section className="mb-6 rounded-[28px] border border-cyan-400/25 bg-cyan-500/10 p-5">
            <p className="text-lg font-bold text-cyan-200">
              Selecciona qué jugador eres
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {sortedRealPlayers.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => handleSelectIdentity(player.player_name)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left transition hover:bg-white/10"
                >
                  <p className="text-lg font-bold">
                    {player.player_name} {player.is_host ? "👑" : ""}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[32px] border border-white/10 bg-zinc-950/90 p-5">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-orange-300/80">
              Jugadores
            </p>

            <div className="space-y-4">
              {sortedPlayers.map((player) => {
                const symbol = gameState.symbols?.[player.player_name] ?? "?";
                const active = gameState.current_turn === player.player_name;
                const winner = gameState.winner === player.player_name;
                const isMe = player.player_name === currentPlayerName;
                const isBot = player.player_name === BOT_PLAYER_NAME;

                return (
                  <div
                    key={player.id}
                    className={`rounded-3xl border p-5 transition ${
                      winner
                        ? "border-yellow-400/40 bg-yellow-500/10 shadow-[0_0_28px_rgba(250,204,21,0.14)]"
                        : active
                          ? "border-orange-400/40 bg-orange-500/10 shadow-[0_0_24px_rgba(249,115,22,0.12)]"
                          : isMe
                            ? "border-emerald-400/35 bg-emerald-500/10"
                            : isBot
                              ? "border-cyan-400/25 bg-cyan-500/10"
                              : "border-white/10 bg-white/[0.03]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xl font-bold">
                          {player.player_name} {player.is_host ? "👑" : ""}
                        </p>
                        <p className="mt-1 text-sm text-white/55">
                          {isBot ? "Rival automático" : isMe ? "Tú" : "Rival"} · Ficha {symbol}
                        </p>
                      </div>

                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black/40 text-3xl font-black text-orange-300">
                        {symbol}
                      </div>
                    </div>

                    {active && !gameState.match_over && (
                      <p className="mt-3 rounded-2xl border border-orange-500/20 bg-orange-500/10 px-3 py-2 text-sm font-bold text-orange-200">
                        {isBot ? "El bot está pensando..." : "Turno actual"}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-5 rounded-3xl border border-white/10 bg-black/30 p-4">
              <p className="text-sm text-white/55">Tu jugador</p>
              <p className="mt-1 text-lg font-bold text-emerald-300">
                {currentPlayerName || "No seleccionado"}
              </p>
              <p className="mt-3 text-sm text-white/55">Tu ficha</p>
              <p className="mt-1 text-3xl font-black text-orange-300">
                {mySymbol ?? "-"}
              </p>
            </div>
          </section>

          <section className="rounded-[32px] border border-orange-500/15 bg-zinc-950/90 p-5 shadow-[0_0_40px_rgba(249,115,22,0.05)]">
            <div className="mb-5 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-300/80">
                Tablero {gameState.board_size}x{gameState.board_size}
              </p>

              <h2 className="mt-2 text-3xl font-extrabold">
                {gameState.match_over
                  ? gameState.result_text
                  : isMyTurn
                    ? "Tu turno"
                    : gameState.current_turn === BOT_PLAYER_NAME
                      ? "El bot está pensando..."
                      : gameState.current_turn
                        ? `Turno de ${gameState.current_turn}`
                        : "Preparando turno"}
              </h2>

              {message && (
                <p className="mt-3 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-2 text-yellow-200">
                  {message}
                </p>
              )}
            </div>

            <div className={`mx-auto grid ${gridClass}`}>
              {gameState.board.map((cell, index) => {
                const isWinningCell = gameState.winning_line.includes(index);

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleCellClick(index)}
                    disabled={
                      !bothPlayersPresent ||
                      needsIdentitySelection ||
                      !isMyTurn ||
                      !!cell ||
                      gameState.match_over
                    }
                    className={`aspect-square rounded-2xl border font-black transition duration-200 ${cellTextClass} ${
                      isWinningCell
                        ? "animate-pulse border-yellow-400 bg-yellow-500/20 text-yellow-300 shadow-[0_0_34px_rgba(250,204,21,0.28)]"
                        : cell === "X"
                          ? "border-orange-500/35 bg-orange-500/10 text-orange-300 shadow-[0_0_18px_rgba(249,115,22,0.08)]"
                          : cell === "O"
                            ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.08)]"
                            : "border-white/10 bg-white/[0.04] hover:scale-[1.03] hover:border-orange-500/35 hover:bg-orange-500/10"
                    } disabled:cursor-not-allowed disabled:opacity-80`}
                  >
                    {cell}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {gameState.match_over && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-md">
          <div className="relative w-full max-w-xl overflow-hidden rounded-[36px] border border-yellow-400/30 bg-zinc-950 p-8 text-center shadow-[0_0_70px_rgba(250,204,21,0.20)] md:p-10">
            <div className="pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full bg-yellow-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-orange-500/20 blur-3xl" />

            <div className="relative">
              <p className="text-sm font-bold uppercase tracking-[0.32em] text-yellow-300">
                Resultado
              </p>

              <div className="mx-auto mt-5 flex h-24 w-24 animate-pulse items-center justify-center rounded-full border border-yellow-400/30 bg-yellow-500/10 text-5xl shadow-[0_0_45px_rgba(250,204,21,0.16)]">
                {gameState.is_draw ? "🤝" : gameState.is_bonus_win ? "🔥" : gameState.winner === BOT_PLAYER_NAME ? "🤖" : "👑"}
              </div>

              <h2 className="mt-6 text-4xl font-extrabold md:text-5xl">
                {gameState.is_draw
                  ? "Empate"
                  : gameState.is_bonus_win
                    ? "Victoria Perfecta"
                    : gameState.winner === BOT_PLAYER_NAME
                      ? "Ganó el Bot"
                      : "Ganador"}
              </h2>

              <p className="mt-4 text-2xl font-bold text-white">
                {gameState.is_draw ? "Sin ganador" : gameState.winner}
              </p>

              <p className="mx-auto mt-3 max-w-md text-white/70">
                {gameState.is_draw
                  ? "El tablero se llenó sin completar una línea ganadora."
                  : isVsBot && gameState.winner === BOT_PLAYER_NAME
                    ? "El bot ganó esta vez. Intenta la revancha."
                    : isVsBot
                      ? "Ganaste contra el bot y recibiste 1 punto si el cooldown ya terminó."
                      : gameState.is_bonus_win
                        ? "Conectó 7 en línea y ganó +3 puntos bonus."
                        : `Ganó conectando ${gameState.win_length} en línea con ${gameState.winner_symbol}.`}
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={handleRematch}
                  className="rounded-2xl bg-emerald-500 px-7 py-3 font-extrabold text-black transition hover:bg-emerald-400"
                >
                  Revancha
                </button>

                <button
                  type="button"
                  onClick={goBackToRoom}
                  className="rounded-2xl border border-white/10 bg-white/5 px-7 py-3 font-extrabold text-white transition hover:bg-white/10"
                >
                  Volver a sala
                </button>
              </div>

              {!isVsBot && (
                <p className="mt-5 text-sm text-white/50">
                  Votos de revancha: {gameState.rematch_votes?.length ?? 0}/
                  {Math.max(sortedPlayers.length, 2)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <RoomChat
        roomCode={code}
        context="game"
        title="Chat de partida"
        currentPlayerName={currentPlayerName}
        currentUserId={currentPlayer?.user_id ?? null}
        isGuest={currentPlayer?.is_guest ?? true}
      />
    </main>
  );
}
