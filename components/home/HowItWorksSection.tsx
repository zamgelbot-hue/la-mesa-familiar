// 📍 Ruta del archivo: components/home/HowItWorksSection.tsx

const STEPS = [
  {
    step: "01",
    title: "Elige un juego",
    text: "Selecciona entre nuestra colección de juegos clásicos y elige la experiencia que quieres jugar.",
    icon: "🎮",
  },
  {
    step: "02",
    title: "Crea tu sala",
    text: "Genera una sala privada, pública o para amigos con un código único.",
    icon: "➕",
  },
  {
    step: "03",
    title: "Invita o únete",
    text: "Comparte el código o entra a salas públicas disponibles.",
    icon: "🌍",
  },
  {
    step: "04",
    title: "¡A jugar!",
    text: "Entren juntos, prepárense y disfruten la partida en tiempo real.",
    icon: "🔥",
  },
];

export default function HowItWorksSection() {
  return (
    <section
      id="como-funciona"
      className="border-t border-orange-500/10 bg-black/60 px-6 py-16"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <h2 className="text-5xl font-extrabold">Cómo funciona</h2>
          <p className="mx-auto mt-4 max-w-3xl text-xl text-white/65">
            Empieza en minutos—sin descargas, sin configuración complicada.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {STEPS.map((item) => (
            <div
              key={item.step}
              className="rounded-[28px] border border-white/10 bg-zinc-950/80 p-6 transition hover:border-orange-500/30"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold uppercase tracking-[0.18em] text-orange-400">
                  {item.step}
                </div>

                <div className="text-2xl">{item.icon}</div>
              </div>

              <h3 className="mt-4 text-2xl font-bold">{item.title}</h3>
              <p className="mt-4 text-white/65">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
