import { createClient } from "@/lib/supabase/client";

const GUEST_STORAGE_KEY = "lmf:guest-profile";

export type PlayerIdentity = {
  name: string;
  user_id: string | null;
  is_guest: boolean;
};

export async function getPlayerIdentity(): Promise<PlayerIdentity | null> {
  const supabase = createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("Error obteniendo usuario autenticado:", error);
  }

  if (user) {
    const displayName =
      user.user_metadata?.display_name ||
      user.user_metadata?.name ||
      (user.email ? user.email.split("@")[0] : "Usuario");

    return {
      name: String(displayName),
      user_id: user.id,
      is_guest: false,
    };
  }

  if (typeof window !== "undefined") {
    const rawLocal = localStorage.getItem(GUEST_STORAGE_KEY);
    const rawSession = sessionStorage.getItem(GUEST_STORAGE_KEY);
    const raw = rawLocal || rawSession;

    if (raw) {
      try {
        const parsed = JSON.parse(raw);

        if (parsed?.guestName && typeof parsed.guestName === "string") {
          return {
            name: parsed.guestName,
            user_id: null,
            is_guest: true,
          };
        }
      } catch (parseError) {
        console.error("Error parseando perfil invitado:", parseError);
      }
    }
  }

  return null;
}
