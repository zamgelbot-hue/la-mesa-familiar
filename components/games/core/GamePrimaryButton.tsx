// 📍 Ruta del archivo: components/games/core/GamePrimaryButton.tsx

import { ButtonHTMLAttributes, ReactNode } from "react";

type GamePrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export default function GamePrimaryButton({
  children,
  className = "",
  disabled,
  ...props
}: GamePrimaryButtonProps) {
  return (
    <button
      disabled={disabled}
      className={`rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}