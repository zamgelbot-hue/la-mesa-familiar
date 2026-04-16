import { createClient } from "@/lib/supabase/client";

const GUEST_STORAGE_KEY = "lmf:guest-profile";

export type PlayerIdentity = {
  name: string;
  user_id: string | null;
  is_guest: boolean;
  points?: number;
  avatar_key?: string;
  frame_key?: string;
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
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("display_name, points, avatar_key, frame_key")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Error obteniendo perfil:", profileError);
    }

    const displayName =
      profile?.display_name ||
      user.user_metadata?.display_name ||
      user.user_metadata?.name ||
      (user.email ? user.email.split("@")[0] : "Usuario");

    return {
      name: String(displayName),
      user_id: user.id,
      is_guest: false,
      points: profile?.points ?? 0,
      avatar_key: profile?.avatar_key ?? "avatar_sun",
      frame_key: profile?.frame_key ?? "frame_orange",
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
            points: 0,
            avatar_key: "avatar_guest",
            frame_key: "frame_guest",
          };
        }
      } catch (parseError) {
        console.error("Error parseando perfil invitado:", parseError);
      }
    }
  }

  return null;
}
