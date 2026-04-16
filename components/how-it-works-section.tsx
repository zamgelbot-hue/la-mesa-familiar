import { UserPlus, Share2, Gamepad2, Trophy } from "lucide-react"

const steps = [
  {
    step: "01",
    title: "Crea tu sala",
    description: "Haz clic en 'Crear sala' para generar una sala privada con un código único",
    icon: UserPlus,
  },
  {
    step: "02",
    title: "Invita a tu familia",
    description: "Comparte el código de la sala con tu familia por mensaje, correo o WhatsApp",
    icon: Share2,
  },
  {
    step: "03",
    title: "Elige un juego",
    description: "Selecciona entre nuestra colección de juegos clásicos y personaliza las opciones",
    icon: Gamepad2,
  },
  {
    step: "04",
    title: "¡A jugar!",
    description: "Disfruta tiempo de calidad con gameplay en tiempo real y videollamada",
    icon: Trophy,
  },
]

export function HowItWorksSection() {
  return (
    <section id="como-funciona" className="py-24 px-4 sm:px-6 bg-secondary/30">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 text-balance">
            Cómo funciona
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            Empieza en minutos—sin descargas, sin configuración complicada
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((item, index) => (
            <div key={item.step} className="relative">
              {/* Connector Line - Hidden on mobile */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-1/2 w-full h-px bg-border" />
              )}
              
              <div className="relative bg-card rounded-xl p-6 border border-border text-center">
                {/* Step Number */}
                <div className="text-xs font-mono text-primary mb-4">{item.step}</div>
                
                {/* Icon */}
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-8 h-8 text-primary" />
                </div>
                
                {/* Content */}
                <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
