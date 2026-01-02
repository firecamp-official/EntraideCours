import { supabase } from "./supabase.js";

/* ==============================
   ELEMENTS DU FORMULAIRE
============================== */
const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const usernameInput = document.getElementById("username");
const termsCheckbox = document.getElementById("terms");

// Honeypot invisible
const honeypotInput = document.querySelector('input[name="website"]');

// Anti-robot maison : score basé sur mouvements souris, scroll et temps
let humanScore = 0;
let startTime = Date.now();

// Événements pour le score humain
document.addEventListener('mousemove', () => humanScore += 1);
document.addEventListener('scroll', () => humanScore += 1);
document.addEventListener('keydown', () => humanScore += 1);

/* ==============================
   UTILITAIRES
============================== */
// Vérifie que tous les champs requis sont remplis
function validateFields(fields) {
  for (let field of fields) {
    if (!field.value.trim()) return false;
  }
  return true;
}

// Vérifie le honeypot
function checkHoneypot() {
  return honeypotInput && honeypotInput.value !== '';
}

// Vérifie le score humain minimum
function checkHumanScore(minScore = 5, minTimeMs = 800) {
  const elapsed = Date.now() - startTime;
  return humanScore >= minScore && elapsed >= minTimeMs;
}

/* ==============================
   CONNEXION
============================== */
loginBtn.addEventListener("click", async () => {
  const email = emailInput.value;
  const password = passwordInput.value;

  if (!validateFields([emailInput, passwordInput])) {
    alert("Veuillez remplir tous les champs.");
    return;
  }

  if (checkHoneypot()) {
    alert("Bot détecté !");
    return;
  }

  if (!checkHumanScore()) {
    alert("Action suspecte détectée. Veuillez réessayer lentement et normalement.");
    return;
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    alert(error.message);
    return;
  }

  window.location.href = "dashboard.html";
});

/* ==============================
   INSCRIPTION + PROFILE
============================== */
registerBtn.addEventListener("click", async () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  const username = usernameInput.value;

  if (!termsCheckbox.checked) {
    alert("Vous devez accepter les Conditions d'Utilisation et Mentions Légales.");
    return;
  }

  if (!validateFields([emailInput, passwordInput, usernameInput])) {
    alert("Veuillez remplir tous les champs.");
    return;
  }

  if (checkHoneypot()) {
    alert("Bot détecté !");
    return;
  }

  if (!checkHumanScore()) {
    alert("Action suspecte détectée. Veuillez réessayer lentement et normalement.");
    return;
  }


  try {
    // Création du compte Supabase
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      alert(error.message);
      return;
    }

    const userId = data.user.id;

    // Création du profil lié
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({ id: userId, username });

      
    if (profileError) {
      alert("Erreur création profil : " + profileError.message);
      return;
    }

    alert("Inscription réussie ! Redirection vers votre tableau de bord...");
    // update count briefly before redirect (best-effort)
    try { await loadUserCount(); } catch (e) { /* ignore */ }
    window.location.href = "dashboard.html";

  } catch (err) {
    console.error(err);
    alert("Une erreur est survenue, veuillez réessayer.");
  }
});

/* ==============================
   OPTION : RESET FORMULAIRE
============================== */
function resetForm() {
  emailInput.value = '';
  passwordInput.value = '';
  usernameInput.value = '';
  termsCheckbox.checked = false;
  if (honeypotInput) honeypotInput.value = '';
  humanScore = 0;
  startTime = Date.now();
}

/* ==============================
   USER COUNT (INDEX)
   Fetch total number of profiles and display on the auth page
============================== */
async function loadUserCount() {
  const el = document.getElementById('userCount');
  if (!el) return;

  try {
    const { count, error } = await supabase
      .from('public_profiles_count')  // <-- attention à bien pointer sur la view
      .select('created_at', { count: 'exact', head: true });

    if (error) throw error;

    el.textContent = `${count} membres inscrits`;
  } catch (err) {
    console.error('loadUserCount', err);
    el.textContent = 'Membres : —';
  }
}

// charger au load
loadUserCount();
