import { supabase } from "./supabase.js";
import { requireAdmin } from "./adminGuard.js";

const {user, profile} = await requireAdmin();

const courseForm = document.getElementById("courseForm");
const sectionsContainer = document.getElementById("sections");
const classSelect = document.getElementById("classSelect");
const subjectSelect = document.getElementById("subjectSelect");
const addSectionBtn = document.getElementById("addSection");

const courseList = document.getElementById("courseList");
const searchInput = document.getElementById("searchCourse");
const filterClass = document.getElementById("filterClass");
const filterSubject = document.getElementById("filterSubject");

let editingCourseId = null;

/* ==========================
   LOAD CLASSES & SUBJECTS
========================== */
async function loadClassesSubjects() {
  const { data: classes, error: cError } = await supabase.from("classes").select("*");
  if (cError) return console.error(cError);

  classSelect.innerHTML = '';
  filterClass.innerHTML = '<option value="">Toutes les classes</option>';
  classes.forEach(c => {
    classSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    filterClass.innerHTML += `<option value="${c.id}">${c.name}</option>`;
  });

  const { data: subjects, error: sError } = await supabase.from("subjects").select("*");
  if (sError) return console.error(sError);

  subjectSelect.innerHTML = '';
  filterSubject.innerHTML = '<option value="">Toutes les matières</option>';
  subjects.forEach(s => {
    subjectSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
    filterSubject.innerHTML += `<option value="${s.id}">${s.name}</option>`;
  });
}

/* ==========================
   LOAD COURSES (ADMIN LIST)
========================== */
async function loadCourses() {
  if (!courseList) return;

  let query = supabase
    .from("courses")
    .select("*, course_sections(*, edited_by(username)), last_editor(username)")
    .order("created_at", { ascending: false });

  const search = searchInput.value.trim();
  if (search) query = query.ilike("title", `%${search}%`);
  if (filterClass.value) query = query.eq("class_id", filterClass.value);
  if (filterSubject.value) query = query.eq("subject_id", filterSubject.value);

  const { data: courses, error } = await query;
  if (error) return console.error(error);

  courseList.innerHTML = courses.map(c => {
    const editorName = c.last_editor?.username
      ?? c.course_sections?.slice(-1)[0]?.edited_by?.username
      ?? "—";

    return `
      <div class="courseCard" data-id="${c.id}">
        <h3>${c.title}</h3>
        <p>Classe: ${c.class_id} | Matière: ${c.subject_id}</p>
        <p>Dernier éditeur: ${editorName}</p>
        <button class="editCourse">Éditer</button>
        <button class="deleteCourse">Supprimer</button>
      </div>
    `;
  }).join("");

  document.querySelectorAll(".editCourse").forEach(btn => {
    btn.onclick = () => editCourse(btn.closest(".courseCard").dataset.id);
  });
  document.querySelectorAll(".deleteCourse").forEach(btn => {
    btn.onclick = () => deleteCourse(btn.closest(".courseCard").dataset.id);
  });
}

/* ==========================
   ADD SECTION
========================== */
addSectionBtn.onclick = () => {
  const div = document.createElement("div");
  div.className = "section card";
  div.innerHTML = `
    <input placeholder="Titre section" required>
    <textarea placeholder="Contenu" required></textarea>
    <input placeholder="Image URL (optionnel)">
  `;
  sectionsContainer.appendChild(div);
};

