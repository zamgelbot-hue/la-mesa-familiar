"use client"

import { Dice1, Target, PenTool, MessageCircle, Crown, Grid3X3 } from "lucide-react"

const games = [
  {
    name: "Lotería",
    description: "El clásico bingo mexicano con hermosas cartas ilustradas",
    icon: Grid3X3,
    players: "2-10",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    name: "Dominó",
    description: "Juego estratégico de fichas para toda la familia",
    icon: Dice1,
    players: "2-4",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    name: "Trivia Familiar",
    description: "Pon a prueba el conocimiento de tu familia con preguntas personalizadas",
    icon: MessageCircle,
    players: "2-8",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    name: "Pictionary",
    description: "Dibuja y adivina con tus seres queridos en tiempo real",
    icon: PenTool,
    players: "4-12",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    name: "Bingo",
    description: "El clásico bingo de números con un toque moderno",
    icon: Target,
    players: "2-20",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    name: "Memorama",
    description: "Encuentra los pares y entrena tu memoria",
    icon: Crown,
    players: "2-6",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
]

export function GamesSection() {
  return (
    <section id="juegos" className="py-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 text-balance">
            Juegos clásicos, experiencia moderna
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            Juega tus juegos tradicionales favoritos con familiares de todo el mundo
          </p>
        </div>

        {/* Games Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {games.map((game) => (
            <div
              key={game.name}
              className="group bg-card rounded-xl p-6 border border-border hover:border-primary/50 transition-all cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-lg ${game.bgColor} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                  <game.icon className={`w-6 h-6 ${game.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{game.name}</h3>
                    <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full whitespace-nowrap">
                      {game.players} jugadores
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{game.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
