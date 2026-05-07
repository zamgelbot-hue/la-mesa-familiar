// 📍 Ruta del archivo: components/games/personaje-secreto/PersonajeSecretPicker.tsx

type Props = {
  phase: "picking" | "playing" | "finished";
  hasMySecret: boolean;
  secretInput: string;
  saving: boolean;
  onSecretInputChange: (value: string) => void;
  onConfirmSecret: () => void;
};

export default function PersonajeSecretPicker({
  phase,
  hasMySecret,
  secretInput,
  saving,
  onSecretInputChange,
  onConfirmSecret,
}: Props) {
  if (phase !== "picking") return null;

  if (hasMySecret) {
    return (
      <div className="rounded-[28px] border border-yellow-500/20 bg-yellow-500/10 p-5">
        <h2 className="text-xl font-black text-yellow-200">
          ⏳ Esperando al otro jugador...
        </h2>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-orange-500/20 bg-zinc-950/90 p-5">
      <h2 className="text-xl font-black">🎭 Elige tu personaje secreto</h2>

      <p className="mt-2 text-sm text-white/60">
        Escríbelo bien. El rival no podrá verlo.
      </p>

      <div className="mt-4 flex flex-col gap-3 md:flex-row">
        <input
          value={secretInput}
          onChange={(e) => onSecretInputChange(e.target.value)}
          placeholder="Ejemplo: Mario Bros"
          className="min-h-[48px] flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-orange-400"
        />

        <button
          type="button"
          disabled={saving}
          onClick={onConfirmSecret}
          className="rounded-2xl bg-orange-500 px-5 py-3 font-black text-black hover:bg-orange-400 disabled:opacity-60"
        >
          Confirmar
        </button>
      </div>
    </div>
  );
}