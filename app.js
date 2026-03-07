const STORAGE_KEY = "exit_exam_hq_v3";
const THEME_KEY = "exit_exam_theme";
const PEOPLE = ["You", "Girlfriend"];

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
  coa: [{ title: "Computer Architecture (Neso Academy)", url: "https://www.youtube.com/playlist?list=PLBlnK6fEyqRhX6r2uhhlubuF5QextdCSM" }],
  dcn: [{ title: "Computer Networking Full Course", url: "https://www.youtube.com/watch?v=qiQR5rTSshw" }],
  dsa: [
    { title: "NeetCode Roadmap", url: "https://neetcode.io/roadmap" },
    { title: "Abdul Bari Algorithms", url: "https://www.youtube.com/@abdul_bari" },
  ],
  web: [
    { title: "The Odin Project", url: "https://www.theodinproject.com/" },
    { title: "MDN Web Docs", url: "https://developer.mozilla.org/" },
  ],
  os: [{ title: "Operating Systems (NPTEL)", url: "https://www.youtube.com/playlist?list=PLsylUObW5M3CAGT6OdubyH6FztKfJCcFB" }],
  se: [{ title: "Software Engineering (Coursera audit)", url: "https://www.coursera.org/learn/software-processes" }],
  daa: [{ title: "MIT OpenCourseWare Algorithms", url: "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/" }],
  ai: [
    { title: "Elements of AI", url: "https://www.elementsofai.com/" },
    { title: "Google ML Crash Course", url: "https://developers.google.com/machine-learning/crash-course" },
  ],
  security: [{ title: "OWASP Top 10", url: "https://owasp.org/www-project-top-ten/" }],
  nsa: [{ title: "Linux Journey", url: "https://linuxjourney.com/" }],
  automata: [{ title: "Automata Theory Playlist", url: "https://www.youtube.com/playlist?list=PLBlnK6fEyqRjW4QYtVYB7P7n4N2B9dM5S" }],
  compiler: [{ title: "Compiler Design Tutorial", url: "https://www.geeksforgeeks.org/compiler-design-tutorials/" }],
};

const defaultState = {
  settings: {
    weeklyTargetHours: 28,
    missedPenalty: 20,
    shortfallPenaltyPerHour: 5,
  },
  sessions: [],
  resources: [],
  resourceFlags: {},
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
      resourceFlags: typeof parsed.resourceFlags === "object" && parsed.resourceFlags ? parsed.resourceFlags : {},
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

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const systemPrefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(saved || (systemPrefersDark ? "dark" : "light"));

  const toggle = document.getElementById("themeToggle");
  if (!toggle) return;

  toggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    applyTheme(current === "dark" ? "light" : "dark");
  });
}

function resourceKey(item) {
  return item.source === "free" ? `free:${item.courseId}:${item.title}` : `user:${item.id}`;
}

function getFlags(key) {
  return state.resourceFlags[key] || { favorite: false, completed: false, lastOpenedAt: 0 };
}

function setFlags(key, patch) {
  const current = getFlags(key);
  state.resourceFlags[key] = { ...current, ...patch };
  saveState();
}

function courseCoverStyle(courseId) {
  const map = {
    cp: "linear-gradient(135deg, #3564a8, #1f8b96)",
    db: "linear-gradient(135deg, #7d4ea2, #aa6471)",
    oop: "linear-gradient(135deg, #106f70, #3ca47b)",
    coa: "linear-gradient(135deg, #a15d2b, #c68e4f)",
    dcn: "linear-gradient(135deg, #28548f, #3f86c8)",
    dsa: "linear-gradient(135deg, #285f76, #3e8d8f)",
    web: "linear-gradient(135deg, #04685b, #27aa86)",
    os: "linear-gradient(135deg, #5f5f8f, #7d69bf)",
    se: "linear-gradient(135deg, #8f3e68, #cf6790)",
    daa: "linear-gradient(135deg, #2e566d, #3ca3aa)",
    ai: "linear-gradient(135deg, #73428f, #9a65cf)",
    security: "linear-gradient(135deg, #5d2f55, #ad4f79)",
    nsa: "linear-gradient(135deg, #5b5a27, #96903f)",
    automata: "linear-gradient(135deg, #64438c, #915cb3)",
    compiler: "linear-gradient(135deg, #9f4b35, #d37b4f)",
  };
  return map[courseId] || "linear-gradient(135deg, #2e6370, #4fa0a9)";
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

  return { totalSessions, missedSessions, completionRate, totalPenalty, youPenalty, girlfriendPenalty };
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

function weekKey(dateValue) {
  const d = new Date(dateValue);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getCompletedWeeks(person) {
  const set = new Set();
  state.sessions.forEach((s) => {
    if (s.person === person && s.status === "completed") {
      set.add(weekKey(s.date));
    }
  });
  return set;
}

function calcWeeklyStreak(person) {
  const completedWeeks = getCompletedWeeks(person);
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  const todayDay = (cursor.getDay() + 6) % 7;
  cursor.setDate(cursor.getDate() - todayDay);

  while (true) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    if (completedWeeks.has(key)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 7);
    } else {
      break;
    }
  }
  return streak;
}

