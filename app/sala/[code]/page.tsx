"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Copy,
  Check,
  Users,
  Crown,
  ArrowLeft,
  Play,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

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

export default function SalaPage() {
  const params = useParams()
  const router = useRouter()
  const code = (params.code as string).toUpperCase()
  const supabase = createClient()

  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<RoomPlayer[]>([])
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [togglingReady, setTogglingReady] = useState(false)
  const [startingGame, setStartingGame] = useState(false)

  const myPlayer = useMemo(
    () => players.find((player) => player.id === myPlayerId) ?? null,
    [players, myPlayerId],
  )

  const isHost = !!myPlayer?.is_host
  const allReady =
    players.length >= 2 && players.every((player) => player.is_ready === true)

  useEffect(() => {
    const loadRoomAndPlayers = async () => {
      try {
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

        if (roomData.status === "playing") {
          router.push(`/juego/${code}`)
          return
        }

        const { data: existingPlayers, error: playersError } = await supabase
          .from("room_players")
          .select("*")
          .eq("room_code", code)
          .order("created_at", { ascending: true })

        if (playersError) {
          console.error("Error al cargar jugadores:", playersError)
          setError("Error al cargar jugadores")
          setLoading(false)
          return
        }

        const currentPlayers = existingPlayers || []
        const storageKey = `room_player_${code}`
        const savedPlayerId = sessionStorage.getItem(storageKey)

        if (savedPlayerId) {
          setMyPlayerId(savedPlayerId)
        }

        if (!savedPlayerId) {
          if (currentPlayers.length === 0) {
            const { data: insertedHost, error: hostError } = await supabase
              .from("room_players")
              .insert([
                {
                  room_code: code,
                  player_name: "Anfitrión",
                  is_host: true,
                  is_ready: false,
                },
              ])
              .select()

            if (hostError) {
              console.error("Error creando anfitrión:", hostError)
              setError("Error al crear anfitrión")
              setLoading(false)
              return
            }

            const host = insertedHost?.[0]
            if (host?.id) {
              sessionStorage.setItem(storageKey, host.id)
              setMyPlayerId(host.id)
            }
          } else {
            const guestCount =
              currentPlayers.filter((p) => !p.is_host).length + 1

            const { data: insertedGuest, error: guestError } = await supabase
              .from("room_players")
              .insert([
                {
                  room_code: code,
                  player_name: `Jugador ${guestCount}`,
                  is_host: false,
                  is_ready: false,
                },
              ])
              .select()

            if (guestError) {
              console.error("Error creando invitado:", guestError)
              setError("Error al unirse a la sala")
              setLoading(false)
              return
            }

            const guest = insertedGuest?.[0]
            if (guest?.id) {
              sessionStorage.setItem(storageKey, guest.id)
              setMyPlayerId(guest.id)
            }
          }
        }

        const { data: updatedPlayers, error: refreshError } = await supabase
          .from("room_players")
          .select("*")
          .eq("room_code", code)
          .order("created_at", { ascending: true })

        if (refreshError) {
          console.error("Error al actualizar jugadores:", refreshError)
          setError("Error al actualizar jugadores")
          setLoading(false)
          return
        }

        setPlayers(updatedPlayers || [])
        setLoading(false)
      } catch (err) {
        console.error("Error general:", err)
        setError("Error inesperado")
        setLoading(false)
      }
    }

    loadRoomAndPlayers()

    const playersChannel = supabase
      .channel(`room-players-${code}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_players",
          filter: `room_code=eq.${code}`,
        },
        async () => {
          const { data, error } = await supabase
            .from("room_players")
            .select("*")
            .eq("room_code", code)
            .order("created_at", { ascending: true })

          if (error) {
            console.error("Error realtime jugadores:", error)
            return
          }

          setPlayers(data || [])
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
        async () => {
          const { data, error } = await supabase
            .from("rooms")
            .select("*")
            .eq("code", code)
            .single()

          if (error || !data) return

          setRoom(data)

          if (data.status === "playing") {
            router.push(`/juego/${code}`)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(playersChannel)
      supabase.removeChannel(roomChannel)
    }
  }, [code, router, supabase])

  const copyCode = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleToggleReady = async () => {
    if (!myPlayer) return

    setTogglingReady(true)

    const { error } = await supabase
      .from("room_players")
      .update({ is_ready: !myPlayer.is_ready })
      .eq("id", myPlayer.id)

    if (error) {
      console.error("Error al cambiar ready:", error)
    }

    setTogglingReady(false)
  }

  const handleStartGame = async () => {
    if (!isHost) {
      alert("Solo el anfitrión puede iniciar la partida.")
      return
    }

    if (!allReady) {
      alert("Todos los jugadores deben estar listos para iniciar.")
      return
    }

    setStartingGame(true)

    const { error } = await supabase
      .from("rooms")
      .update({
        status: "playing",
        started_at: new Date().toISOString(),
      })
      .eq("code", code)

    if (error) {
      console.error("Error al iniciar partida:", error)
      alert("No se pudo iniciar la partida.")
      setStartingGame(false)
      return
    }

    setStartingGame(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Cargando...
      </div>
    )
  }

  if (error || !room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-white gap-4">
        <p>{error || "Sala no encontrada"}</p>
        <Link href="/">
          <Button>Volver</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-white p-6">
      <div className="max-w-3xl mx-auto">
        <Link href="/">
          <Button variant="outline" className="mb-6 flex gap-2">
            <ArrowLeft size={16} />
            Volver
          </Button>
        </Link>

        <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold">Sala</h1>

            <div className="flex items-center gap-2">
              <span className="font-bold">Código:</span>
              <span className="bg-orange-500 px-3 py-1 rounded-lg font-bold">
                {code}
              </span>
              <Button size="icon" onClick={copyCode}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </Button>
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-zinc-300">
              <Users size={20} />
              <h2 className="text-xl font-bold">Jugadores ({players.length})</h2>
            </div>

            <div className="text-sm text-zinc-400">
              {allReady ? "Todos listos" : "Esperando jugadores listos"}
            </div>
          </div>

          <div className="space-y-3 mb-8">
            {players.map((player) => (
              <div
                key={player.id}
                className="flex justify-between items-center bg-zinc-800 px-4 py-3 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-orange-500 w-10 h-10 flex items-center justify-center rounded-full font-bold">
                    {player.player_name.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex flex-col">
                    <span>{player.player_name}</span>
                    <span className="text-xs text-zinc-400">
                      {player.is_ready ? "Listo" : "No listo"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {player.is_ready && (
                    <div className="flex items-center gap-1 text-green-400">
                      <CheckCircle2 size={16} />
                      Listo
                    </div>
                  )}

                  {player.is_host && (
                    <div className="flex items-center gap-1 text-yellow-400">
                      <Crown size={16} />
                      Anfitrión
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 flex gap-2"
              onClick={copyCode}
            >
              <Copy size={16} />
              Copiar código
            </Button>

            <Button
              variant={myPlayer?.is_ready ? "outline" : "default"}
              className="flex-1"
              onClick={handleToggleReady}
              disabled={!myPlayer || togglingReady || startingGame}
            >
              {myPlayer?.is_ready ? "Quitar listo" : "Estoy listo"}
            </Button>

            <Button
              className="flex-1 flex gap-2"
              onClick={handleStartGame}
              disabled={!isHost || !allReady || startingGame}
            >
              <Play size={16} />
              {startingGame ? "Iniciando..." : "Iniciar partida"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
