const STORAGE_KEY = "exit_exam_hq_v1";

const COURSES = [
  { id: "cp", name: "Computer Programming", credit: 3 },
  { id: "db", name: "Database Systems", credit: 6 },
  { id: "oop", name: "Object Oriented Programming", credit: 3 },
  { id: "coa", name: "Computer Organization and Architecture", credit: 3 },
  { id: "dcn", name: "Data Communication and Computer Networking", credit: 3 },
  { id: "dsa", name: "Data Structures and Algorithms", credit: 3 },
  { id: "web", name: "Web Programming", credit: 4 },
  { id: "os", name: "Operating System", credit: 3 },
  { id: "se", name: "Software Engineering", credit: 3 },
  { id: "daa", name: "Design and Analysis of Algorithms", credit: 3 },
  { id: "ai", name: "Introduction to Artificial Intelligence", credit: 3 },
  { id: "security", name: "Computer Security", credit: 3 },
  { id: "nsa", name: "Network and System Administration", credit: 3 },
  { id: "automata", name: "Automata and Complexity Theory", credit: 3 },
  { id: "compiler", name: "Compiler Design", credit: 3 },
];

const FREE_RESOURCES = {
  cp: [
    { title: "CS50 Introduction to Programming", url: "https://cs50.harvard.edu/x/" },
    { title: "freeCodeCamp C Programming", url: "https://www.youtube.com/watch?v=KJgsSFOSQv0" },
  ],
  db: [
    { title: "Stanford Databases (YouTube)", url: "https://www.youtube.com/playlist?list=PLroEs25KGvwzmvIxYHRhoGTz9w8LeXek0" },
    { title: "SQLBolt", url: "https://sqlbolt.com/" },
  ],
  oop: [
    { title: "OOP Concepts (freeCodeCamp)", url: "https://www.youtube.com/watch?v=SiBw7os-_zI" },
    { title: "Java OOP (W3Schools)", url: "https://www.w3schools.com/java/java_oop.asp" },
  ],
  coa: [
    { title: "Computer Architecture (Neso Academy)", url: "https://www.youtube.com/playlist?list=PLBlnK6fEyqRhX6r2uhhlubuF5QextdCSM" },
  ],
  dcn: [
    { title: "Computer Networking Full Course", url: "https://www.youtube.com/watch?v=qiQR5rTSshw" },
  ],
  dsa: [
    { title: "NeetCode Roadmap", url: "https://neetcode.io/roadmap" },
    { title: "Abdul Bari Algorithms", url: "https://www.youtube.com/@abdul_bari" },
  ],
  web: [
    { title: "The Odin Project", url: "https://www.theodinproject.com/" },
    { title: "MDN Web Docs", url: "https://developer.mozilla.org/" },
  ],
  os: [
    { title: "Operating Systems (NPTEL)", url: "https://www.youtube.com/playlist?list=PLsylUObW5M3CAGT6OdubyH6FztKfJCcFB" },
  ],
  se: [
    { title: "Software Engineering (Coursera audit)", url: "https://www.coursera.org/learn/software-processes" },
  ],
  daa: [
    { title: "MIT OpenCourseWare Algorithms", url: "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/" },
  ],
  ai: [
    { title: "Elements of AI", url: "https://www.elementsofai.com/" },
    { title: "Google ML Crash Course", url: "https://developers.google.com/machine-learning/crash-course" },
  ],
  security: [
    { title: "OWASP Top 10", url: "https://owasp.org/www-project-top-ten/" },
  ],
  nsa: [
    { title: "Linux Journey", url: "https://linuxjourney.com/" },
  ],
  automata: [
    { title: "Automata Theory Playlist", url: "https://www.youtube.com/playlist?list=PLBlnK6fEyqRjW4QYtVYB7P7n4N2B9dM5S" },
  ],
  compiler: [
    { title: "Compiler Design Tutorial", url: "https://www.geeksforgeeks.org/compiler-design-tutorials/" },
  ],
};

