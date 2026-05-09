// 📍 Ruta del archivo: components/tutorials/TutorialHero.tsx

export default function TutorialHero() {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <div className="inline-flex rounded-full border border-orange-500/20 bg-orange-500/10 px-5 py-2 text-sm font-bold text-orange-200">
        📘 Centro de ayuda
      </div>

      <h1 className="mt-6 text-4xl font-black leading-tight md:text-5xl">
        Tutoriales y guías de <span className="text-orange-500">La Mesa Familiar</span>
      </h1>

      <p className="mt-6 text-base text-white/70 md:text-lg">
        Guías claras, visuales y fáciles para aprender a jugar, crear salas y usar la plataforma.
      </p>

      <div className="mt-8 grid gap-3 text-left md:grid-cols-3">
        {["Abre una guía", "Sigue los pasos", "Empieza a jugar"].map((item, index) => (
          <div key={item} className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-2xl">{index + 1}️⃣</p>
            <p className="mt-2 font-black text-white">{item}</p>
            <p className="mt-1 text-sm text-white/50">
              {index === 0
                ? "Toca cualquier tarjeta."
                : index === 1
                  ? "Lee los pasos simples."
                  : "Crea una sala y prueba."}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
