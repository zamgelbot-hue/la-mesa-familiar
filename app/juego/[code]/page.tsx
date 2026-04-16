"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
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

export default function JuegoPage() {
  const params = useParams()
  const code = (params.code as string).toUpperCase()
  const supabase = createClient()

  const [room, setRoom] = useState<Room | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadRoom = async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("code", code)
        .single()

      if (error || !data) {
        setError("Sala no encontrada")
        setLoading(false)
        return
      }

      setRoom(data)
      setLoading(false)
    }

    loadRoom()
  }, [code, supabase])

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
          <h1 className="text-3xl font-bold mb-4">Partida iniciada</h1>
          <p className="text-zinc-300 mb-2">
            Código de sala: <span className="font-bold text-white">{code}</span>
          </p>
          <p className="text-zinc-300 mb-6">
            Estado actual: <span className="font-bold text-green-400">{room.status}</span>
          </p>

          <div className="bg-zinc-800 rounded-xl p-6">
            <p className="text-lg font-semibold mb-2">Aquí irá el juego</p>
            <p className="text-zinc-400">
              En este punto ya podemos montar la lógica del minijuego real.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
