// 📍 Ruta del archivo: components/home/HomeHero.tsx

import type { PlayerIdentity } from "@/lib/profile/getPlayerIdentity";
import { getAvatarByKey, getFrameByKey } from "@/lib/profile/profileCosmetics";

type Props = {
  playerIdentity: PlayerIdentity | null;
  onRankingClick: () => void;
};

export default function HomeHero({ playerIdentity, onRankingClick }: Props) {
  const selectedAvatar = getAvatarByKey(playerIdentity?.avatar_key);
  const selectedFrame = getFrameByKey(playerIdentity?.frame_key);

  const renderProfileAvatar = () => {
    return (
      <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-black">
        {selectedFrame.image ? (
          <img
            src={selectedFrame.image}
            alt={selectedFrame.label ?? "Frame"}
            className="absolute inset-0 h-full w-full object-contain"
          />
        ) : (
          <div
            className={`absolute inset-0 rounded-full border-2 ${
              selectedFrame.className ?? ""
            }`}
          />
        )}

        {selectedAvatar.image ? (
          <img
            src={selectedAvatar.image}
            alt={selectedAvatar.label ?? "Avatar"}
            className="relative z-10 h-7 w-7 object-contain"
          />
        ) : (
          <span className="relative z-10 text-lg">{selectedAvatar.emoji}</span>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-5xl text-center">
      <h1 className="text-5xl font-extrabold leading-tight md:text-7xl">
        Jueguen juntos,
        <br />
        <span className="text-orange-500">sigan conectados</span>
      </h1>

      <p className="mx-auto mt-8 max-w-3xl text-xl leading-relaxed text-white/70">
        La Mesa Familiar trae tus juegos clásicos favoritos en línea. Crea una
        sala, invita a tu familia y hagan recuerdos juntos sin importar la
        distancia.
      </p>

      {playerIdentity && (
        <div className="mt-6 flex flex-col items-center gap-4">
          <div className="inline-flex items-center gap-3 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
            {renderProfileAvatar()}
            <span>
              Jugando como: {playerIdentity.name}{" "}
              {playerIdentity.is_guest ? "(Invitado)" : ""}
            </span>
          </div>

          {!playerIdentity.is_guest && (
            <button
              type="button"
              onClick={onRankingClick}
              className="rounded-2xl border border-orange-500/20 bg-orange-500/10 px-5 py-3 font-bold text-orange-200 transition hover:bg-orange-500/15"
            >
              Ver ranking global
            </button>
          )}
        </div>
      )}
    </div>
  );
}
