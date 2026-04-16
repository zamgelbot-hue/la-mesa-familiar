"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Trophy } from "lucide-react"

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

const OPTIONS = ["piedra", "papel", "tijera"]

function getWinner(moveA: string, moveB: string) {
  if (moveA === moveB) {
    return "tie"
  }

  if (
    (moveA === "piedra" && moveB === "tijera") ||
    (moveA === "tijera" && moveB === "papel") ||
    (moveA === "papel" && moveB === "piedra")
  ) {
    return "player1"
  }

  return "player2"
}

export default function JuegoPage() {
  const params = useParams()
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

  const myPlayer = useMemo(
    () => players.find((p) => p.id === myPlayerId) ?? null,
    [players, myPlayerId],
  )

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

    return () => {
      supabase.removeChannel(playersChannel)
      supabase.removeChannel(gameStateChannel)
    }
  }, [code, supabase])

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
        <Link href="/">
          <Button>Volver al inicio</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-white p-6">
      <div className="max-w-5xl mx-auto">
        <Link href={`/sala/${code}`}>
          <Button variant="outline" className="mb-6 flex gap-2">
            <ArrowLeft size={16} />
            Volver a la sala
          </Button>
        </Link>

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
                    <p className="text-zinc-300">
                      Eligió: <span className="font-semibold">{move}</span>
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
                >
                  {option}
                </Button>
              ))}
            </div>

            <div className="text-zinc-400">
              {myMove
                ? `Ya elegiste: ${myMove}`
                : "Aún no has elegido"}
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

              <Button onClick={resetRound} disabled={resettingRound}>
                Jugar otra vez
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