/* ==========================
   SUBMIT COURSE (CREATE or UPDATE)
========================== */
courseForm.onsubmit = async e => {
  e.preventDefault();
  const { data: authData, error: userError } = await supabase.auth.getUser();
  if (userError) return alert("Impossible de récupérer l'utilisateur");
  const userId = authData.user.id;

  const courseData = {
    title: courseForm.title.value,
    class_id: classSelect.value,
    subject_id: subjectSelect.value,
    last_editor: userId,
    validated: true // OBLIGATOIRE
  };


  if (editingCourseId) {
    // --- UPDATE COURSE ---
    const { error: cError } = await supabase
      .from("courses")
      .update(courseData)
      .eq("id", editingCourseId);
    if (cError) return alert("Erreur update course");

    for (let s of sectionsContainer.querySelectorAll(".section")) {
      const sectionId = s.dataset.id;
      if (sectionId) {
        await supabase.from("course_sections").update({
          title: s.querySelector("input").value,
          content: s.querySelector("textarea").value,
          image_url: s.querySelectorAll("input")[1]?.value || null,
          edited_by: userId
        }).eq("id", sectionId);
      } else {
        await supabase.from("course_sections").insert({
          course_id: editingCourseId,
          title: s.querySelector("input").value,
          content: s.querySelector("textarea").value,
          image_url: s.querySelectorAll("input")[1]?.value || null,
          edited_by: userId
        });
      }
    }

    alert("Cours mis à jour ✅");
  } else {
    // --- CREATE COURSE ---
    const { data: newCourse, error: cError } = await supabase
      .from("courses")
      .insert(courseData)
      .select()
      .single();
    if (cError) return alert("Erreur création course");

    for (let s of sectionsContainer.querySelectorAll(".section")) {
      await supabase.from("course_sections").insert({
        course_id: newCourse.id,
        title: s.querySelector("input").value,
        content: s.querySelector("textarea").value,
        image_url: s.querySelectorAll("input")[1]?.value || null,
        edited_by: userId
      });
    }

    alert("Cours créé ✅");
  }

  editingCourseId = null;
  courseForm.reset();
  sectionsContainer.innerHTML = "";
  loadCourses();
};

/* ==========================
   EDIT COURSE
========================== */
async function editCourse(id) {
  const { data: course, error } = await supabase
    .from("courses")
    .select("*, course_sections(*, edited_by(username)), last_editor(username)")
    .eq("id", id)
    .single();
  if (error || !course) return alert("Cours introuvable");

  editingCourseId = id;
  courseForm.title.value = course.title;
  classSelect.value = course.class_id;
  subjectSelect.value = course.subject_id;

  const lastEditorInput = document.getElementById("lastEditor");
  if (lastEditorInput) {
    lastEditorInput.value = course.last_editor?.username
      ?? course.course_sections?.slice(-1)[0]?.edited_by?.username
      ?? "—";
  }

  sectionsContainer.innerHTML = "";
  course.course_sections.forEach(s => {
    const div = document.createElement("div");
    div.className = "section card";
    div.dataset.id = s.id;
    div.innerHTML = `
      <input value="${s.title}" required>
      <textarea required>${s.content}</textarea>
      <input value="${s.image_url || ''}">
      <small>Dernier éditeur : ${s.edited_by?.username ?? "—"}</small>
    `;
    sectionsContainer.appendChild(div);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ==========================
   DELETE COURSE
========================== */
async function deleteCourse(id) {
  if (!confirm("Supprimer ce cours ?")) return;
  await supabase.from("courses").delete().eq("id", id);
  loadCourses();
}

/* ==========================
   INIT
========================== */
await loadClassesSubjects();
await loadCourses();
searchInput.oninput = loadCourses;
filterClass.onchange = loadCourses;
filterSubject.onchange = loadCourses;

/* ==========================
   LOAD LATEST COURSES (FRONT USER)
========================== */
export async function loadLatestCourses() {
  const latestContainer = document.getElementById("latestCourses");
  if (!latestContainer) return;

  const { data, error } = await supabase
    .from("courses")
    .select("id, title, created_at, classes(name), subjects(name), last_editor(username), course_sections(id, edited_by(username))")
    .eq("validated", true)
    .order("created_at", { ascending: false })
    .limit(6);

  if (error) return console.error(error);

  latestContainer.innerHTML = data.map(c => {
    const editorName = c.last_editor?.username ?? c.course_sections?.slice(-1)[0]?.edited_by?.username ?? "—";
    return `
      <div class="latest-card" onclick="location.href='course.html?id=${c.id}'">
        <span class="badge subject">${c.subjects?.name ?? "—"}</span>
        <span class="badge class">${c.classes?.name ?? "—"}</span>
        <h3>${c.title}</h3>
        <p class="editor">Dernière édition par : ${editorName}</p>
      </div>
    `;
  }).join("");
}
