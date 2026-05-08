// 📍 Ruta del archivo: components/games/domino/dominoUtils.ts

import type {
  DominoMove,
  DominoPass,
  DominoPlacedTile,
  DominoPlayer,
  DominoRoomPlayerRow,
  DominoSide,
  DominoState,
  DominoTile,
} from "./dominoTypes";

export const DOMINO_STATE_KEY = "domino";
export const DOMINO_TILES_PER_PLAYER = 7;

export const DEFAULT_DOMINO_STATE: DominoState = {
  game_slug: "domino",
  match_id: "",
  variant: "classic_1v1",
  status: "waiting",
  players: [],
  hands: {},
  boneyard: [],
  board: [],
  current_turn_key: null,
  winner_key: null,
  winner_name: null,
  is_blocked: false,
  result_text: null,
  moves: [],
  passes: [],
  last_action_text: null,
  rewards_applied: false,
  rematch_votes: [],
};

export function createDominoMatchId() {
  return `domino_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getDominoPlayerKey(player: DominoRoomPlayerRow | DominoPlayer) {
  if ("userId" in player) return player.userId ?? player.name;
  return player.user_id ?? player.player_name;
}

export function sortDominoRoomPlayers(players: DominoRoomPlayerRow[]) {
  return [...players].sort((a, b) => {
    if (a.is_host && !b.is_host) return -1;
    if (!a.is_host && b.is_host) return 1;
    return a.created_at.localeCompare(b.created_at);
  });
}

export function mapRoomPlayersToDominoPlayers(
  players: DominoRoomPlayerRow[],
): DominoPlayer[] {
  return sortDominoRoomPlayers(players).slice(0, 2).map((player) => ({
    key: getDominoPlayerKey(player),
    name: player.player_name,
    isHost: !!player.is_host,
    userId: player.user_id,
  }));
}

export function createDominoDeck(maxPip = 6): DominoTile[] {
  const tiles: DominoTile[] = [];

  for (let a = 0; a <= maxPip; a += 1) {
    for (let b = a; b <= maxPip; b += 1) {
      tiles.push({
        id: `${a}-${b}`,
        a,
        b,
      });
    }
  }

  return tiles;
}

export function shuffleDominoTiles<T>(items: T[]) {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[randomIndex]] = [next[randomIndex], next[index]];
  }

  return next;
}

export function getTileValue(tile: DominoTile) {
  return tile.a + tile.b;
}

export function isDouble(tile: DominoTile) {
  return tile.a === tile.b;
}

export function getBoardEnds(board: DominoPlacedTile[]) {
  if (board.length === 0) return { left: null, right: null };

  const first = board[0];
  const last = board[board.length - 1];

  return {
    left: first.a,
    right: last.b,
  };
}

export function canTilePlayOnSide(
  tile: DominoTile,
  board: DominoPlacedTile[],
  side: DominoSide,
) {
  if (board.length === 0) return true;

  const ends = getBoardEnds(board);
  const target = side === "left" ? ends.left : ends.right;

  return tile.a === target || tile.b === target;
}

export function getValidSidesForTile(tile: DominoTile, board: DominoPlacedTile[]) {
  const sides: DominoSide[] = [];

  if (canTilePlayOnSide(tile, board, "left")) sides.push("left");
  if (canTilePlayOnSide(tile, board, "right")) sides.push("right");

  return sides;
}

export function getPlayableTiles(hand: DominoTile[], board: DominoPlacedTile[]) {
  return hand.filter((tile) => getValidSidesForTile(tile, board).length > 0);
}

export function orientTileForPlacement(
  tile: DominoTile,
  board: DominoPlacedTile[],
  side: DominoSide,
): DominoTile & { flipped: boolean } {
  if (board.length === 0) {
    return { ...tile, flipped: false };
  }

  const ends = getBoardEnds(board);

  if (side === "left") {
    const target = ends.left;

    if (tile.b === target) return { ...tile, flipped: false };
    return { id: tile.id, a: tile.b, b: tile.a, flipped: true };
  }

  const target = ends.right;

  if (tile.a === target) return { ...tile, flipped: false };
  return { id: tile.id, a: tile.b, b: tile.a, flipped: true };
}

export function placeDominoTile(params: {
  state: DominoState;
  playerKey: string;
  playerName: string;
  tileId: string;
  side: DominoSide;
}) {
  const { state, playerKey, playerName, tileId, side } = params;
  const hand = state.hands[playerKey] ?? [];
  const tile = hand.find((item) => item.id === tileId);

  if (!tile) return state;
  if (state.status !== "playing") return state;
  if (state.current_turn_key !== playerKey) return state;
  if (!canTilePlayOnSide(tile, state.board, side)) return state;

  const oriented = orientTileForPlacement(tile, state.board, side);
  const placedTile: DominoPlacedTile = {
    id: oriented.id,
    a: oriented.a,
    b: oriented.b,
    side: state.board.length === 0 ? "start" : side,
    playedBy: playerKey,
    playedAt: Date.now(),
    flipped: oriented.flipped,
  };

  const nextHand = hand.filter((item) => item.id !== tileId);
  const nextBoard =
    state.board.length === 0 || side === "right"
      ? [...state.board, placedTile]
      : [placedTile, ...state.board];

  const nextMoves: DominoMove[] = [
    ...(state.moves ?? []),
    {
      playerKey,
      playerName,
      tileId,
      side,
      flipped: oriented.flipped,
      createdAt: Date.now(),
    },
  ];

  if (nextHand.length === 0) {
    return {
      ...state,
      status: "finished",
      hands: {
        ...state.hands,
        [playerKey]: nextHand,
      },
      board: nextBoard,
      current_turn_key: null,
      winner_key: playerKey,
      winner_name: playerName,
      is_blocked: false,
      result_text: `${playerName} ganó la partida de Dominó`,
      moves: nextMoves,
      passes: [],
      last_action_text: `${playerName} jugó ${tile.a}|${tile.b}`,
    };
  }

  return {
    ...state,
    hands: {
      ...state.hands,
      [playerKey]: nextHand,
    },
    board: nextBoard,
    current_turn_key: getNextDominoTurnKey(state, playerKey),
    moves: nextMoves,
    passes: [],
    last_action_text: `${playerName} jugó ${tile.a}|${tile.b}`,
  };
}

export function getNextDominoTurnKey(state: DominoState, currentKey: string) {
  const players = state.players ?? [];
  const index = players.findIndex((player) => player.key === currentKey);

  if (index < 0 || players.length === 0) return players[0]?.key ?? null;

  return players[(index + 1) % players.length]?.key ?? null;
}

export function passDominoTurn(params: {
  state: DominoState;
  playerKey: string;
  playerName: string;
}) {
  const { state, playerKey, playerName } = params;
  const hand = state.hands[playerKey] ?? [];

  if (state.status !== "playing") return state;
  if (state.current_turn_key !== playerKey) return state;
  if (getPlayableTiles(hand, state.board).length > 0) return state;
  if ((state.boneyard ?? []).length > 0) return state;

  const nextPasses: DominoPass[] = [
    ...(state.passes ?? []),
    {
      playerKey,
      playerName,
      createdAt: Date.now(),
    },
  ].slice(-state.players.length);

  const allPlayersPassed =
    state.players.length >= 2 &&
    state.players.every((player) =>
      nextPasses.some((pass) => pass.playerKey === player.key),
    );

  if (allPlayersPassed) {
    const winner = getBlockedGameWinner(state);

    return {
      ...state,
      status: "finished",
      current_turn_key: null,
      winner_key: winner?.key ?? null,
      winner_name: winner?.name ?? null,
      is_blocked: true,
      result_text: winner
        ? `Partida bloqueada. Gana ${winner.name} por menor suma de fichas.`
        : "Partida bloqueada. Empate.",
      passes: nextPasses,
      last_action_text: `${playerName} pasó. La partida quedó bloqueada.`,
    };
  }

  return {
    ...state,
    current_turn_key: getNextDominoTurnKey(state, playerKey),
    passes: nextPasses,
    last_action_text: `${playerName} pasó turno`,
  };
}


export function drawDominoTile(params: {
  state: DominoState;
  playerKey: string;
  playerName: string;
}) {
  const { state, playerKey, playerName } = params;
  const hand = state.hands[playerKey] ?? [];
  const [drawnTile, ...nextBoneyard] = state.boneyard ?? [];

  if (state.status !== "playing") return state;
  if (state.current_turn_key !== playerKey) return state;
  if (getPlayableTiles(hand, state.board).length > 0) return state;
  if (!drawnTile) return state;

  const nextHand = [...hand, drawnTile];
  const nextPlayableTiles = getPlayableTiles(nextHand, state.board);
  const canPlayAfterDraw = nextPlayableTiles.length > 0;

  return {
    ...state,
    hands: {
      ...state.hands,
      [playerKey]: nextHand,
    },
    boneyard: nextBoneyard,
    passes: [],
    last_action_text: canPlayAfterDraw
      ? `${playerName} comió una ficha y ya tiene jugada`
      : `${playerName} comió una ficha`,
  };
}

export function getHandPipSum(hand: DominoTile[]) {
  return hand.reduce((total, tile) => total + getTileValue(tile), 0);
}

export function getBlockedGameWinner(state: DominoState) {
  const ranked = [...state.players].sort((a, b) => {
    const totalA = getHandPipSum(state.hands[a.key] ?? []);
    const totalB = getHandPipSum(state.hands[b.key] ?? []);
    return totalA - totalB;
  });

  const first = ranked[0];
  const second = ranked[1];

  if (!first || !second) return first ?? null;

  const firstTotal = getHandPipSum(state.hands[first.key] ?? []);
  const secondTotal = getHandPipSum(state.hands[second.key] ?? []);

  if (firstTotal === secondTotal) return null;
  return first;
}

export function getStartingPlayerKey(hands: Record<string, DominoTile[]>) {
  const candidates = Object.entries(hands).map(([playerKey, hand]) => {
    const bestDouble = hand
      .filter(isDouble)
      .sort((a, b) => b.a - a.a)[0];

    const bestTile = [...hand].sort((a, b) => getTileValue(b) - getTileValue(a))[0];

    return {
      playerKey,
      bestDouble,
      bestTile,
    };
  });

  const doubleWinner = candidates
    .filter((item) => item.bestDouble)
    .sort((a, b) => (b.bestDouble?.a ?? -1) - (a.bestDouble?.a ?? -1))[0];

  if (doubleWinner) return doubleWinner.playerKey;

  return candidates.sort(
    (a, b) => getTileValue(b.bestTile) - getTileValue(a.bestTile),
  )[0]?.playerKey ?? null;
}

export function createInitialDominoState(params: {
  players: DominoPlayer[];
  variant?: string | null;
}) {
  const players = params.players.slice(0, 2);
  const deck = shuffleDominoTiles(createDominoDeck(6));
  const hands: Record<string, DominoTile[]> = {};

  players.forEach((player, index) => {
    const start = index * DOMINO_TILES_PER_PLAYER;
    hands[player.key] = deck.slice(start, start + DOMINO_TILES_PER_PLAYER);
  });

  const boneyard = deck.slice(players.length * DOMINO_TILES_PER_PLAYER);
  const currentTurnKey = players.length >= 2 ? getStartingPlayerKey(hands) : null;

  return {
    ...DEFAULT_DOMINO_STATE,
    match_id: createDominoMatchId(),
    variant: params.variant ?? "classic_1v1",
    status: players.length >= 2 ? "playing" : "waiting",
    players,
    hands,
    boneyard,
    current_turn_key: currentTurnKey,
    last_action_text: currentTurnKey
      ? `Inicia ${players.find((player) => player.key === currentTurnKey)?.name ?? "jugador"}`
      : "Esperando jugadores",
  } satisfies DominoState;
}

export function normalizeDominoState(
  incoming: Partial<DominoState> | null | undefined,
  players: DominoPlayer[],
  variant?: string | null,
): DominoState {
  if (!incoming?.match_id) {
    return createInitialDominoState({ players, variant });
  }

  return {
    ...DEFAULT_DOMINO_STATE,
    ...incoming,
    game_slug: "domino",
    variant: incoming.variant ?? variant ?? "classic_1v1",
    players: incoming.players?.length ? incoming.players : players,
    hands: incoming.hands ?? {},
    boneyard: incoming.boneyard ?? [],
    board: incoming.board ?? [],
    moves: incoming.moves ?? [],
    passes: incoming.passes ?? [],
    rematch_votes: incoming.rematch_votes ?? [],
  };
}

export function getDominoVariantLabel(variant?: string | null) {
  if (variant === "rapido") return "Rápido 1v1";
  if (variant === "classic_1v1" || variant === "clasico_1v1") return "Clásico 1v1";
  return "Clásico 1v1";
}

export function getDominoPlayerName(state: DominoState, key?: string | null) {
  if (!key) return "";
  return state.players.find((player) => player.key === key)?.name ?? "";
}
