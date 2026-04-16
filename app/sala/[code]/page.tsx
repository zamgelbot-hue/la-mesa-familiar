"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Copy, Check, Users, Crown, ArrowLeft, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

interface Room {
  id: string
  code: string
  created_at: string
}

interface RoomPlayer {
  id: string
  room_code: string
  player_name: string
  is_host: boolean
  created_at: string
}

export default function SalaPage() {
  const params = useParams()
  const code = (params.code as string).toUpperCase()
  const supabase = createClient()

  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<RoomPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const loadRoomAndPlayers = async () => {
      try {
        // 1) Buscar sala
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

        // 2) Cargar jugadores actuales
        const { data: existingPlayers, error: playersError } = await supabase
          .from("room_players")
          .select("*")
          .eq("room_code", code)
          .order("created_at", { ascending: true })

        if (playersError) {
          console.error("Error cargando jugadores:", playersError)
          setError("Error al cargar jugadores")
          setLoading(false)
          return
        }

        const currentPlayers = existingPlayers || []
        const storageKey = `room_player_${code}`
        const savedPlayerId = sessionStorage.getItem(storageKey)

        // 3) Si este navegador ya había entrado antes, no volver a insertar
        if (savedPlayerId) {
          setPlayers(currentPlayers)
          setLoading(false)
          return
        }

        // 4) Si no hay jugadores, crear anfitrión
        if (currentPlayers.length === 0) {
          const { data: insertedHost, error: hostError } = await supabase
            .from("room_players")
            .insert([
              {
                room_code: code,
                player_name: "Anfitrión",
                is_host: true,
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
          }

          setPlayers(insertedHost || [])
          setLoading(false)
          return
        }

        // 5) Si ya hay jugadores, crear invitado
        const guestCount =
          currentPlayers.filter((p) => !p.is_host).length + 1
        const guestName = `Jugador ${guestCount}`

        const { data: insertedGuest, error: guestError } = await supabase
          .from("room_players")
          .insert([
            {
              room_code: code,
              player_name: guestName,
              is_host: false,
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
        }

        // 6) Recargar lista completa
        const { data: updatedPlayers, error: refreshError } = await supabase
          .from("room_players")
          .select("*")
          .eq("room_code", code)
          .order("created_at", { ascending: true })

        if (refreshError) {
          console.error("Error recargando jugadores:", refreshError)
          setError("Error al actualizar jugadores")
          setLoading(false)
          return
        }

        setPlayers(updatedPlayers || [])
        setLoading(false)
      } catch (err) {
        console.error("Error general:", err)
        setError("Ocurrió un error inesperado")
        setLoading(false)
      }
    }

    loadRoomAndPlayers()
  }, [code, supabase])

  const copyCode = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleStartGame = () => {
    console.log("Iniciar partida")
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
        <div className="mb-6">
          <Link href="/">
            <Button variant="outline" className="flex gap-2">
              <ArrowLeft size={16} />
              Volver
            </Button>
          </Link>
        </div>

        <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold">Sala</h1>

            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">Código:</span>
              <span className="bg-orange-500 px-3 py-1 rounded-lg font-bold">
                {code}
              </span>
              <Button size="icon" onClick={copyCode}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-6 text-zinc-300">
            <Users size={20} />
            <h2 className="text-xl font-bold">Jugadores ({players.length})</h2>
          </div>

          <div className="space-y-3 mb-8">
            {players.length === 0 ? (
              <p className="text-gray-400">No hay jugadores aún...</p>
            ) : (
              players.map((player) => (
                <div
                  key={player.id}
                  className="flex justify-between items-center bg-zinc-800 px-4 py-3 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-500 w-10 h-10 flex items-center justify-center rounded-full font-bold">
                      {player.player_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium">{player.player_name}</span>
                  </div>

                  {player.is_host && (
                    <div className="flex items-center gap-1 text-yellow-400 font-medium">
                      <Crown size={16} />
                      Anfitrión
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 flex gap-2"
              onClick={copyCode}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              Copiar código
            </Button>

            <Button className="flex-1 flex gap-2" onClick={handleStartGame}>
              <Play size={16} />
              Iniciar partida
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
