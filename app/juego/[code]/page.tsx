"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Trophy, Hand, Scroll, Scissors, Home, LogOut } from "lucide-react"

interface Room {
  id: string
  code: string
  status: string
  created_at: string
  started_at?: string | null
}

interface RoomPlayer {
  id: string
  room_code: string
  player_name: string
  is_host: boolean
  is_ready: boolean
  created_at: string
}

interface ScoreMap {
  [playerId: string]: number
}

interface GameStateData {
  phase: "playing" | "finished"
  moves: Record<string, string>
  result: string | null
  winnerId: string | null
  round: number
  scores: ScoreMap
}

interface GameStateRow {
  id: string
  room_code: string
  state: GameStateData
  updated_at: string
}

const OPTIONS = ["piedra", "papel", "tijera"] as const

function getWinner(moveA: string, moveB: string) {
  if (moveA === moveB) return "tie"

  if (
    (moveA === "piedra" && moveB === "tijera") ||
    (moveA === "tijera" && moveB === "papel") ||
    (moveA === "papel" && moveB === "piedra")
  ) {
    return "player1"
  }

  return "player2"
}

function getMoveLabel(move?: string | null) {
  if (!move) return ""
  if (move === "piedra") return "✊ Piedra"
  if (move === "papel") return "✋ Papel"
  if (move === "tijera") return "✌️ Tijera"
  return move
}

function getMoveIcon(move: string) {
  if (move === "piedra") return <Hand size={18} />
  if (move === "papel") return <Scroll size={18} />
  return <Scissors size={18} />
}

