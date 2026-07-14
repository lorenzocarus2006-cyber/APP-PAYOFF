import { createSupabaseServerClient } from "./supabase/server";

export type Role = "og" | "salvo";

/** Ruolo dell'utente loggato (letto da user_metadata.role), null se non autenticato o ruolo assente. */
export async function getRole(): Promise<Role | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const role = data.user.user_metadata?.role;
  return role === "og" || role === "salvo" ? role : null;
}
