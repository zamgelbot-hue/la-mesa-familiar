"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Copy, Check, Users, Crown, Play, ArrowLeft } from "lucide-react"
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
  
  const [room, setRoom] = useState<Room | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  
  // Placeholder players until we have a players table
  const players = [
    { id: "1", name: "Jugador 1", isHost: true }
  ]

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const supabase = createClient()
        
        const { data, error } = await supabase
          .from('rooms')
          .select('*')
          .eq('code', code.toUpperCase())
          .single()
        
        if (error || !data) {
          setError("Sala no encontrada")
        } else {
          setRoom(data)
        }
      } catch (err) {
        setError("Error al cargar la sala")
      } finally {
        setLoading(false)
      }
    }
    
    fetchRoom()
  }, [code])

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(code.toUpperCase())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleStartGame = () => {
    // TODO: Implement game start logic
    console.log("Starting game...")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando sala...</p>
        </div>
      </div>
    )
  }

  if (error || !room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Sala no encontrada</h1>
          <p className="text-muted-foreground mb-6">
            El código de sala que ingresaste no existe o ha expirado.
          </p>
          <Button asChild>
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al inicio
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Subtle background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-12">
        {/* Back button */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al inicio</span>
        </Link>

        {/* Main Card */}
        <div className="bg-card rounded-2xl border border-border p-8">
          {/* Room Code Section */}
          <div className="text-center mb-8">
            <p className="text-sm text-muted-foreground mb-2">Código de sala</p>
            <div className="inline-flex items-center gap-4 bg-secondary rounded-xl px-6 py-4 border-2 border-dashed border-border">
              <span className="text-3xl sm:text-4xl font-mono font-bold tracking-[0.3em] text-foreground">
                {room.code}
              </span>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleCopyCode}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-green-500" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-muted-foreground">Esperando jugadores...</span>
          </div>

          {/* Players List */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-muted-foreground" />
              <h2 className="font-semibold text-foreground">Jugadores ({players.length})</h2>
            </div>
            
            <div className="space-y-2">
              {players.map((player) => (
                <div 
                  key={player.id}
                  className="flex items-center justify-between bg-secondary/50 rounded-xl px-4 py-3 border border-border"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-semibold">
                        {player.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="font-medium text-foreground">{player.name}</span>
                  </div>
                  {player.isHost && (
                    <div className="flex items-center gap-1 text-primary">
                      <Crown className="w-4 h-4" />
                      <span className="text-sm font-medium">Anfitrión</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="outline" 
              className="flex-1 gap-2"
              onClick={handleCopyCode}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-500" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copiar código
                </>
              )}
            </Button>
            <Button 
              className="flex-1 gap-2"
              onClick={handleStartGame}
            >
              <Play className="w-4 h-4" />
              Iniciar partida
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
