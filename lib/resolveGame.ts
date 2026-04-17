import { supabase } from "@/lib/supabase/client";

export async function resolveGame({
  gameId,
  winnerId,
  loserId,
}: {
  gameId: string;
  winnerId: string;
  loserId: string;
}) {
  // 1. Revisar si ya se resolvió
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("is_resolved")
    .eq("id", gameId)
    .single();

  if (gameError) {
    console.error("Error obteniendo game:", gameError);
    return;
  }

  if (game?.is_resolved) {
    console.log("⚠️ Game ya resuelto, evitando duplicado");
    return;
  }

  // 2. Obtener perfiles
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, points, games_played, games_won, games_lost")
    .in("id", [winnerId, loserId]);

  if (profilesError) {
    console.error("Error obteniendo profiles:", profilesError);
    return;
  }

  const winner = profiles.find(p => p.id === winnerId);
  const loser = profiles.find(p => p.id === loserId);

  if (!winner || !loser) return;

  // 3. Actualizar ganador
  await supabase.from("profiles").update({
    points: (winner.points || 0) + 10,
    games_played: (winner.games_played || 0) + 1,
    games_won: (winner.games_won || 0) + 1,
  }).eq("id", winnerId);

  // 4. Actualizar perdedor
  await supabase.from("profiles").update({
    points: (loser.points || 0) + 3,
    games_played: (loser.games_played || 0) + 1,
    games_lost: (loser.games_lost || 0) + 1,
  }).eq("id", loserId);

  // 5. Marcar partida como resuelta
  await supabase.from("games").update({
    is_resolved: true,
  }).eq("id", gameId);

  console.log("✅ Game resuelto correctamente");
}
