// 📍 Ruta del archivo: components/games/core/GameSecondaryButton.tsx

import { ButtonHTMLAttributes, ReactNode } from "react";

type GameSecondaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export default function GameSecondaryButton({
  children,
  className = "",
  disabled,
  ...props
}: GameSecondaryButtonProps) {
  return (
    <button
      disabled={disabled}
      className={`rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black text-zinc-200 transition hover:bg-white/10 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}