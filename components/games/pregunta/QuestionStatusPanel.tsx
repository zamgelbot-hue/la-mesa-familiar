// 📍 Ruta del archivo: components/games/pregunta/QuestionStatusPanel.tsx

type Props = {
  currentRound: number;
  totalRounds: number;
  playersCount: number;
  status: string;
  hasAnswered: boolean;
};

export default function QuestionStatusPanel({
  currentRound,
  totalRounds,
  playersCount,
  status,
  hasAnswered,
}: Props) {
  const items = [
    { label: "Ronda", value: `${currentRound}/${totalRounds}` },
    { label: "Jugadores", value: playersCount },
    { label: "Estado", value: status },
    { label: "Respuesta", value: hasAnswered ? "Enviada" : "Pendiente", highlight: true },
  ];

  return (
    <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-3"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
            {item.label}
          </p>

          <p className={`mt-1 text-lg font-bold ${item.highlight ? "text-orange-300" : "text-white"}`}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}