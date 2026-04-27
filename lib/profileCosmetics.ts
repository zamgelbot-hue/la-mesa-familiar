export const AVATARS = [
  // 🔹 Básicos (emoji)
  { key: "avatar_sun", emoji: "🌞", label: "Sol" },
  { key: "avatar_moon", emoji: "🌙", label: "Luna" },
  { key: "avatar_star", emoji: "⭐", label: "Estrella" },
  { key: "avatar_rocket", emoji: "🚀", label: "Cohete" },
  { key: "avatar_game", emoji: "🎮", label: "Gamer" },
  { key: "avatar_guest", emoji: "🙂", label: "Invitado" },

  // 🔥 Premium (imagen)
  {
    key: "avatar_gato_naranja",
    label: "Chopper",
    image: "/avatars/avatar_gato_naranja.png",
  },
  {
    key: "avatar_pug",
    label: "Nala",
    image: "/avatars/avatar_pug.png",
  },
  {
    key: "avatar_delfin",
    label: "Delfín",
    image: "/avatars/avatar_delfin.png",
  },
  {
    key: "avatar_panda",
    label: "Panda",
    image: "/avatars/avatar_panda.png",
  },
  {
    key: "avatar_pajaro_rojo",
    label: "Guacamaya",
    image: "/avatars/avatar_pajaro_rojo.png",
  },
    {
    key: "avatar_mono",
    label: "Mono Molesto",
    image: "/avatars/avatar_mono.png",
  },
  {
  key: "avatar_lobo",
  label: "Lobo",
  image: "/avatars/avatar_lobo.png",
},
{
  key: "avatar_cerdito",
  label: "Cerdito",
  image: "/avatars/avatar_cerdito.png",
},
  {
  key: "avatar_taco",
  label: "Sr Taco",
  image: "/avatars/avatar_taco.png",
},
{
  key: "avatar_hamburguesa",
  label: "Sra Hamburguesa",
  image: "/avatars/avatar_hamburguesa.png",
},
  {
  key: "avatar_chico",
  label: "Chico Gamer",
  image: "/avatars/avatar_chico.png",
},
{
  key: "avatar_chica",
  label: "Chica Bella",
  image: "/avatars/avatar_chica.png",
},
];

export const FRAMES = [
  // 🔹 Básicos (CSS)
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

  // 🔥 Premium (imagen)
  {
    key: "marco_perro",
    label: "Marco Canino",
    image: "/frames/marco_perro.png",
  },
  {
    key: "marco_gato",
    label: "Marco Felino",
    image: "/frames/marco_gato.png",
  },
  {
    key: "marco_oceano",
    label: "Marco Océano",
    image: "/frames/marco_oceano.png",
  },
  {
    key: "marco_selva",
    label: "Marco Selva",
    image: "/frames/marco_selva.png",
  },
];

export function getAvatarByKey(key?: string | null) {
  return AVATARS.find((avatar) => avatar.key === key) ?? AVATARS[0];
}

export function getFrameByKey(key?: string | null) {
  return FRAMES.find((frame) => frame.key === key) ?? FRAMES[0];
}
