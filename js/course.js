import { supabase } from "./supabase.js";

/* ==========================
   ELEMENTS
========================== */
const classFilter = document.getElementById("classFilter");
const subjectFilter = document.getElementById("subjectFilter");
const courseDiv = document.getElementById("course");

/* NOTE: the loader markup is present in course.html; no dynamic creation here. */

/* ==========================
   LOAD FILTERS
========================== */
const { data: classes } = await supabase.from("classes").select("*");
classFilter.innerHTML = `<option value="">Toutes les classes</option>`;
classes.forEach(c => classFilter.innerHTML += `<option value="${c.id}">${c.name}</option>`);

const { data: subjects } = await supabase.from("subjects").select("*");
subjectFilter.innerHTML = `<option value="">Toutes les matières</option>`;
subjects.forEach(s => subjectFilter.innerHTML += `<option value="${s.id}">${s.name}</option>`);

/* ==========================
   LOAD COURSE
========================== */
async function loadCourse() {

  const id = new URLSearchParams(location.search).get("id");
  const courseDiv = document.getElementById("course");
  const loader = document.getElementById("loader");

  if (!id) {
    loader.style.display = "none";
    courseDiv.innerHTML = "<p>Cours introuvable.</p>";
    return;
  }
  await new Promise(res => setTimeout(res, 500));
  try {
    // Récupérer le cours
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("title")
      .eq("id", id)
      .single();

    if (courseError || !course) throw courseError;

    // Récupérer les sections
    const { data: sections, error: sectionError } = await supabase
      .from("course_sections")
      .select("*")
      .eq("course_id", id)
      .order("position", { ascending: true });

    if (sectionError) throw sectionError;

    // Affichage du cours into #courseContent so chronometer/loader remain
    const contentEl = document.getElementById('courseContent');
    if (contentEl) {
      contentEl.innerHTML = `
        <h1>${course.title}</h1>
        ${sections.map(s => `
          <section>
            <h3>${s.title}</h3>
            <p>${s.content}</p>
            ${s.image_url ? `<img src="${s.image_url}" alt="">` : ""}
          </section>
        `).join("")}
      `;
    }

    // start chronometer automatically when course is rendered
    const chronoStartBtn = document.getElementById('chronoStart');
    if (chronoStartBtn) chronoStartBtn.click();
  } catch (err) {
    console.error(err);
    courseDiv.innerHTML = "";
  } finally {
    // Cacher le loader
    if (loader) loader.style.display = "none";
  }
}

// Exécuter la fonction
loadCourse();


/* ==========================
   EXECUTE
========================== */
loadCourse();





/* ==========================
   PROGRESSION DE LECTURE
========================== */

const courseId = new URLSearchParams(location.search).get("id");
const progressBar = document.querySelector("#readingProgress .bar");
const progressLabel = document.querySelector("#readingProgress .label");

// Charger l'état global
const state = JSON.parse(localStorage.getItem("learning_progress")) || { courses: {} };

// Restauration si existant
if (state.courses[courseId]) {
  progressBar.style.width = state.courses[courseId].percent + "%";
  progressLabel.textContent = state.courses[courseId].percent + "%";
}
function updateReadingProgress() {
  const scrollTop = window.scrollY;
  const docHeight = document.body.scrollHeight - window.innerHeight;

  if (docHeight <= 0) return;

  const currentPercent = Math.min(
    100,
    Math.round((scrollTop / docHeight) * 100)
  );

  // progression déjà enregistrée
  const savedPercent = state.courses[courseId]?.percent || 0;

  // on garde le MAXIMUM
  const finalPercent = Math.max(currentPercent, savedPercent);

  progressBar.style.width = finalPercent + "%";
  progressLabel.textContent = finalPercent + "%";

  state.courses[courseId] = {
    percent: finalPercent,
    completed: finalPercent >= 90
  };

  localStorage.setItem("learning_progress", JSON.stringify(state));
  if (finalPercent >= 90) {
    progressLabel.textContent = "✓ Terminé";
  }

}


window.addEventListener("scroll", updateReadingProgress);

/* ==========================
   CHRONOMETER / STOPWATCH
========================== */
const chronoDisplay = document.getElementById('chronoDisplay');
const chronoStartBtn = document.getElementById('chronoStart');
const chronoPauseBtn = document.getElementById('chronoPause');
const chronoResetBtn = document.getElementById('chronoReset');

let chronoSeconds = 0;
let chronoInterval = null;

function formatHMS(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function updateChrono() {
  if (chronoDisplay) chronoDisplay.textContent = formatHMS(chronoSeconds);
}

function startChrono() {
  if (chronoInterval) return;
  chronoInterval = setInterval(() => { chronoSeconds++; updateChrono(); }, 1000);
}

function pauseChrono() {
  if (chronoInterval) { clearInterval(chronoInterval); chronoInterval = null; }
}

function resetChrono() {
  pauseChrono(); chronoSeconds = 0; updateChrono();
}

if (chronoStartBtn) chronoStartBtn.addEventListener('click', startChrono);
if (chronoPauseBtn) chronoPauseBtn.addEventListener('click', pauseChrono);
if (chronoResetBtn) chronoResetBtn.addEventListener('click', resetChrono);

// ensure initial display
updateChrono();


        const backToTopButton = document.getElementById('backToTop');

        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                backToTopButton.classList.add('show');
            } else {
                backToTopButton.classList.remove('show');
            }
        });

        backToTopButton.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });