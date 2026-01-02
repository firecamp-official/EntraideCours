  import { supabase } from "./supabase.js";
  import { requireUser } from "./uxGuard.js";

  // ⚡ Vérifie session + profil
  const { user, profile } = await requireUser();
  // ⚡ Bulle profil
  const profileBubble = document.getElementById("profileBubble");
  const profileLetter = document.getElementById("profileLetter");
  profileLetter.textContent = profile.username?.charAt(0).toUpperCase() ?? "?";

  // ⚡ Création dropdown dynamique
  const dropdown = document.createElement("div");
  dropdown.classList.add("profile-dropdown");
  dropdown.innerHTML = `
    <div class="dropdown-header">
      <div class="avatar">${(profile.username?.charAt(0) ?? "?").toUpperCase()}</div>
      <div class="user-info">
        <div class="username">${profile.username ?? "Utilisateur"}</div>
        <div class="email">${user.email ?? "—"}</div>
        <div id="finishedCount" class="finished-counter">0 cours terminés</div>
      </div>
    </div>

    <div class="dropdown-body">
      <label class="field">Nom de profil : <input id="usernameInput" type="text" value="${profile.username}"></label>
      <div class="actions">
        <button id="renameBtn" class="primary">Renommer</button>
        <button id="logoutBtn" class="secondary">Se déconnecter</button>
        <button id="deleteBtn" class="danger">Supprimer le compte</button>
      </div>
    </div>
  `;
  profileBubble.parentNode.appendChild(dropdown);

  // ⚡ Toggle dropdown
  // ⚡ Toggle dropdown avec clic + fermeture si clic ailleurs
  profileBubble.addEventListener("click", (e) => {
    e.stopPropagation(); // empêche la fermeture immédiate
    dropdown.classList.toggle("active");
  });

  // ⚡ Fermer dropdown si clic en dehors
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target) && !profileBubble.contains(e.target)) {
      dropdown.classList.remove("active");
    }
  });

  // ⚡ Fermer dropdown avec touche ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") dropdown.classList.remove("active");
  });


  // ⚡ Elements du dropdown
  const usernameInput = dropdown.querySelector("#usernameInput");
  const renameBtn = dropdown.querySelector("#renameBtn");
  const logoutBtn = dropdown.querySelector("#logoutBtn");
  const deleteBtn = dropdown.querySelector("#deleteBtn");

  /* ==========================
    Renommer le profil
  ========================== */
  renameBtn.onclick = async () => {
    const newName = usernameInput.value.trim();
    if (!newName) return alert("Nom invalide");

    const { error } = await supabase
      .from("profiles")
      .update({ username: newName })
      .eq("id", user.id);

    if (error) alert(error.message);
    else {
      alert("Nom mis à jour !");
      profileLetter.textContent = newName.charAt(0).toUpperCase();
    }
  };

  /* ==========================
    Déconnexion
  ========================== */
  logoutBtn.onclick = async () => {
    await supabase.auth.signOut();
    window.location.href = "index.html";
  };

  /* ==========================
    Suppression soft delete RGPD
  ========================== */
  deleteBtn.onclick = async () => {
    if (!confirm("Supprimer définitivement ton compte ?")) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        username: `deleted_${crypto.randomUUID().slice(0, 8)}`,
        deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq("id", user.id);

    if (error) {
      console.error(error);
      alert("Impossible de supprimer le compte : " + error.message);
      return;
    }

    await supabase.auth.signOut();
    alert("Ton compte a été supprimé.");
    window.location.href = "index.html";
  };

  /* ==========================
    DASHBOARD CLASS & SUBJECT FILTERS
  ========================== */
  const classFilter = document.getElementById("classFilter");
  const subjectFilter = document.getElementById("subjectFilter");
  const courseList = document.getElementById("courseList");
  const latestContainer = document.getElementById("latestCourses");

  // Loader helpers
  function showLoader() {
    const loader = document.getElementById("loader");
    if (loader) loader.style.display = "flex";
  }

  function hideLoader() {
    const loader = document.getElementById("loader");
    if (loader) loader.style.display = "none";
  }

  // Finished courses counter (100% complete)
  function updateFinishedCount() {
    const el = document.getElementById("finishedCount");
    if (!el) return;
    const state = JSON.parse(localStorage.getItem("learning_progress")) || { courses: {} };
    const count = Object.values(state.courses).filter(c => Number(c.percent) === 100).length;
    el.textContent = `${count} cours terminés`;
  }

  // Update on storage events (other tabs) — also safe to call anytime
  window.addEventListener("storage", (e) => {
    if (e.key === "learning_progress") updateFinishedCount();
  });

  /* ==========================
    LOAD FILTERS
  ========================== */
  async function loadFilters() {
    const { data: classes } = await supabase.from("classes").select("*");
    classFilter.innerHTML = `<option value="">Toutes les classes</option>`;
    classes?.forEach(c => {
      classFilter.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });

    const { data: subjects } = await supabase.from("subjects").select("*");
    subjectFilter.innerHTML = `<option value="">Toutes les matières</option>`;
    subjects?.forEach(s => {
      subjectFilter.innerHTML += `<option value="${s.id}">${s.name}</option>`;
    });
  }

  /* ==========================
    LOAD COURSES
  ========================== */
  async function loadCourses() {
    if (!courseList) return;

    showLoader(); // Affiche le loader
    try {
      const state = JSON.parse(localStorage.getItem("learning_progress")) || { courses: {} };

      let query = supabase
      .from("courses")
      .select(`
        id,
        title,
        class_id,
        subject_id,
        classes(name),
        subjects(name),
        last_editor(username),
        course_sections!left(
          edited_by(username),
          created_at
        )
      `)
      .eq("validated", true);

    if (classFilter.value) query = query.eq("class_id", classFilter.value);
    if (subjectFilter.value) query = query.eq("subject_id", subjectFilter.value);

    const { data: courses, error } = await query;
      if (error) throw error;

      courseList.innerHTML = courses.map(c => {
      const editorName = c.last_editor?.username
        ?? c.course_sections?.[0]?.edited_by?.username
        ?? "—";
      const courseIdStr = String(c.id);
      const percent = state.courses[courseIdStr]?.percent ?? 0;
      const progressLabel = percent >= 90 ? "✓ Terminé" : percent + "%";

      return `
        <div class="card course-card" onclick="location.href='course.html?id=${c.id}'">
          <h3>${c.title}</h3>
          <small>${c.classes?.name ?? "—"} – ${c.subjects?.name ?? "—"}</small>
          <p class="editor">Dernière édition par : ${editorName}</p>
          <div class="course-progress">
            <div class="track">
              <div class="fill" style="width:${percent}%"></div>
            </div>
            <small class="label">${progressLabel}</small>
          </div>
        </div>
      `;
    }).join("");

    } catch (err) {
      console.error(err);
    } finally {
      hideLoader(); // Cache le loader une fois chargé
    }
  }

  /* ==========================
    LOAD LATEST COURSES
  ========================== */
  async function loadLatestCourses() {
    if (!latestContainer) return;

    showLoader(); // Affiche le loader
    try {
      const state = JSON.parse(localStorage.getItem("learning_progress")) || { courses: {} };

      const { data, error } = await supabase
      .from("courses")
      .select(`
        id,
        title,
        created_at,
        classes(name),
        subjects(name),
        last_editor(username),
        course_sections!left(
          edited_by(username),
          created_at
        )
      `)
      .eq("validated", true)
      .order("created_at", { ascending: false })
      .limit(6);

      if (error) throw error;

      latestContainer.innerHTML = data.map(course => {
      const editorName = course.last_editor?.username
        ?? course.course_sections?.[0]?.edited_by?.username
        ?? "—";
      const courseIdStr = String(course.id);
      const percent = state.courses[courseIdStr]?.percent ?? 0;
      const progressLabel = percent >= 90 ? "✓ Terminé" : percent + "%";

      return `
        <div class="latest-card" onclick="location.href='course.html?id=${course.id}'">
          <span class="badge subject">${course.subjects?.name ?? "—"}</span>
          <span class="badge class">${course.classes?.name ?? "—"}</span>
          <h3>${course.title}</h3>
          <p class="editor">Dernière édition par : ${editorName}</p>
          <div class="course-progress">
            <div class="track">
              <div class="fill" style="width:${percent}%"></div>
            </div>
            <small class="label">${progressLabel}</small>
          </div>
        </div>
      `;
    }).join("");

    } catch (err) {
      console.error(err);
    } finally {
      hideLoader(); // Cache le loader une fois chargé
    }
  }


  /* ==========================
    INIT
  ========================== */
  await loadFilters();
  await loadCourses();
  await loadLatestCourses();

  // Refresh finished counter after initial load
  updateFinishedCount();

  classFilter.onchange = loadCourses;
  subjectFilter.onchange = loadCourses; 

