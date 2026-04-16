"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, ArrowRight, Sparkles, Copy, Check, PartyPopper, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function HeroSection() {
  const router = useRouter()
  const [roomCode, setRoomCode] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null)
  const [showRoomModal, setShowRoomModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [joinStatus, setJoinStatus] = useState<"idle" | "found" | "not-found">("idle")

  const handleCreateRoom = async () => {
    setIsCreating(true)
    
    try {
      const supabase = createClient()
      
      // Generate a random room code
      const newRoomCode = Math.random().toString(36).substring(2, 8).toUpperCase()
      
      const { data, error } = await supabase
        .from('rooms')
        .insert([{ code: newRoomCode }])
        .select()
      
      if (error) {
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          console.error('The "rooms" table does not exist yet. Please create it in your Supabase database.')
        } else {
          console.error('Error creating room:', error.message)
        }
      } else {
        setCreatedRoomCode(newRoomCode)
        setShowRoomModal(true)
      }
    } catch (err) {
      console.error('Unexpected error:', err)
    } finally {
      setIsCreating(false)
    }
  }

  const handleCopyCode = async () => {
    if (createdRoomCode) {
      await navigator.clipboard.writeText(createdRoomCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleJoinRoom = async () => {
    if (roomCode.length >= 4) {
      setIsJoining(true)
      setJoinStatus("idle")
      
      try {
        const supabase = createClient()
        
        const { data, error } = await supabase
          .from('rooms')
          .select('*')
          .eq('code', roomCode.toUpperCase())
          .single()
        
        if (error || !data) {
          setJoinStatus("not-found")
        } else {
          setJoinStatus("found")
          // Redirect to the room lobby
          setTimeout(() => {
            router.push(`/sala/${roomCode.toUpperCase()}`)
          }, 500)
        }
      } catch (err) {
        console.error('Unexpected error:', err)
        setJoinStatus("not-found")
      } finally {
        setIsJoining(false)
      }
    }
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
      {/* Subtle background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-12 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border mb-8">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm text-muted-foreground">Noche de juegos en familia, donde sea</span>
        </div>

        {/* Main Heading */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 text-balance leading-tight">
          Jueguen juntos,
          <br />
          <span className="text-primary">sigan conectados</span>
        </h1>

        {/* Subheading */}
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 text-pretty">
          La Mesa Familiar trae tus juegos clásicos favoritos en línea. Crea una sala, invita a tu familia y hagan recuerdos juntos—sin importar la distancia.
        </p>

        {/* Action Cards */}
        <div className="grid sm:grid-cols-2 gap-4 max-w-xl mx-auto">
          {/* Create Room Card */}
          <div className="bg-card rounded-2xl p-6 border border-border hover:border-primary/50 transition-all group">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 mx-auto group-hover:bg-primary/20 transition-colors">
              <Plus className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Crear sala</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Inicia una nueva sesión de juego e invita a tu familia a unirse
            </p>
            <Button 
              className="w-full gap-2" 
              onClick={handleCreateRoom}
              disabled={isCreating}
            >
              {isCreating ? (
                <>Creando...</>
              ) : (
                <>
                  Crear sala
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>

          {/* Join Room Card */}
          <div className="bg-card rounded-2xl p-6 border border-border hover:border-primary/50 transition-all group">
            <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mb-4 mx-auto group-hover:bg-accent/20 transition-colors">
              <ArrowRight className="w-7 h-7 text-accent" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Unirse a sala</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Ingresa un código de sala para unirte a una sesión existente
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Input 
                  placeholder="Código" 
                  value={roomCode}
                  onChange={(e) => {
                    setRoomCode(e.target.value.toUpperCase())
                    setJoinStatus("idle")
                  }}
                  className="text-center uppercase tracking-widest font-mono"
                  maxLength={6}
                />
                <Button 
                  variant="secondary" 
                  onClick={handleJoinRoom}
                  disabled={roomCode.length < 4 || isJoining}
                >
                  {isJoining ? "..." : "Unirse"}
                </Button>
              </div>
              {joinStatus === "found" && (
                <div className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <Check className="w-4 h-4" />
                  <span>Sala encontrada</span>
                </div>
              )}
              {joinStatus === "not-found" && (
                <div className="flex items-center justify-center gap-2 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  <span>Sala no encontrada</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap justify-center gap-8 sm:gap-12 mt-16 pt-8 border-t border-border">
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-foreground">10K+</div>
            <div className="text-sm text-muted-foreground">Jugadores activos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-foreground">8</div>
            <div className="text-sm text-muted-foreground">Juegos clásicos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-foreground">50K+</div>
            <div className="text-sm text-muted-foreground">Partidas jugadas</div>
          </div>
        </div>
      </div>

      {/* Room Created Modal */}
      <Dialog open={showRoomModal} onOpenChange={setShowRoomModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <PartyPopper className="w-8 h-8 text-primary" />
            </div>
            <DialogTitle className="text-2xl">Sala creada</DialogTitle>
            <DialogDescription>
              Comparte este código con tu familia para que se unan a la partida
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="bg-secondary rounded-xl px-8 py-4 border-2 border-dashed border-border">
              <span className="text-3xl font-mono font-bold tracking-[0.3em] text-foreground">
                {createdRoomCode}
              </span>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <Button 
                variant="outline" 
                className="flex-1 gap-2" 
                onClick={handleCopyCode}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
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
                onClick={() => {
                  setShowRoomModal(false)
                  router.push(`/sala/${createdRoomCode}`)
                }}
              >
                Ir a la sala
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
