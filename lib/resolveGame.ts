import { supabase } from "@/lib/supabase/client";
import { applyHeadToHeadMatchRewards } from "@/lib/gameRewards";

export async function resolveGame({
  gameId,
  winnerId,
  loserId,
  gameType = "ppt_human",
}: {
  gameId: string;
  winnerId: string;
  loserId: string;
  gameType?: "ppt_human" | "ppt_bot";
}) {
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

  await applyHeadToHeadMatchRewards({
    supabase,
    winnerUserId: winnerId,
    loserUserId: loserId,
    gameType,
  });

  const { error: resolveError } = await supabase
    .from("games")
    .update({ is_resolved: true })
    .eq("id", gameId);

  if (resolveError) {
    console.error("Error marcando game como resuelto:", resolveError);
    return;
  }

  console.log("✅ Game resuelto correctamente");
}
