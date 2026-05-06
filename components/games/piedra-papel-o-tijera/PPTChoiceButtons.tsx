// 📍 Ruta del archivo: components/games/piedra-papel-o-tijera/PPTChoiceButtons.tsx

import { GameSection } from "@/components/games/core";
import { motion } from "framer-motion";

import type { Choice } from "./pptTypes";

type Props = {
  disabled: boolean;
  selectedChoice: Choice;
  onSelectChoice: (choice: Exclude<Choice, null>) => void;
};

const CHOICES: {
  key: Exclude<Choice, null>;
  label: string;
  emoji: string;
}[] = [
  {
    key: "piedra",
    label: "Piedra",
    emoji: "✊",
  },
  {
    key: "papel",
    label: "Papel",
    emoji: "✋",
  },
  {
    key: "tijera",
    label: "Tijera",
    emoji: "✌️",
  },
];

export default function PPTChoiceButtons({
  disabled,
  selectedChoice,
  onSelectChoice,
}: Props) {
  return (
    <motion.div layout>
      <GameSection title="Elige tu jugada">
        <div className="grid gap-3 sm:grid-cols-3">
          {CHOICES.map((choice) => {
            const isSelected = selectedChoice === choice.key;

            return (
              <button
                key={choice.key}
                type="button"
                disabled={disabled}
                onClick={() => onSelectChoice(choice.key)}
                className={`rounded-3xl border px-4 py-5 text-center transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  isSelected
                    ? "border-orange-400/45 bg-orange-500/15 shadow-[0_0_25px_rgba(249,115,22,0.14)]"
                    : "border-white/10 bg-black/25 hover:border-orange-400/30 hover:bg-orange-500/10"
                }`}
              >
                <div className="text-5xl">{choice.emoji}</div>

                <p className="mt-3 text-lg font-black text-white">
                  {choice.label}
                </p>
              </button>
            );
          })}
        </div>

        {disabled && (
          <p className="mt-4 text-center text-sm text-white/50">
            Espera a que termine la ronda actual.
          </p>
        )}
      </GameSection>
    </motion.div>
  );
}