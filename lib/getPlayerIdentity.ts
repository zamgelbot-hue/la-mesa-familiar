import { createClient } from "@/utils/supabase/client";

export async function getPlayerIdentity() {
  const supabase = createClient();

  // 1. Revisar sesión real
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return {
      name: user.email || "Usuario",
      user_id: user.id,
      is_guest: false,
    };
  }

  // 2. Revisar invitado en localStorage
  if (typeof window !== "undefined") {
    const guest = localStorage.getItem("guest_name");

    if (guest) {
      return {
        name: guest,
        user_id: null,
        is_guest: true,
      };
    }
  }

  // 3. Si no hay nada
  return null;
}
