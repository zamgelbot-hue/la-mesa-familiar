// 📍 Ruta del archivo: components/home/HomeFeaturesSection.tsx

const FEATURES = [
  {
    title: "Salas privadas y públicas",
    text: "Crea partidas solo por código o permite que otros jugadores se unan.",
  },
  {
    title: "Tiempo real",
    text: "Movimientos sincronizados y reacciones instantáneas durante la partida.",
  },
  {
    title: "Fácil de usar",
    text: "Interfaz simple para niños, padres y abuelos.",
  },
  {
    title: "Sin descargas",
    text: "Todo corre directo desde tu navegador.",
  },
  {
    title: "Diseño cálido",
    text: "Una experiencia visual inspirada en reuniones familiares y noches de juego.",
  },
  {
    title: "Más juegos pronto",
    text: "Seguiremos agregando clásicos para que la mesa siga creciendo.",
  },
];

export default function HomeFeaturesSection() {
  return (
    <section id="funciones" className="border-t border-orange-500/10 px-6 py-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <h2 className="text-5xl font-extrabold">
            Diseñado para jugar en familia
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-xl text-white/65">
            Todo lo que necesitas para crear momentos inolvidables en línea.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-[28px] border border-white/10 bg-zinc-950/80 p-6 transition hover:border-orange-500/30"
            >
              <h3 className="text-2xl font-bold">{feature.title}</h3>
              <p className="mt-4 text-white/65">{feature.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
