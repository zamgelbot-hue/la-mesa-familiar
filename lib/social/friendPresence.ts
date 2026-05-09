// 📍 Ruta del archivo: lib/social/friendPresence.ts

export type FriendPresenceProfile = {
  last_seen_at?: string | null;
  current_room_code?: string | null;
  current_game_slug?: string | null;
};

export type FriendPresenceInfo = {
  label: string;
  detail: string;
  tone: "online" | "playing" | "room" | "away" | "offline";
};

const GAME_LABELS: Record<string, string> = {
  ppt: "Piedra, Papel o Tijera",
  "loteria-mexicana": "Lotería Mexicana",
  "pregunta-pregunta": "Pregunta Pregunta",
  gato: "El Gato",
  "personaje-secreto": "Personaje Secreto",
  "guerra-total": "Guerra Total",
  memorama: "Memorama",
  "secuencia-oculta": "Secuencia Oculta",
  domino: "Dominó",
};

function minutesSince(dateValue?: string | null) {
  if (!dateValue) return null;

  const time = new Date(dateValue).getTime();
  if (Number.isNaN(time)) return null;

  return Math.max(0, Math.floor((Date.now() - time) / 60_000));
}

export function getFriendPresenceInfo(
  profile: FriendPresenceProfile,
): FriendPresenceInfo {
  if (profile.current_game_slug) {
    return {
      label: `Jugando ${GAME_LABELS[profile.current_game_slug] ?? profile.current_game_slug}`,
      detail: profile.current_room_code
        ? `Sala ${profile.current_room_code}`
        : "En partida",
      tone: "playing",
    };
  }

  if (profile.current_room_code) {
    return {
      label: "En sala",
      detail: `Sala ${profile.current_room_code}`,
      tone: "room",
    };
  }

  const minutes = minutesSince(profile.last_seen_at);

  if (minutes === null) {
    return {
      label: "Sin actividad reciente",
      detail: "Todavía no hay registro",
      tone: "offline",
    };
  }

  if (minutes <= 2) {
    return {
      label: "En línea",
      detail: "Activo ahora",
      tone: "online",
    };
  }

  if (minutes < 60) {
    return {
      label: `Activo hace ${minutes} min`,
      detail: "Actividad reciente",
      tone: "away",
    };
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return {
      label: `Activo hace ${hours} h`,
      detail: "Hoy estuvo conectado",
      tone: "away",
    };
  }

  const days = Math.floor(hours / 24);

  return {
    label: `Activo hace ${days} día${days === 1 ? "" : "s"}`,
    detail: "Sin conexión reciente",
    tone: "offline",
  };
}
