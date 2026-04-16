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
        // 🔹 Obtener sala
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

        // 🔹 Obtener jugadores actuales
        const { data: existingPlayers, error: playersError } = await supabase
          .from("room_players")
          .select("*")
          .eq("room_code", code)
          .order("created_at", { ascending: true })

        if (playersError) {
          console.error(playersError)
          setError("Error al cargar jugadores")
          setLoading(false)
          return
        }

        const currentPlayers = existingPlayers || []
        const storageKey = `room_player_${code}`
        const savedPlayerId = sessionStorage.getItem(storageKey)

        // 🔹 Si este navegador NO está registrado aún
        if (!savedPlayerId) {
          if (currentPlayers.length === 0) {
            // Crear anfitrión
            const { data: insertedHost } = await supabase
              .from("room_players")
              .insert([
                {
                  room_code: code,
                  player_name: "Anfitrión",
                  is_host: true,
                },
              ])
              .select()

            const host = insertedHost?.[0]
            if (host?.id) {
              sessionStorage.setItem(storageKey, host.id)
            }
          } else {
            // Crear invitado
            const guestCount =
              currentPlayers.filter((p) => !p.is_host).length + 1

            const { data: insertedGuest } = await supabase
              .from("room_players")
              .insert([
                {
                  room_code: code,
                  player_name: `Jugador ${guestCount}`,
                  is_host: false,
                },
              ])
              .select()

            const guest = insertedGuest?.[0]
            if (guest?.id) {
              sessionStorage.setItem(storageKey, guest.id)
            }
          }
        }

        // 🔹 Cargar lista final
        const { data: updatedPlayers } = await supabase
          .from("room_players")
          .select("*")
          .eq("room_code", code)
          .order("created_at", { ascending: true })

        setPlayers(updatedPlayers || [])
        setLoading(false)
      } catch (err) {
        console.error(err)
        setError("Error inesperado")
        setLoading(false)
      }
    }

    loadRoomAndPlayers()

    // 🔥 REALTIME
    const channel = supabase
      .channel(`room-${code}`)
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
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
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
        <p>{error}</p>
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
          {/* HEADER */}
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

          {/* JUGADORES */}
          <div className="flex items-center gap-2 mb-6 text-zinc-300">
            <Users size={20} />
            <h2 className="text-xl font-bold">
              Jugadores ({players.length})
            </h2>
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

                  <span>{player.player_name}</span>
                </div>

                {player.is_host && (
                  <div className="flex items-center gap-1 text-yellow-400">
                    <Crown size={16} />
                    Anfitrión
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* BOTONES */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 flex gap-2"
              onClick={copyCode}
            >
              <Copy size={16} />
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
