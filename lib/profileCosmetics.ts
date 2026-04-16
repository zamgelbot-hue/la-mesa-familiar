export const AVATARS = [
  { key: "avatar_sun", emoji: "🌞", label: "Sol" },
  { key: "avatar_moon", emoji: "🌙", label: "Luna" },
  { key: "avatar_star", emoji: "⭐", label: "Estrella" },
  { key: "avatar_rocket", emoji: "🚀", label: "Cohete" },
  { key: "avatar_game", emoji: "🎮", label: "Gamer" },
  { key: "avatar_guest", emoji: "🙂", label: "Invitado" },
];

export const FRAMES = [
  {
    key: "frame_orange",
    label: "Naranja",
    className: "border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.25)]",
  },
  {
    key: "frame_emerald",
    label: "Esmeralda",
    className: "border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.25)]",
  },
  {
    key: "frame_blue",
    label: "Azul",
    className: "border-sky-500 shadow-[0_0_30px_rgba(14,165,233,0.25)]",
  },
  {
    key: "frame_purple",
    label: "Morado",
    className: "border-violet-500 shadow-[0_0_30px_rgba(139,92,246,0.25)]",
  },
  {
    key: "frame_gold",
    label: "Dorado",
    className: "border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.25)]",
  },
  {
    key: "frame_guest",
    label: "Invitado",
    className: "border-white/30 shadow-[0_0_30px_rgba(255,255,255,0.12)]",
  },
];

export function getAvatarByKey(key?: string | null) {
  return AVATARS.find((avatar) => avatar.key === key) ?? AVATARS[0];
}

export function getFrameByKey(key?: string | null) {
  return FRAMES.find((frame) => frame.key === key) ?? FRAMES[0];
}