const defaultState = {
  settings: {
    weeklyTargetHours: 28,
    missedPenalty: 20,
    shortfallPenaltyPerHour: 5,
  },
  sessions: [],
  resources: [],
};

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    return {
      settings: { ...defaultState.settings, ...(parsed.settings || {}) },
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      resources: Array.isArray(parsed.resources) ? parsed.resources : [],
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatMoney(num) {
  return Number(num).toFixed(2);
}

function formatDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function getCourseById(id) {
  return COURSES.find((c) => c.id === id);
}

function calcSessionPenalty(session) {
  const planned = Number(session.plannedHours) || 0;
  const actual = Number(session.actualHours) || 0;
  const shortfall = Math.max(0, planned - actual);
  let penalty = 0;

  if (session.status === "missed") {
    penalty += Number(state.settings.missedPenalty) || 0;
  }

  penalty += shortfall * (Number(state.settings.shortfallPenaltyPerHour) || 0);
  return penalty;
}

function computeStats() {
  const totalSessions = state.sessions.length;
  const missedSessions = state.sessions.filter((s) => s.status === "missed").length;
  const completedSessions = totalSessions - missedSessions;
  const completionRate = totalSessions ? (completedSessions / totalSessions) * 100 : 0;

  let totalPenalty = 0;
  let youPenalty = 0;
  let girlfriendPenalty = 0;

  for (const session of state.sessions) {
    const p = calcSessionPenalty(session);
    totalPenalty += p;
    if (session.person === "You") youPenalty += p;
    if (session.person === "Girlfriend") girlfriendPenalty += p;
  }

  return {
    totalSessions,
    missedSessions,
    completionRate,
    totalPenalty,
    youPenalty,
    girlfriendPenalty,
  };
}

function courseHoursMap() {
  const map = {};
  for (const c of COURSES) {
    map[c.id] = { planned: 0, actual: 0 };
  }

  for (const s of state.sessions) {
    if (!map[s.courseId]) continue;
    map[s.courseId].planned += Number(s.plannedHours) || 0;
    map[s.courseId].actual += Number(s.actualHours) || 0;
  }

  return map;
}

function renderKpis() {
  const kpis = document.getElementById("kpis");
  const template = document.getElementById("kpiTemplate");
  kpis.innerHTML = "";
  kpis.appendChild(template.content.cloneNode(true));

  const stats = computeStats();
  kpis.querySelector('[data-kpi="totalSessions"]').textContent = stats.totalSessions;
  kpis.querySelector('[data-kpi="completionRate"]').textContent = `${stats.completionRate.toFixed(1)}%`;
  kpis.querySelector('[data-kpi="totalPenalty"]').textContent = formatMoney(stats.totalPenalty);
  kpis.querySelector('[data-kpi="missedSessions"]').textContent = stats.missedSessions;
  kpis.querySelector('[data-kpi="youPenalty"]').textContent = formatMoney(stats.youPenalty);
  kpis.querySelector('[data-kpi="girlfriendPenalty"]').textContent = formatMoney(stats.girlfriendPenalty);
}

function renderCourseSelects() {
  const sessionCourse = document.getElementById("sessionCourse");
  const resourceCourse = document.getElementById("resourceCourse");
  const resourceFilter = document.getElementById("resourceFilter");
  sessionCourse.innerHTML = "";
  resourceCourse.innerHTML = "";
  resourceFilter.innerHTML = "";

  const allOpt = document.createElement("option");
  allOpt.value = "all";
  allOpt.textContent = "All Courses";
  resourceFilter.appendChild(allOpt);

  for (const c of COURSES) {
    const opt1 = document.createElement("option");
    opt1.value = c.id;
    opt1.textContent = `${c.name} (${c.credit} cr)`;
    sessionCourse.appendChild(opt1);

    const opt2 = opt1.cloneNode(true);
    resourceCourse.appendChild(opt2);

    const opt3 = document.createElement("option");
    opt3.value = c.id;
    opt3.textContent = c.name;
    resourceFilter.appendChild(opt3);
  }
}

function renderWeeklyPlan() {
  const wrap = document.getElementById("weeklyPlan");
  wrap.innerHTML = "";

  const totalCredits = COURSES.reduce((sum, c) => sum + c.credit, 0);
  const weeklyTarget = Number(state.settings.weeklyTargetHours) || 0;

  for (const c of COURSES) {
    const recHours = (weeklyTarget * c.credit) / totalCredits;

    const card = document.createElement("article");
    card.className = "course-card";
    card.innerHTML = `
      <h3>${c.name}</h3>
      <span class="badge">${c.credit} credits</span>
      <div><strong>Recommended this week:</strong> ${recHours.toFixed(1)}h</div>
    `;
    wrap.appendChild(card);
  }
}

function renderCourseProgress() {
  const wrap = document.getElementById("courseProgress");
  wrap.innerHTML = "";
  const map = courseHoursMap();

  for (const c of COURSES) {
    const tracked = map[c.id] || { planned: 0, actual: 0 };
    const ratio = tracked.planned > 0 ? Math.min(100, (tracked.actual / tracked.planned) * 100) : 0;

    const card = document.createElement("article");
    card.className = "course-card";
    card.innerHTML = `
      <h3>${c.name}</h3>
      <span class="badge">${c.credit} credits</span>
      <div class="progress-track">
        <div class="progress-value" style="width: ${ratio.toFixed(1)}%;"></div>
      </div>
      <div><strong>${ratio.toFixed(1)}%</strong> completion vs planned</div>
      <div class="resource-meta">Planned: ${tracked.planned.toFixed(1)}h | Actual: ${tracked.actual.toFixed(1)}h</div>
    `;
    wrap.appendChild(card);
  }
}

function renderSessionTable() {
  const tbody = document.querySelector("#sessionTable tbody");
  tbody.innerHTML = "";

  const sorted = [...state.sessions].sort((a, b) => (a.date < b.date ? 1 : -1));

  for (const s of sorted) {
    const course = getCourseById(s.courseId);
    const penalty = calcSessionPenalty(s);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${formatDate(s.date)}</td>
      <td>${s.person}</td>
      <td>${course ? course.name : s.courseId}</td>
      <td>${Number(s.plannedHours).toFixed(1)}h</td>
      <td>${Number(s.actualHours).toFixed(1)}h</td>
      <td class="${s.status === "missed" ? "penalty" : "ok"}">${s.status}</td>
      <td class="${penalty > 0 ? "penalty" : "ok"}">${formatMoney(penalty)}</td>
      <td><button class="delete-btn" data-delete-id="${s.id}">Delete</button></td>
    `;
    tbody.appendChild(tr);
  }
}

function getAllResources() {
  const all = [];

  for (const c of COURSES) {
    (FREE_RESOURCES[c.id] || []).forEach((r) => {
      all.push({
        id: `free_${c.id}_${r.title}`,
        courseId: c.id,
        title: r.title,
        url: r.url,
        source: "free",
        fileName: "",
        fileType: "link",
      });
    });
  }

  for (const r of state.resources) {
    all.push({ ...r, source: "user" });
  }

  return all;
}

function renderResources() {
  const wrap = document.getElementById("resourceList");
  const searchInput = document.getElementById("resourceSearch");
  const filterSelect = document.getElementById("resourceFilter");
  const countBadge = document.getElementById("resourceCountBadge");

  wrap.innerHTML = "";
  const all = getAllResources();
  const q = (searchInput.value || "").trim().toLowerCase();
  const selectedCourse = filterSelect.value || "all";

  const filtered = all.filter((item) => {
    const course = getCourseById(item.courseId);
    const courseName = course ? course.name.toLowerCase() : "";
    const typeText = (item.fileType || "").toLowerCase();
    const titleText = (item.title || "").toLowerCase();

    const passCourse = selectedCourse === "all" ? true : item.courseId === selectedCourse;
    const passQuery = q
      ? titleText.includes(q) || courseName.includes(q) || typeText.includes(q)
      : true;

    return passCourse && passQuery;
  });

  countBadge.textContent = `${filtered.length} resources`;

  if (!filtered.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No resources matched your filter. Try another keyword or course.";
    wrap.appendChild(empty);
    return;
  }

  for (const item of filtered) {
    const course = getCourseById(item.courseId);
    const courseName = course ? course.name : item.courseId;
    const sourceTag = item.source === "free" ? "Free" : "Custom";
    const typeTag = item.fileName
      ? "PPT/PDF"
      : item.url
      ? "Web"
      : "Local";
    const meta = item.fileName
      ? `${item.fileName} | ${item.fileType || "unknown"}`
      : item.source === "free"
      ? "Curated free resource"
      : "User added link";

    const card = document.createElement("article");
    card.className = "resource-card";

    card.innerHTML = `
      <div class="resource-cover">
        <span>${courseName}</span>
        <div class="resource-tags">
          <span class="resource-tag">${sourceTag}</span>
          <span class="resource-tag">${typeTag}</span>
        </div>
      </div>
      <div class="resource-content">
        <h3>${item.title}</h3>
        <p class="resource-meta">${meta}</p>
        <div class="resource-actions"></div>
      </div>
    `;

    const actions = card.querySelector(".resource-actions");

    if (item.url) {
      const link = document.createElement("a");
      link.className = "resource-link";
      link.href = item.url;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = "Open Resource";
      actions.appendChild(link);
    } else {
      const note = document.createElement("span");
      note.className = "resource-meta";
      note.textContent = "Local file metadata saved";
      actions.appendChild(note);
    }

    if (item.source === "user") {
      const del = document.createElement("button");
      del.type = "button";
      del.className = "ghost-btn";
      del.dataset.resourceDeleteId = item.id;
      del.textContent = "Remove";
      actions.appendChild(del);
    }

    wrap.appendChild(card);
  }
}

function refreshAll() {
  renderKpis();
  renderWeeklyPlan();
  renderCourseProgress();
  renderSessionTable();
  renderResources();
}

function bindForms() {
  const settingsForm = document.getElementById("settingsForm");
  const sessionForm = document.getElementById("sessionForm");
  const resourceForm = document.getElementById("resourceForm");
  const resourceSearch = document.getElementById("resourceSearch");
  const resourceFilter = document.getElementById("resourceFilter");

  document.getElementById("weeklyTargetHours").value = state.settings.weeklyTargetHours;
  document.getElementById("missedPenalty").value = state.settings.missedPenalty;
  document.getElementById("shortfallPenaltyPerHour").value = state.settings.shortfallPenaltyPerHour;

  settingsForm.addEventListener("submit", (e) => {
    e.preventDefault();

    state.settings.weeklyTargetHours = Number(document.getElementById("weeklyTargetHours").value) || 1;
    state.settings.missedPenalty = Number(document.getElementById("missedPenalty").value) || 0;
    state.settings.shortfallPenaltyPerHour = Number(document.getElementById("shortfallPenaltyPerHour").value) || 0;

    saveState();
    refreshAll();
  });

  const today = new Date().toISOString().split("T")[0];
  document.getElementById("sessionDate").value = today;

  sessionForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const date = document.getElementById("sessionDate").value;
    const person = document.getElementById("sessionPerson").value;
    const courseId = document.getElementById("sessionCourse").value;
    const plannedHours = Number(document.getElementById("plannedHours").value);
    let actualHours = Number(document.getElementById("actualHours").value);
    const status = document.getElementById("sessionStatus").value;

    if (!date || !courseId || plannedHours <= 0 || actualHours < 0) {
      return;
    }

    if (status === "missed") {
      actualHours = 0;
      document.getElementById("actualHours").value = "0";
    }

    state.sessions.push({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      date,
      person,
      courseId,
      plannedHours,
      actualHours,
      status,
    });

    saveState();
    refreshAll();

    sessionForm.reset();
    document.getElementById("sessionDate").value = today;
    document.getElementById("sessionStatus").value = "completed";
  });

  resourceForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const courseId = document.getElementById("resourceCourse").value;
    const title = document.getElementById("resourceTitle").value.trim();
    const url = document.getElementById("resourceUrl").value.trim();
    const fileInput = document.getElementById("resourceFile");
    const selectedFile = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;

    if (!courseId || !title) return;
    if (!url && !selectedFile) return;

    const entry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      courseId,
      title,
      url: url || "",
      fileName: selectedFile ? selectedFile.name : "",
      fileType: selectedFile ? selectedFile.type : "",
      fileSize: selectedFile ? selectedFile.size : 0,
    };

    state.resources.push(entry);
    saveState();
    renderResources();

    resourceForm.reset();
    resourceFilter.value = "all";
    renderResources();
  });

  document.querySelector("#sessionTable tbody").addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;

    const id = target.dataset.deleteId;
    if (!id) return;

    state.sessions = state.sessions.filter((s) => s.id !== id);
    saveState();
    refreshAll();
  });

  document.getElementById("sessionStatus").addEventListener("change", (e) => {
    const select = e.target;
    if (!(select instanceof HTMLSelectElement)) return;

    if (select.value === "missed") {
      document.getElementById("actualHours").value = "0";
    }
  });

  resourceSearch.addEventListener("input", () => {
    renderResources();
  });

  resourceFilter.addEventListener("change", () => {
    renderResources();
  });

  document.getElementById("resourceList").addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;

    const id = target.dataset.resourceDeleteId;
    if (!id) return;

    state.resources = state.resources.filter((r) => r.id !== id);
    saveState();
    renderResources();
  });
}

function boot() {
  renderCourseSelects();
  bindForms();
  refreshAll();

  document.getElementById("todayLabel").textContent = `Today: ${new Date().toLocaleDateString()}`;
}

boot();