export default function JuegoPage() {
  const params = useParams()
  const router = useRouter()
  const code = (params.code as string).toUpperCase()
  const supabase = createClient()

  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<RoomPlayer[]>([])
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null)
  const [gameState, setGameState] = useState<GameStateRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submittingMove, setSubmittingMove] = useState(false)
  const [resettingRound, setResettingRound] = useState(false)
  const [endingMatch, setEndingMatch] = useState(false)

  const myPlayer = useMemo(
    () => players.find((p) => p.id === myPlayerId) ?? null,
    [players, myPlayerId],
  )

  const isHost = !!myPlayer?.is_host
  const myMove = myPlayer ? gameState?.state.moves?.[myPlayer.id] : null

  const bothPlayed =
    !!gameState &&
    players.length >= 2 &&
    players.every((player) => !!gameState.state.moves[player.id])

  useEffect(() => {
    const loadGame = async () => {
      const storageKey = `room_player_${code}`
      const savedPlayerId = sessionStorage.getItem(storageKey)

      if (savedPlayerId) {
        setMyPlayerId(savedPlayerId)
      }

      const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .select("*")
        .eq("code", code)
        .single()

      if (roomError || !roomData) {
        setError("Sala no encontrada")
        setLoading(false)
        return
      }

      setRoom(roomData)

      const { data: playersData, error: playersError } = await supabase
        .from("room_players")
        .select("*")
        .eq("room_code", code)
        .order("created_at", { ascending: true })

      if (playersError) {
        setError("No se pudieron cargar los jugadores")
        setLoading(false)
        return
      }

      const currentPlayers = playersData || []
      setPlayers(currentPlayers)

      let { data: stateData } = await supabase
        .from("game_state")
        .select("*")
        .eq("room_code", code)
        .maybeSingle()

      if (!stateData) {
        const initialScores: ScoreMap = {}
        currentPlayers.forEach((player) => {
          initialScores[player.id] = 0
        })

        const initialState: GameStateData = {
          phase: "playing",
          moves: {},
          result: null,
          winnerId: null,
          round: 1,
          scores: initialScores,
        }

        const { data: insertedState, error: insertError } = await supabase
          .from("game_state")
          .insert([
            {
              room_code: code,
              state: initialState,
            },
          ])
          .select()
          .single()

        if (insertError) {
          console.error("Error creando game_state:", insertError)

          const { data: retryState } = await supabase
            .from("game_state")
            .select("*")
            .eq("room_code", code)
            .maybeSingle()

          stateData = retryState || null
        } else {
          stateData = insertedState
        }
      }

      setGameState(stateData || null)
      setLoading(false)
    }

    loadGame()

    const playersChannel = supabase
      .channel(`juego-players-${code}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_players",
          filter: `room_code=eq.${code}`,
        },
        async () => {
          const { data } = await supabase
            .from("room_players")
            .select("*")
            .eq("room_code", code)
            .order("created_at", { ascending: true })

          setPlayers(data || [])
        },
      )
      .subscribe()

    const gameStateChannel = supabase
      .channel(`game-state-${code}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_state",
          filter: `room_code=eq.${code}`,
        },
        async () => {
          const { data } = await supabase
            .from("game_state")
            .select("*")
            .eq("room_code", code)
            .maybeSingle()

          setGameState(data || null)
        },
      )
      .subscribe()

    const roomChannel = supabase
      .channel(`room-status-${code}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rooms",
          filter: `code=eq.${code}`,
        },
        (payload) => {
          const updatedRoom = payload.new as Room
          setRoom(updatedRoom)

          if (updatedRoom.status === "waiting") {
            router.push(`/sala/${code}`)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(playersChannel)
      supabase.removeChannel(gameStateChannel)
      supabase.removeChannel(roomChannel)
    }
  }, [code, router, supabase])

  const submitMove = async (move: string) => {
    if (!myPlayer || !gameState || submittingMove) return
    if (gameState.state.phase === "finished") return
    if (myMove) return

    setSubmittingMove(true)

    const updatedMoves = {
      ...gameState.state.moves,
      [myPlayer.id]: move,
    }

    let result: string | null = null
    let winnerId: string | null = null
    let phase: GameStateData["phase"] = "playing"
    const updatedScores: ScoreMap = { ...gameState.state.scores }

    const playerIds = players.map((p) => p.id)
    const everyonePlayed =
      playerIds.length >= 2 && playerIds.every((id) => !!updatedMoves[id])

    if (everyonePlayed) {
      const moveA = updatedMoves[playerIds[0]]
      const moveB = updatedMoves[playerIds[1]]
      const winner = getWinner(moveA, moveB)

      phase = "finished"

      if (winner === "tie") {
        result = "Empate"
        winnerId = null
      } else if (winner === "player1") {
        winnerId = playerIds[0]
        updatedScores[winnerId] = (updatedScores[winnerId] || 0) + 1
        const winnerPlayer = players.find((p) => p.id === winnerId)
        result = `${winnerPlayer?.player_name || "Jugador 1"} gana`
      } else {
        winnerId = playerIds[1]
        updatedScores[winnerId] = (updatedScores[winnerId] || 0) + 1
        const winnerPlayer = players.find((p) => p.id === winnerId)
        result = `${winnerPlayer?.player_name || "Jugador 2"} gana`
      }
    }

    const { error } = await supabase
      .from("game_state")
      .update({
        state: {
          ...gameState.state,
          moves: updatedMoves,
          result,
          winnerId,
          phase,
          scores: updatedScores,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("room_code", code)

    if (error) {
      console.error("Error guardando jugada:", error)
      alert("No se pudo guardar la jugada")
    }

    setSubmittingMove(false)
  }

  const resetRound = async () => {
    if (!gameState || resettingRound) return

    setResettingRound(true)

    const { error } = await supabase
      .from("game_state")
      .update({
        state: {
          ...gameState.state,
          phase: "playing",
          moves: {},
          result: null,
          winnerId: null,
          round: gameState.state.round + 1,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("room_code", code)

    if (error) {
      console.error("Error reiniciando ronda:", error)
      alert("No se pudo reiniciar la ronda")
    }

    setResettingRound(false)
  }

  const endMatch = async () => {
    if (!isHost || endingMatch) return

    const confirmed = window.confirm(
      "¿Seguro que quieres terminar la partida y volver a la sala?"
    )

    if (!confirmed) return

    setEndingMatch(true)

    const resetScores: ScoreMap = {}
    players.forEach((player) => {
      resetScores[player.id] = 0
    })

    const gameStatePromise = supabase
      .from("game_state")
      .update({
        state: {
          phase: "playing",
          moves: {},
          result: null,
          winnerId: null,
          round: 1,
          scores: resetScores,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("room_code", code)

    const roomPlayersPromise = supabase
      .from("room_players")
      .update({ is_ready: false })
      .eq("room_code", code)

    const roomPromise = supabase
      .from("rooms")
      .update({
        status: "waiting",
        started_at: null,
      })
      .eq("code", code)

    const [gameStateResult, playersResult, roomResult] = await Promise.all([
      gameStatePromise,
      roomPlayersPromise,
      roomPromise,
    ])

    if (gameStateResult.error || playersResult.error || roomResult.error) {
      console.error("Error terminando partida:", {
        gameStateError: gameStateResult.error,
        playersError: playersResult.error,
        roomError: roomResult.error,
      })
      alert("No se pudo terminar la partida correctamente.")
      setEndingMatch(false)
      return
    }

    router.push(`/sala/${code}`)
  }

  const goBackToSala = () => {
    router.push(`/sala/${code}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Cargando juego...
      </div>
    )
  }

  if (error || !room || !gameState) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-white gap-4">
        <p>{error || "No se pudo cargar el juego"}</p>
        <Button onClick={() => router.push("/")}>Volver al inicio</Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap gap-3 mb-6">
          <Button variant="outline" className="flex gap-2" onClick={goBackToSala}>
            <ArrowLeft size={16} />
            Volver a la sala
          </Button>

          {isHost && (
            <Button
              variant="destructive"
              className="flex gap-2"
              onClick={endMatch}
              disabled={endingMatch}
            >
              <LogOut size={16} />
              Terminar partida
            </Button>
          )}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
            <div>
              <h1 className="text-3xl font-bold">Piedra, Papel o Tijera</h1>
              <p className="text-zinc-300 mt-2">
                Código de sala: <span className="font-bold text-white">{code}</span>
              </p>
              <p className="text-zinc-300">
                Estado actual:{" "}
                <span className="font-bold text-green-400">
                  {gameState.state.phase}
                </span>
              </p>
            </div>

            <div className="bg-zinc-800 rounded-xl px-4 py-3">
              <p className="text-sm text-zinc-400">Ronda actual</p>
              <p className="text-2xl font-bold">{gameState.state.round}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {players.map((player) => {
              const move = gameState.state.moves?.[player.id]
              const score = gameState.state.scores?.[player.id] || 0
              const isWinner = gameState.state.winnerId === player.id

              return (
                <div key={player.id} className="bg-zinc-800 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-lg">{player.player_name}</p>
                    <div className="flex items-center gap-2 text-yellow-400">
                      <Trophy size={16} />
                      <span className="font-bold">{score}</span>
                    </div>
                  </div>

                  {!bothPlayed ? (
                    <p className="text-zinc-400">
                      {move ? "Ya eligió" : "Esperando jugada..."}
                    </p>
                  ) : (
                    <p className="text-zinc-300 flex items-center gap-2">
                      {move ? getMoveIcon(move) : null}
                      <span className="font-semibold">{getMoveLabel(move)}</span>
                    </p>
                  )}

                  {gameState.state.phase === "finished" && isWinner && (
                    <p className="text-green-400 font-semibold mt-2">Ganó esta ronda</p>
                  )}
                </div>
              )
            })}
          </div>

          <div className="bg-zinc-800 rounded-xl p-6 mb-6">
            <p className="text-xl font-semibold mb-4">Tu elección</p>

            <div className="flex flex-wrap gap-3 mb-4">
              {OPTIONS.map((option) => (
                <Button
                  key={option}
                  onClick={() => submitMove(option)}
                  disabled={
                    !!myMove ||
                    gameState.state.phase === "finished" ||
                    submittingMove
                  }
                  className="flex items-center gap-2"
                >
                  {getMoveIcon(option)}
                  {option}
                </Button>
              ))}
            </div>

            <div className="text-zinc-400">
              {myMove ? `Ya elegiste: ${getMoveLabel(myMove)}` : "Aún no has elegido"}
            </div>

            {!bothPlayed && myMove && (
              <p className="text-yellow-400 mt-3">
                Esperando a que el otro jugador elija...
              </p>
            )}
          </div>

          {gameState.state.phase === "finished" && (
            <div className="bg-zinc-800 rounded-xl p-6">
              <p className="text-2xl font-bold mb-2">Resultado</p>
              <p className="text-green-400 font-semibold text-lg mb-4">
                {gameState.state.result}
              </p>

              <div className="flex flex-wrap gap-3">
                <Button onClick={resetRound} disabled={resettingRound}>
                  Jugar otra vez
                </Button>

                <Button variant="secondary" onClick={goBackToSala}>
                  <Home size={16} className="mr-2" />
                  Volver a sala
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