function calcPoints(person) {
  let points = 0;

  for (const s of state.sessions.filter((item) => item.person === person)) {
    const planned = Number(s.plannedHours) || 0;
    const actual = Number(s.actualHours) || 0;

    if (s.status === "completed") {
      points += 20;
      points += Math.round(actual * 2);
      if (actual >= planned) points += 5;
    } else {
      points -= 10;
    }

    points -= Math.round(Math.max(0, planned - actual));
  }

  points += calcWeeklyStreak(person) * 8;
  return Math.max(0, points);
}

function leaderboard() {
  return PEOPLE.map((person) => ({
    person,
    points: calcPoints(person),
    streak: calcWeeklyStreak(person),
  })).sort((a, b) => b.points - a.points);
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
        fileType: "web",
      });
    });
  }

  state.resources.forEach((r) => all.push({ ...r, source: "user" }));

  return all.map((item) => ({ ...item, key: resourceKey(item), flags: getFlags(resourceKey(item)) }));
}

function renderTodayLabel() {
  const todayLabel = document.getElementById("todayLabel");
  if (todayLabel) {
    todayLabel.textContent = `Today: ${new Date().toLocaleDateString()}`;
  }
}

function renderKpis() {
  const kpis = document.getElementById("kpis");
  const template = document.getElementById("kpiTemplate");
  if (!kpis || !template) return;

  kpis.innerHTML = "";
  kpis.appendChild(template.content.cloneNode(true));

  const stats = computeStats();
  kpis.querySelector('[data-kpi="totalSessions"]').textContent = String(stats.totalSessions);
  kpis.querySelector('[data-kpi="completionRate"]').textContent = `${stats.completionRate.toFixed(1)}%`;
  kpis.querySelector('[data-kpi="totalPenalty"]').textContent = formatMoney(stats.totalPenalty);
  kpis.querySelector('[data-kpi="missedSessions"]').textContent = String(stats.missedSessions);
  kpis.querySelector('[data-kpi="youPenalty"]').textContent = formatMoney(stats.youPenalty);
  kpis.querySelector('[data-kpi="girlfriendPenalty"]').textContent = formatMoney(stats.girlfriendPenalty);
}

function renderFocusPanel() {
  const panel = document.getElementById("focusPanel");
  if (!panel) return;

  const totalCredits = COURSES.reduce((sum, c) => sum + c.credit, 0);
  const weeklyTarget = Number(state.settings.weeklyTargetHours) || 0;
  const topCourses = [...COURSES]
    .sort((a, b) => b.credit - a.credit)
    .slice(0, 3)
    .map((c) => `${c.name}: ${((weeklyTarget * c.credit) / totalCredits).toFixed(1)}h`);

  const stats = computeStats();

  panel.innerHTML = `
    <div class="section-head">
      <h2>Home Focus</h2>
      <p>Short view of what to do next.</p>
    </div>
    <div class="focus-grid">
      <article class="focus-box">
        <h3>This Week Priority</h3>
        <p>${topCourses[0] || "-"}</p>
        <p>${topCourses[1] || "-"}</p>
        <p>${topCourses[2] || "-"}</p>
      </article>
      <article class="focus-box">
        <h3>Penalty Alert</h3>
        <p>You owe: ${formatMoney(stats.youPenalty)}</p>
        <p>Girlfriend owes: ${formatMoney(stats.girlfriendPenalty)}</p>
        <p>Missed sessions: ${stats.missedSessions}</p>
      </article>
    </div>
  `;
}

