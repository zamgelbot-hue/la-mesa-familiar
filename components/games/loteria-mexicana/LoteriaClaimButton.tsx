"use client";

type LoteriaClaimButtonProps = {
  onClaim: () => void;
  loading?: boolean;
  disabled?: boolean;
  helperText?: string;
};

export default function LoteriaClaimButton({
  onClaim,
  loading = false,
  disabled = false,
  helperText = "Presiona cuando creas que ya completaste una línea válida.",
}: LoteriaClaimButtonProps) {
  return (
    <div className="rounded-[30px] border border-emerald-500/15 bg-emerald-500/10 p-5 shadow-[0_0_30px_rgba(16,185,129,0.06)]">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300/80">
        Reclamar victoria
      </p>

      <h2 className="mt-2 text-2xl font-extrabold text-white">¡Lotería!</h2>

      <p className="mt-3 text-sm leading-relaxed text-white/65">
        {helperText}
      </p>

      <button
        type="button"
        onClick={onClaim}
        disabled={disabled || loading}
        className="mt-5 w-full rounded-2xl bg-emerald-500 px-5 py-4 text-lg font-extrabold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Validando..." : "¡Lotería!"}
      </button>
    </div>
  );
}
