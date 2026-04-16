"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Copy, Check, Users, Crown, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

interface Room {
  id: string
  code: string
  created_at: string
}

export default function SalaPage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string

  const supabase = createClient()

  const [room, setRoom] = useState<Room | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [players, setPlayers] = useState<any[]>([])

  // 🔥 Cargar sala
  useEffect(() => {
    const fetchRoom = async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("code", code)
        .single()

      if (error) {
        setError("Sala no encontrada")
        setLoading(false)
        return
      }

      setRoom(data)
      setLoading(false)
    }

    fetchRoom()
  }, [code])

  // 🔥 Cargar jugadores reales
  useEffect(() => {
    const fetchPlayers = async () => {
      const { data, error } = await supabase
        .from("room_players")
        .select("*")
        .eq("room_code", code)
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Error cargando jugadores:", error)
        return
      }

      setPlayers(data || [])
    }

    fetchPlayers()
  }, [code])

  const copyCode = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <Link href="/">
          <Button variant="outline" className="flex gap-2">
            <ArrowLeft size={16} />
            Volver
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">Código:</span>
          <span className="bg-orange-500 px-3 py-1 rounded">{code}</span>
          <Button size="icon" onClick={copyCode}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </Button>
        </div>
      </div>

      {/* JUGADORES */}
      <div className="bg-zinc-900 rounded-xl p-6 max-w-xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Users />
          <h2 className="text-xl font-bold">Jugadores</h2>
        </div>

        <div className="flex flex-col gap-3">
          {players.length === 0 && (
            <p className="text-gray-400">No hay jugadores aún...</p>
          )}

          {players.map((player) => (
            <div
              key={player.id}
              className="flex justify-between items-center bg-zinc-800 px-4 py-3 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="bg-orange-500 w-8 h-8 flex items-center justify-center rounded-full font-bold">
                  {player.player_name.charAt(0).toUpperCase()}
                </div>

                <span>{player.player_name}</span>
              </div>

              {player.is_host && (
                <div className="flex items-center gap-1 text-yellow-400">
                  <Crown size={16} />
                  Host
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