function renderLeaderboard() {
  const panel = document.getElementById("leaderboardPanel");
  if (!panel) return;

  const ranks = leaderboard();

  panel.innerHTML = `
    <div class="section-head">
      <h2>Weekly Streak + Leaderboard</h2>
      <p>Gamified scoring for both of you.</p>
    </div>
    <div class="leader-grid"></div>
  `;

  const grid = panel.querySelector(".leader-grid");

  ranks.forEach((item, index) => {
    const card = document.createElement("article");
    card.className = "leader-card";
    const title = index === 0 ? "Current Champion" : "Keep Pushing";
    card.innerHTML = `
      <div class="leader-rank">#${index + 1} • ${title}</div>
      <h3>${item.person}</h3>
      <div class="leader-meta">
        <div class="leader-points">${item.points} pts</div>
        <span class="leader-badge">${item.streak} week streak</span>
      </div>
    `;
    grid.appendChild(card);
  });
}

function renderCourseSelects() {
  const sessionCourse = document.getElementById("sessionCourse");
  const resourceCourse = document.getElementById("resourceCourse");
  const resourceFilter = document.getElementById("resourceFilter");

  if (!sessionCourse || !resourceCourse || !resourceFilter) return;

  sessionCourse.innerHTML = "";
  resourceCourse.innerHTML = "";
  resourceFilter.innerHTML = "";

  const allOpt = document.createElement("option");
  allOpt.value = "all";
  allOpt.textContent = "All Courses";
  resourceFilter.appendChild(allOpt);

  COURSES.forEach((c) => {
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
  });
}

function renderWeeklyPlan() {
  const wrap = document.getElementById("weeklyPlan");
  if (!wrap) return;

  wrap.innerHTML = "";
  const totalCredits = COURSES.reduce((sum, c) => sum + c.credit, 0);
  const weeklyTarget = Number(state.settings.weeklyTargetHours) || 0;

  COURSES.forEach((c) => {
    const recHours = (weeklyTarget * c.credit) / totalCredits;
    const card = document.createElement("article");
    card.className = "course-card";
    card.innerHTML = `
      <h3>${c.name}</h3>
      <span class="badge">${c.credit} credits</span>
      <div><strong>Recommended this week:</strong> ${recHours.toFixed(1)}h</div>
    `;
    wrap.appendChild(card);
  });
}

function renderCourseProgress() {
  const wrap = document.getElementById("courseProgress");
  if (!wrap) return;

  wrap.innerHTML = "";
  const map = courseHoursMap();

  COURSES.forEach((c) => {
    const tracked = map[c.id] || { planned: 0, actual: 0 };
    const ratio = tracked.planned > 0 ? Math.min(100, (tracked.actual / tracked.planned) * 100) : 0;

    const card = document.createElement("article");
    card.className = "course-card";
    card.innerHTML = `
      <h3>${c.name}</h3>
      <span class="badge">${c.credit} credits</span>
      <div class="progress-track"><div class="progress-value" style="width:${ratio.toFixed(1)}%;"></div></div>
      <div><strong>${ratio.toFixed(1)}%</strong> completion vs planned</div>
      <div class="resource-meta">Planned: ${tracked.planned.toFixed(1)}h | Actual: ${tracked.actual.toFixed(1)}h</div>
    `;
    wrap.appendChild(card);
  });
}

function renderSessionTable() {
  const tbody = document.querySelector("#sessionTable tbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  const sorted = [...state.sessions].sort((a, b) => (a.date < b.date ? 1 : -1));

  sorted.forEach((s) => {
    const course = getCourseById(s.courseId);
    const penalty = calcSessionPenalty(s);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td data-label="Date">${formatDate(s.date)}</td>
      <td data-label="Person">${s.person}</td>
      <td data-label="Course">${course ? course.name : s.courseId}</td>
      <td data-label="Plan">${Number(s.plannedHours).toFixed(1)}h</td>
      <td data-label="Actual">${Number(s.actualHours).toFixed(1)}h</td>
      <td data-label="Status" class="${s.status === "missed" ? "penalty" : "ok"}">${s.status}</td>
      <td data-label="Penalty" class="${penalty > 0 ? "penalty" : "ok"}">${formatMoney(penalty)}</td>
      <td data-label="Action"><button class="delete-btn" data-delete-id="${s.id}">Delete</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderContinueStudying() {
  const wrap = document.getElementById("continueList");
  if (!wrap) return;

  wrap.innerHTML = "";

  const recent = getAllResources()
    .filter((r) => Number(r.flags.lastOpenedAt) > 0)
    .sort((a, b) => Number(b.flags.lastOpenedAt) - Number(a.flags.lastOpenedAt))
    .slice(0, 4);

  if (!recent.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Open any resource and it will appear here for quick continuation.";
    wrap.appendChild(empty);
    return;
  }

  recent.forEach((item) => {
    const course = getCourseById(item.courseId);
    const dateText = new Date(Number(item.flags.lastOpenedAt)).toLocaleString();
    const block = document.createElement("article");
    block.className = "continue-item";
    block.innerHTML = `
      <h4>${item.title}</h4>
      <p class="resource-meta">${course ? course.name : item.courseId}</p>
      <p class="resource-meta">Last opened: ${dateText}</p>
      <button type="button" class="ghost-btn" data-open-id="${item.key}">Continue</button>
    `;
    wrap.appendChild(block);
  });
}

function renderResources() {
  const wrap = document.getElementById("resourceList");
  const searchInput = document.getElementById("resourceSearch");
  const filterSelect = document.getElementById("resourceFilter");
  const countBadge = document.getElementById("resourceCountBadge");

  if (!wrap || !searchInput || !filterSelect || !countBadge) return;

  wrap.innerHTML = "";
  const all = getAllResources();
  const q = (searchInput.value || "").trim().toLowerCase();
  const selectedCourse = filterSelect.value || "all";

  const filtered = all.filter((item) => {
    const course = getCourseById(item.courseId);
    const courseName = course ? course.name.toLowerCase() : "";
    const typeText = (item.fileType || "").toLowerCase();
    const titleText = (item.title || "").toLowerCase();

    const passCourse = selectedCourse === "all" || item.courseId === selectedCourse;
    const passQuery = q ? titleText.includes(q) || courseName.includes(q) || typeText.includes(q) : true;
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

  filtered.forEach((item) => {
    const course = getCourseById(item.courseId);
    const courseName = course ? course.name : item.courseId;
    const sourceTag = item.source === "free" ? "Free" : "Custom";
    const typeTag = item.fileName ? "PPT/PDF" : item.url ? "Web" : "Local";
    const favTag = item.flags.favorite ? "Favorite" : "";
    const doneTag = item.flags.completed ? "Completed" : "";
    const meta = item.fileName
      ? `${item.fileName} | ${item.fileType || "unknown"}`
      : item.source === "free"
      ? "Curated free resource"
      : "User added link";

    const tags = [sourceTag, typeTag, favTag, doneTag].filter(Boolean).map((t) => `<span class="resource-tag">${t}</span>`).join("");

    const card = document.createElement("article");
    card.className = "resource-card";
    card.innerHTML = `
      <div class="resource-cover" style="background:${courseCoverStyle(item.courseId)};">
        <strong>${courseName}</strong>
        <div class="resource-tags">${tags}</div>
      </div>
      <div class="resource-content">
        <h3>${item.title}</h3>
        <p class="resource-meta">${meta}</p>
        <div class="resource-actions">
          <button type="button" class="resource-link" data-open-id="${item.key}">${item.url ? "Open" : "Mark Opened"}</button>
          <button type="button" class="ghost-btn ${item.flags.favorite ? "toggle-on" : ""}" data-fav-id="${item.key}">${item.flags.favorite ? "Unfavorite" : "Favorite"}</button>
          <button type="button" class="ghost-btn ${item.flags.completed ? "toggle-on" : ""}" data-done-id="${item.key}">${item.flags.completed ? "Undo" : "Completed"}</button>
          ${item.source === "user" ? `<button type="button" class="ghost-btn" data-resource-delete-id="${item.id}">Remove</button>` : ""}
        </div>
      </div>
    `;
    wrap.appendChild(card);
  });
}

function initHomeTabs() {
  const tabs = Array.from(document.querySelectorAll(".tab-btn"));
  const panels = Array.from(document.querySelectorAll("[data-panel]"));
  if (!tabs.length || !panels.length) return;

  function activate(tabName) {
    tabs.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tabName);
    });

    panels.forEach((panel) => {
      panel.classList.toggle("panel-hidden", panel.dataset.panel !== tabName);
    });
  }

  tabs.forEach((btn) => {
    btn.addEventListener("click", () => activate(btn.dataset.tab || "overview"));
  });

  activate("overview");
}

function refreshAll() {
  renderKpis();
  renderFocusPanel();
  renderLeaderboard();
  renderWeeklyPlan();
  renderCourseProgress();
  renderSessionTable();
  renderContinueStudying();
  renderResources();
}

function handleResourceActions(e) {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;

  const openKey = target.dataset.openId;
  if (openKey) {
    const item = getAllResources().find((r) => r.key === openKey);
    if (!item) return;

    setFlags(openKey, { lastOpenedAt: Date.now() });
    if (item.url) {
      window.open(item.url, "_blank", "noopener,noreferrer");
    }
    renderContinueStudying();
    renderResources();
    return;
  }

  const favKey = target.dataset.favId;
  if (favKey) {
    const flags = getFlags(favKey);
    setFlags(favKey, { favorite: !flags.favorite });
    renderResources();
    return;
  }

  const doneKey = target.dataset.doneId;
  if (doneKey) {
    const flags = getFlags(doneKey);
    setFlags(doneKey, { completed: !flags.completed });
    renderResources();
    return;
  }

  const removeId = target.dataset.resourceDeleteId;
  if (removeId) {
    state.resources = state.resources.filter((r) => r.id !== removeId);
    saveState();
    refreshAll();
  }
}

function bindHomeEvents() {
  const settingsForm = document.getElementById("settingsForm");
  const sessionForm = document.getElementById("sessionForm");
  const resourceForm = document.getElementById("resourceForm");

  if (!settingsForm || !sessionForm || !resourceForm) return;

  const weekly = document.getElementById("weeklyTargetHours");
  const missed = document.getElementById("missedPenalty");
  const shortfall = document.getElementById("shortfallPenaltyPerHour");
  const resourceSearch = document.getElementById("resourceSearch");
  const resourceFilter = document.getElementById("resourceFilter");

  weekly.value = state.settings.weeklyTargetHours;
  missed.value = state.settings.missedPenalty;
  shortfall.value = state.settings.shortfallPenaltyPerHour;

  settingsForm.addEventListener("submit", (e) => {
    e.preventDefault();
    state.settings.weeklyTargetHours = Number(weekly.value) || 1;
    state.settings.missedPenalty = Number(missed.value) || 0;
    state.settings.shortfallPenaltyPerHour = Number(shortfall.value) || 0;
    saveState();
    refreshAll();
  });

  const today = new Date().toISOString().split("T")[0];
  const sessionDate = document.getElementById("sessionDate");
  sessionDate.value = today;

  sessionForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const date = sessionDate.value;
    const person = document.getElementById("sessionPerson").value;
    const courseId = document.getElementById("sessionCourse").value;
    const plannedHours = Number(document.getElementById("plannedHours").value);
    let actualHours = Number(document.getElementById("actualHours").value);
    const status = document.getElementById("sessionStatus").value;

    if (!date || !courseId || plannedHours <= 0 || actualHours < 0) return;

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
    sessionDate.value = today;
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

    state.resources.push({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      courseId,
      title,
      url: url || "",
      fileName: selectedFile ? selectedFile.name : "",
      fileType: selectedFile ? selectedFile.type : "",
      fileSize: selectedFile ? selectedFile.size : 0,
    });

    saveState();
    resourceForm.reset();
    resourceFilter.value = "all";
    refreshAll();
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
    if (select instanceof HTMLSelectElement && select.value === "missed") {
      document.getElementById("actualHours").value = "0";
    }
  });

  resourceSearch.addEventListener("input", renderResources);
  resourceFilter.addEventListener("change", renderResources);

  const resourceList = document.getElementById("resourceList");
  const continueList = document.getElementById("continueList");
  resourceList.addEventListener("click", handleResourceActions);
  continueList.addEventListener("click", handleResourceActions);
}

function bootHomePage() {
  const homeRoot = document.getElementById("home");
  if (!homeRoot) return;

  initHomeTabs();
  renderCourseSelects();
  bindHomeEvents();
  refreshAll();
}

function boot() {
  initTheme();
  renderTodayLabel();
  bootHomePage();
}

boot();
