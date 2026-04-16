"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

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

interface GameStateData {
  phase: "waiting" | "playing" | "finished"
  moves: Record<string, string>
  result: string | null
}

interface GameStateRow {
  id: string
  room_code: string
  state: GameStateData
  updated_at: string
}

const OPTIONS = ["piedra", "papel", "tijera"]

function getWinner(moveA: string, moveB: string) {
  if (moveA === moveB) return "Empate"

  if (
    (moveA === "piedra" && moveB === "tijera") ||
    (moveA === "papel" && moveB === "piedra") ||
    (moveA === "tijera" && moveB === "papel")
  ) {
    return "Jugador 1 gana"
  }

  return "Jugador 2 gana"
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

  const myPlayer = useMemo(
    () => players.find((p) => p.id === myPlayerId) ?? null,
    [players, myPlayerId],
  )

  const myMove = myPlayer ? gameState?.state.moves?.[myPlayer.id] : null

  useEffect(() => {
    const loadGame = async () => {
      console.log("Cargando juego:", code)

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

      setPlayers(playersData || [])

      let { data: stateData, error: stateError } = await supabase
        .from("game_state")
        .select("*")
        .eq("room_code", code)
        .maybeSingle()

      if (stateError) {
        console.error("Error cargando game_state:", stateError)
      }

      if (!stateData) {
        const initialState: GameStateData = {
          phase: "playing",
          moves: {},
          result: null,
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

    setSubmittingMove(true)

    const updatedMoves = {
      ...gameState.state.moves,
      [myPlayer.id]: move,
    }

    let result = gameState.state.result
    let phase: GameStateData["phase"] = "playing"

    const playerIds = players.map((p) => p.id)
    const playedIds = Object.keys(updatedMoves)

    if (playerIds.length >= 2 && playerIds.every((id) => playedIds.includes(id))) {
      const moveA = updatedMoves[playerIds[0]]
      const moveB = updatedMoves[playerIds[1]]
      result = getWinner(moveA, moveB)
      phase = "finished"
    }

    const { error } = await supabase
      .from("game_state")
      .update({
        state: {
          ...gameState.state,
          moves: updatedMoves,
          result,
          phase,
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

  const resetGame = async () => {
    const { error } = await supabase
      .from("game_state")
      .update({
        state: {
          phase: "playing",
          moves: {},
          result: null,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("room_code", code)

    if (error) {
      console.error("Error reiniciando juego:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Cargando juego...
      </div>
    )
  }

  if (error || !room) {
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
      <div className="max-w-4xl mx-auto">
        <Link href={`/sala/${code}`}>
          <Button variant="outline" className="mb-6 flex gap-2">
            <ArrowLeft size={16} />
            Volver a la sala
          </Button>
        </Link>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <h1 className="text-3xl font-bold mb-4">Piedra, Papel o Tijera</h1>
          <p className="text-zinc-300 mb-2">
            Código de sala: <span className="font-bold text-white">{code}</span>
          </p>
          <p className="text-zinc-300 mb-6">
            Estado actual:{" "}
            <span className="font-bold text-green-400">
              {gameState?.state.phase || "playing"}
            </span>
          </p>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {players.map((player) => {
              const move = gameState?.state.moves?.[player.id]

              return (
                <div key={player.id} className="bg-zinc-800 rounded-xl p-4">
                  <p className="font-bold">{player.player_name}</p>
                  <p className="text-zinc-400">
                    {move ? `Ya eligió: ${move}` : "Esperando jugada..."}
                  </p>
                </div>
              )
            })}
          </div>

          <div className="bg-zinc-800 rounded-xl p-6 mb-6">
            <p className="text-lg font-semibold mb-4">Tu elección</p>

            <div className="flex flex-wrap gap-3">
              {OPTIONS.map((option) => (
                <Button
                  key={option}
                  onClick={() => submitMove(option)}
                  disabled={!!myMove || gameState?.state.phase === "finished" || submittingMove}
                >
                  {option}
                </Button>
              ))}
            </div>

            <div className="mt-4 text-zinc-400">
              {myMove ? `Ya elegiste: ${myMove}` : "Aún no has elegido"}
            </div>
          </div>

          {gameState?.state.result && (
            <div className="bg-zinc-800 rounded-xl p-6">
              <p className="text-xl font-bold mb-2">Resultado</p>
              <p className="text-green-400 font-semibold mb-4">
                {gameState.state.result}
              </p>

              <Button onClick={resetGame}>Jugar otra vez</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
