import { supabase } from "./supabase.js";

const bubble = document.getElementById("profileBubble");
const letter = document.getElementById("profileLetter");

if (bubble && letter) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    window.location.href = "index.html";
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  if (!error && profile?.username) {
    letter.textContent = profile.username.charAt(0).toUpperCase();
  }
}
