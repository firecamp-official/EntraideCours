// uxGuard.js
import { supabase } from "./supabase.js";

/**
 * Vérifie que l'utilisateur est connecté ET que son profil n'est pas supprimé.
 * Retourne { user, profile } si ok, redirige sinon.
 */
export async function requireUser() {
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    window.location.href = "index.html";
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Si pas de profil ou supprimé, déconnexion immédiat

  if (profileError || !profile || profile.deleted) {
    await supabase.auth.signOut();
    window.location.href = "index.html";
    return;
  }

  return { user, profile };
}

/**
 * Vérifie que l'utilisateur est admin
 */
export async function requireAdmin() {
  const { user, profile } = await requireUser();

  if (profile.role !== "admin") {
    window.location.href = "index.html";
    return;
  }

  return { user, profile };
}
