// 📍 Ruta del archivo: lib/social/friendPresence.ts

export type FriendPresenceProfile = {
  last_seen_at?: string | null;
  current_room_code?: string | null;
  current_game_slug?: string | null;
};

export type FriendPresenceTone =
  | "online"
  | "playing"
  | "room"
  | "away"
  | "offline";

export type FriendPresenceInfo = {
  label: string;
  detail: string;
  tone: FriendPresenceTone;
  icon: string;
};

const GAME_LABELS: Record<string, string> = {
  ppt: "Piedra, Papel o Tijera",
  "piedra-papel-o-tijera": "Piedra, Papel o Tijera",
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

function getGameLabel(gameSlug?: string | null) {
  if (!gameSlug) return "En partida";

  const normalized = gameSlug.trim();

  if (!normalized) return "En partida";

  // Compatibilidad con el estado temporal actual:
  // current_game_slug = "En partida"
  if (normalized.toLowerCase() === "en partida") {
    return "En partida";
  }

  return GAME_LABELS[normalized] ?? normalized;
}

export function getFriendPresenceInfo(
  profile: FriendPresenceProfile,
): FriendPresenceInfo {
  if (profile.current_game_slug) {
    return {
      label: getGameLabel(profile.current_game_slug),
      detail: profile.current_room_code
        ? `Sala ${profile.current_room_code}`
        : "Partida activa",
      tone: "playing",
      icon: "🎮",
    };
  }

  if (profile.current_room_code) {
    return {
      label: "En sala",
      detail: `Sala ${profile.current_room_code}`,
      tone: "room",
      icon: "🏠",
    };
  }

  const minutes = minutesSince(profile.last_seen_at);

  if (minutes === null) {
    return {
      label: "Sin actividad",
      detail: "Todavía no hay registro",
      tone: "offline",
      icon: "⚫",
    };
  }

  if (minutes <= 2) {
    return {
      label: "En línea",
      detail: "Activo ahora",
      tone: "online",
      icon: "🟢",
    };
  }

  if (minutes < 60) {
    return {
      label: `Hace ${minutes} min`,
      detail: "Actividad reciente",
      tone: "away",
      icon: "🟡",
    };
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return {
      label: `Hace ${hours} h`,
      detail: "Hoy estuvo conectado",
      tone: "away",
      icon: "🟡",
    };
  }

  const days = Math.floor(hours / 24);

  return {
    label: `Hace ${days} día${days === 1 ? "" : "s"}`,
    detail: "Sin conexión reciente",
    tone: "offline",
    icon: "⚫",
  };
}
