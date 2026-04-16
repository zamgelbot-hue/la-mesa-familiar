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
    () => players.find((p) => p.id === myPlayerId) ?? null,
    [players, myPlayerId],
  )

  const isHost = !!myPlayer?.is_host
  const allReady =
    players.length >= 2 && players.every((p) => p.is_ready === true)

  // ===============================
  // LOAD + REALTIME
  // ===============================
  useEffect(() => {
    const load = async () => {
      console.log("Cargando sala:", code)

      const { data: roomData } = await supabase
        .from("rooms")
        .select("*")
        .eq("code", code)
        .single()

      if (!roomData) {
        setError("Sala no encontrada")
        setLoading(false)
        return
      }

      console.log("Room data:", roomData)
      setRoom(roomData)

      // 🔥 Si ya está jugando, redirige
      if (roomData.status === "playing") {
        console.log("Ya estaba en playing, redirigiendo...")
        router.push(`/juego/${code}`)
        return
      }

      const { data: playersData } = await supabase
        .from("room_players")
        .select("*")
        .eq("room_code", code)
        .order("created_at", { ascending: true })

      const currentPlayers = playersData || []
      const storageKey = `room_player_${code}`
      const savedId = sessionStorage.getItem(storageKey)

      if (savedId) {
        setMyPlayerId(savedId)
      }

      // ===============================
      // CREAR PLAYER
      // ===============================
      if (!savedId) {
        if (currentPlayers.length === 0) {
          const { data } = await supabase
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

          const host = data?.[0]
          if (host?.id) {
            sessionStorage.setItem(storageKey, host.id)
            setMyPlayerId(host.id)
          }
        } else {
          const guestCount =
            currentPlayers.filter((p) => !p.is_host).length + 1

          const { data } = await supabase
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

          const guest = data?.[0]
          if (guest?.id) {
            sessionStorage.setItem(storageKey, guest.id)
            setMyPlayerId(guest.id)
          }
        }
      }

      const { data: updated } = await supabase
        .from("room_players")
        .select("*")
        .eq("room_code", code)
        .order("created_at", { ascending: true })

      setPlayers(updated || [])
      setLoading(false)
    }

    load()

    // ===============================
    // REALTIME PLAYERS
    // ===============================
    const playersChannel = supabase
      .channel(`players-${code}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_players",
          filter: `room_code=eq.${code}`,
        },
        async () => {
          console.log("Realtime players update")

          const { data } = await supabase
            .from("room_players")
            .select("*")
            .eq("room_code", code)
            .order("created_at", { ascending: true })

          setPlayers(data || [])
        },
      )
      .subscribe()

    // ===============================
    // REALTIME ROOM (START GAME)
    // ===============================
    const roomChannel = supabase
      .channel(`room-${code}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rooms",
          filter: `code=eq.${code}`,
        },
        (payload) => {
          console.log("ROOM UPDATE:", payload)

          if (payload.new.status === "playing") {
            console.log("Detectado playing → redirigiendo")
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

  // ===============================
  // READY
  // ===============================
  const toggleReady = async () => {
    if (!myPlayer) return

    setTogglingReady(true)

    await supabase
      .from("room_players")
      .update({ is_ready: !myPlayer.is_ready })
      .eq("id", myPlayer.id)

    setTogglingReady(false)
  }

  // ===============================
  // START GAME (FIXED 🔥)
  // ===============================
  const startGame = async () => {
    console.log("CLICK START GAME")

    if (!isHost) {
      alert("Solo el anfitrión puede iniciar")
      return
    }

    if (!allReady) {
      alert("Todos deben estar listos")
      return
    }

    setStartingGame(true)

    const { data, error } = await supabase
      .from("rooms")
      .update({
        status: "playing",
        started_at: new Date().toISOString(),
      })
      .eq("code", code)
      .select()

    console.log("UPDATE RESULT:", { data, error })

    if (error) {
      alert(error.message)
      setStartingGame(false)
      return
    }

    if (!data || data.length === 0) {
      alert("No se actualizó la sala (RLS o code incorrecto)")
      setStartingGame(false)
      return
    }

    console.log("Redirigiendo manual...")
    router.push(`/juego/${code}`)
  }

  // ===============================
  // UI
  // ===============================
  if (loading) return <div className="text-white p-10">Cargando...</div>

  if (error) return <div className="text-white p-10">{error}</div>

  return (
    <div className="min-h-screen text-white p-6">
      <div className="max-w-3xl mx-auto">
        <Link href="/">
          <Button className="mb-6">
            <ArrowLeft size={16} /> Volver
          </Button>
        </Link>

        <div className="bg-zinc-900 p-8 rounded-2xl border border-zinc-800">
          <div className="flex justify-between mb-6">
            <h1 className="text-2xl font-bold">Sala</h1>
            <span className="bg-orange-500 px-3 py-1 rounded">
              {code}
            </span>
          </div>

          <div className="mb-4">
            Jugadores ({players.length}) —{" "}
            {allReady ? "Todos listos" : "Esperando"}
          </div>

          <div className="space-y-3 mb-6">
            {players.map((p) => (
              <div
                key={p.id}
                className="flex justify-between bg-zinc-800 p-3 rounded"
              >
                <span>{p.player_name}</span>

                <div className="flex gap-2">
                  {p.is_ready && <span>✅</span>}
                  {p.is_host && <span>👑</span>}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button onClick={toggleReady}>
              {myPlayer?.is_ready ? "Quitar listo" : "Estoy listo"}
            </Button>

            <Button
              onClick={startGame}
              disabled={!isHost || !allReady}
            >
              Iniciar partida
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
