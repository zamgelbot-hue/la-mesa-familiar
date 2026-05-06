// 📍 Ruta del archivo: components/games/memorama/MemoramaHeader.tsx

import {
  GameSecondaryButton,
  GameSection,
  GameTopBar,
} from "@/components/games/core";

type Props = {
  variantLabel: string;
  pairs: number;
  isPremiumSet: boolean;
  variantPreview: string[];
  isHost: boolean;
  onBackToSala: () => void;
  onCloseRoom: () => void;
};

export default function MemoramaHeader({
  variantLabel,
  pairs,
  isPremiumSet,
  variantPreview,
  isHost,
  onBackToSala,
  onCloseRoom,
}: Props) {
  return (
    <>
      <GameTopBar
        title="🧠 Memorama"
        subtitle={`Variante: ${variantLabel} · ${pairs} pares${
          isPremiumSet ? " · Premium preparado para tienda" : ""
        }`}
        rightContent={
          <div className="flex flex-wrap gap-2">
            <GameSecondaryButton onClick={onBackToSala}>
              Volver a sala
            </GameSecondaryButton>

            {isHost && (
              <button
                type="button"
                onClick={onCloseRoom}
                className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm font-black text-red-200 transition hover:bg-red-500/20 active:scale-[0.98]"
              >
                Terminar sala
              </button>
            )}
          </div>
        }
      />

      <GameSection>
        <div className="flex flex-wrap gap-2">
          {variantPreview.map((emoji, index) => (
            <span
              key={`${emoji}-${index}`}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/30 text-xl"
            >
              {emoji}
            </span>
          ))}
        </div>
      </GameSection>
    </>
  );
}