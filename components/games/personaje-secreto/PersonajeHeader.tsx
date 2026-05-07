// 📍 Ruta del archivo: components/games/personaje-secreto/PersonajeHeader.tsx

type Props = {
  categoryLabel: string;
  isHost: boolean;
  onBackToSala: () => void;
  onCloseRoom: () => void;
};

export default function PersonajeHeader({
  categoryLabel,
  isHost,
  onBackToSala,
  onCloseRoom,
}: Props) {
  return (
    <section className="rounded-[32px] border border-orange-500/20 bg-zinc-950/95 p-6 shadow-[0_0_40px_rgba(249,115,22,0.06)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-300/80">
            La Mesa Familiar
          </p>

          <h1 className="mt-2 text-3xl font-black md:text-4xl">
            🕵️ Personaje Secreto
          </h1>

          <p className="mt-2 text-sm text-white/60">
            Categoría:{" "}
            <span className="font-bold text-orange-300">{categoryLabel}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onBackToSala}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white hover:bg-white/10"
          >
            Volver a sala
          </button>

          {isHost && (
            <button
              type="button"
              onClick={onCloseRoom}
              className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200 hover:bg-red-500/20"
            >
              Terminar sala
            </button>
          )}
        </div>
      </div>
    </section>
  );
}