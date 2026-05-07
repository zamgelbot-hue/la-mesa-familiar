// 📍 Ruta del archivo: components/games/personaje-secreto/PersonajeTurnBanner.tsx

type Props = {
  show: boolean;
  currentTurnName: string | null;
};

export default function PersonajeTurnBanner({ show, currentTurnName }: Props) {
  if (!show) return null;

  return (
    <div className="rounded-[28px] border border-purple-500/20 bg-purple-500/10 p-5">
      <h2 className="text-xl font-black text-purple-200">🎲 Turno actual</h2>

      <p className="mt-2 text-white/70">
        Le toca a{" "}
        <span className="font-black text-white">
          {currentTurnName ?? "Jugador"}
        </span>
      </p>
    </div>
  );
}