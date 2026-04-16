import { Video, Globe2, Shield, Smartphone, Zap, Heart } from "lucide-react"

const features = [
  {
    title: "Videollamada integrada",
    description: "Ve a tus seres queridos mientras juegas con videollamada incluida",
    icon: Video,
  },
  {
    title: "Juega desde cualquier lugar",
    description: "Funciona en cualquier dispositivo con navegador—sin descargar nada",
    icon: Globe2,
  },
  {
    title: "Privado y seguro",
    description: "Tus salas familiares son privadas y encriptadas de extremo a extremo",
    icon: Shield,
  },
  {
    title: "Optimizado para móvil",
    description: "Diseñado para celulares y tablets para jugar donde sea",
    icon: Smartphone,
  },
  {
    title: "Empieza al instante",
    description: "No necesitas cuenta para unirte. Solo entra y juega",
    icon: Zap,
  },
  {
    title: "Hecho para familias",
    description: "Juegos para todas las edades en un ambiente seguro",
    icon: Heart,
  },
]

export function FeaturesSection() {
  return (
    <section id="funciones" className="py-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 text-balance">
            Hecho para la diversión familiar
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            Todo lo que necesitas para la noche de juegos perfecta
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-card rounded-xl p-6 border border-border"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
