import { supabase } from "./supabase.js";

export async function requireAdmin() {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    location.href = "index.html";
    throw new Error("Not authenticated");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || profile.role !== "admin") {
    alert("Accès admin requis");
    location.href = "dashboard.html";
    throw new Error("Not admin");
  }

  return user;
}
