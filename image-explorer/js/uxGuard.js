import { supabase } from "../../js/supabase.js";

export async function uxGuard() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = "/admin.html";
    return;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (error || profile?.role !== "admin") {
    window.location.href = "/admin.html";
    return;
  }

  document.body.style.display = "block";
}
