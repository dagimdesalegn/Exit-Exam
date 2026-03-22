import { supabase } from "./supabaseClient.js";
import { APP_NAME, AVATAR_BUCKET } from "./config.js";

const USERNAME_LOGIN_DOMAIN = "exit.local";

const FULL_COURSE_LIST = [
  "Computer Programming",
  "Fundamentals of Database Systems",
  "Advanced Database Systems",
  "Object Oriented Programming",
  "Computer Organization and Architecture",
  "Data Communication and Computer Networking",
  "Data Structures and Algorithms",
  "Web Programming",
  "Operating System",
  "Software Engineering",
  "Design and Analysis of Algorithms",
  "Introduction to Artificial Intelligence",
  "Computer Security",
  "Network and System Administration",
  "Automata and Complexity Theory",
  "Compiler Design",
];

const state = {
  session: null,
  user: null,
  profile: null,
  partner: null,
  channels: [],
  data: {
    tasks: [],
    milestones: [],
    weeklyTargets: [],
    messages: [],
    questions: [],
  },
  charts: {
    completion: null,
    consistency: null,
    weakTopics: null,
  },
};

const el = {
  authView: document.getElementById("auth-view"),
  appView: document.getElementById("app-view"),
  dashboardTitle: document.getElementById("dashboard-title"),
  authStatus: document.getElementById("auth-status"),
  themedToast: document.getElementById("themed-toast"),
  themedToastText: document.getElementById("themed-toast-text"),
  welcomeText: document.getElementById("welcome-text"),
  pairStatus: document.getElementById("pair-status"),
  navProgressFill: document.getElementById("nav-progress-fill"),
  navProgressLabel: document.getElementById("nav-progress-label"),

  loginForm: document.getElementById("login-form"),
  logoutBtn: document.getElementById("logout-btn"),
  profileShortcut: document.getElementById("profile-shortcut"),
  topProfileAvatar: document.getElementById("top-profile-avatar"),
  mobileMenuBtn: document.getElementById("mobile-menu-btn"),
  mobileTabMenu: document.getElementById("mobile-tab-menu"),

  profileForm: document.getElementById("profile-form"),
  saveProfileBtn: document.getElementById("save-profile-btn"),
  avatarInput: document.getElementById("avatar-input"),
  avatarPreview: document.getElementById("avatar-preview"),
  profileUsername: document.getElementById("profile-username"),
  profileFullname: document.getElementById("profile-fullname"),

  taskForm: document.getElementById("task-form"),
  myTasks: document.getElementById("my-tasks"),
  partnerTasks: document.getElementById("partner-tasks"),

  milestoneForm: document.getElementById("milestone-form"),
  milestoneCourse: document.getElementById("milestone-course"),
  weeklyForm: document.getElementById("weekly-form"),
  weeklyCourse: document.getElementById("weekly-course"),
  myMilestones: document.getElementById("my-milestones"),
  myWeekly: document.getElementById("my-weekly"),

  chatForm: document.getElementById("chat-form"),
  chatInput: document.getElementById("chat-input"),
  chatBox: document.getElementById("chat-box"),

  summaryForm: document.getElementById("summary-form"),
  questionCourse: document.getElementById("question-course"),
  summaryList: document.getElementById("summary-list"),

  manualPlannerBtn: document.getElementById("manual-planner-btn"),
  aiPlannerBtn: document.getElementById("ai-planner-btn"),
  plannerManual: document.getElementById("planner-manual"),
  plannerAi: document.getElementById("planner-ai"),

  completionChart: document.getElementById("completion-chart"),
  consistencyChart: document.getElementById("consistency-chart"),
  weakTopicsChart: document.getElementById("weak-topics-chart"),
};

boot().catch((err) => {
  console.error(err);
  setStatus(el.authStatus, "Initialization failed. Check browser console.", true);
});

async function boot() {
  document.title = APP_NAME;
  clearSupabaseClientStorage();
  setupTabs();
  bindEvents();
  fillCourseSelects();

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    setStatus(el.authStatus, error.message, true);
    return;
  }

  await handleSession(data.session);

  supabase.auth.onAuthStateChange(async (_event, session) => {
    await handleSession(session);
  });
}

function setupTabs() {
  const navButtons = Array.from(document.querySelectorAll(".tab-nav"));
  const mobileButtons = Array.from(document.querySelectorAll(".mobile-tab-btn"));
  const allButtons = [...navButtons, ...mobileButtons];

  allButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.tab;
      activateTab(target);
      if (el.mobileTabMenu && !el.mobileTabMenu.classList.contains("hidden")) {
        el.mobileTabMenu.classList.add("hidden");
      }
    });
  });

  if (el.profileShortcut) {
    el.profileShortcut.addEventListener("click", () => activateTab("profile-tab"));
  }

  if (el.mobileMenuBtn && el.mobileTabMenu) {
    el.mobileMenuBtn.addEventListener("click", () => {
      el.mobileTabMenu.classList.toggle("hidden");
    });

    document.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }
      if (!el.mobileMenuBtn.contains(event.target) && !el.mobileTabMenu.contains(event.target)) {
        el.mobileTabMenu.classList.add("hidden");
      }
    });
  }
}

function activateTab(target) {
  const allButtons = Array.from(document.querySelectorAll(".tab-nav, .mobile-tab-btn"));
  const panels = Array.from(document.querySelectorAll(".tab-panel"));
  allButtons.forEach((b) => b.classList.toggle("active", b.dataset.tab === target));
  panels.forEach((panel) => panel.classList.toggle("hidden", panel.id !== target));
}

function bindEvents() {
  el.loginForm.addEventListener("submit", onLogin);
  el.logoutBtn.addEventListener("click", onLogout);

  el.profileForm.addEventListener("submit", onSaveProfile);
  el.avatarInput.addEventListener("change", onAvatarUpload);

  el.taskForm.addEventListener("submit", onCreateTask);
  el.myTasks.addEventListener("change", onTaskProgressChange);

  el.milestoneForm.addEventListener("submit", onCreateMilestone);
  el.weeklyForm.addEventListener("submit", onCreateWeeklyTarget);
  el.myMilestones.addEventListener("change", onMilestoneProgressChange);
  el.myWeekly.addEventListener("change", onWeeklyCompletionChange);

  el.chatForm.addEventListener("submit", onSendMessage);

  el.summaryForm.addEventListener("submit", onSubmitQuestion);
  el.summaryList.addEventListener("click", onSummaryListClick);

  if (el.manualPlannerBtn) {
    el.manualPlannerBtn.addEventListener("click", () => setPlannerMode("manual"));
  }
  if (el.aiPlannerBtn) {
    el.aiPlannerBtn.addEventListener("click", () => setPlannerMode("ai"));
  }
}

function fillCourseSelects() {
  const options = FULL_COURSE_LIST.map((course) => `<option value="${escapeHtml(course)}">${escapeHtml(course)}</option>`).join("");
  el.milestoneCourse.innerHTML = options;
  el.weeklyCourse.innerHTML = options;
  if (el.questionCourse) {
    el.questionCourse.innerHTML = options;
  }
}

function setPlannerMode(mode) {
  const isAiMode = mode === "ai";

  if (el.manualPlannerBtn) {
    el.manualPlannerBtn.classList.toggle("active", !isAiMode);
  }
  if (el.aiPlannerBtn) {
    el.aiPlannerBtn.classList.toggle("active", isAiMode);
  }
  if (el.plannerManual) {
    el.plannerManual.classList.toggle("hidden", isAiMode);
  }
  if (el.plannerAi) {
    el.plannerAi.classList.toggle("hidden", !isAiMode);
  }
}

async function handleSession(session) {
  clearRealtimeChannels();
  state.session = session;

  if (!session) {
    state.user = null;
    state.profile = null;
    state.partner = null;
    state.data = { tasks: [], milestones: [], weeklyTargets: [], messages: [], questions: [] };

    el.authView.classList.remove("hidden");
    el.appView.classList.add("hidden");
    if (el.dashboardTitle) {
      el.dashboardTitle.textContent = "Exit Exam Dashboard";
    }
    setStatus(el.authStatus, "");
    el.welcomeText.textContent = "";
    if (el.topProfileAvatar) {
      el.topProfileAvatar.src = avatarFallback("User");
    }

    renderTasks([]);
    renderMilestones([]);
    renderWeeklyTargets([]);
    renderMessages([]);
    renderQuestions([]);
    updateNavProgress();
    setPlannerMode("manual");
    return;
  }

  state.user = session.user;
  setStatus(el.authStatus, "");
  el.authView.classList.add("hidden");
  el.appView.classList.remove("hidden");

  await loadEverything();
  subscribeRealtime();
}

async function loadEverything() {
  await ensureProfile();
  await loadPartner();

  const [tasks, milestones, weeklyTargets, messages, questions] = await Promise.all([
    fetchTasks(),
    fetchMilestones(),
    fetchWeeklyTargets(),
    fetchMessages(),
    fetchQuestions(),
  ]);

  state.data.tasks = tasks;
  state.data.milestones = milestones;
  state.data.weeklyTargets = weeklyTargets;
  state.data.messages = messages;
  state.data.questions = questions;

  renderTasks(tasks);
  renderMilestones(milestones);
  renderWeeklyTargets(weeklyTargets);
  renderMessages(messages);
  renderQuestions(questions);
  updateNavProgress();

  const myName = state.profile?.full_name || state.profile?.username || "Student";
  const partnerDisplay = state.partner?.full_name || state.partner?.username;

  if (el.dashboardTitle) {
    el.dashboardTitle.textContent = partnerDisplay
      ? `You are connected with ${partnerDisplay}`
      : "Exit Exam Dashboard";
  }

  el.welcomeText.textContent = partnerDisplay
    ? `Welcome ${myName}`
    : "Partner not linked yet";
}

async function ensureProfile() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .eq("id", state.user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    const fallbackUsername = (state.user.email || "user").split("@")[0].slice(0, 20);
    const { data: created, error: createError } = await supabase
      .from("profiles")
      .insert({ id: state.user.id, username: fallbackUsername })
      .select("id, username, full_name, avatar_url")
      .single();

    if (createError) {
      throw createError;
    }

    state.profile = created;
  } else {
    state.profile = data;
  }

  el.profileUsername.value = state.profile.username || "";
  el.profileFullname.value = state.profile.full_name || "";
  const avatar = state.profile.avatar_url || avatarFallback(state.profile.username);
  el.avatarPreview.src = avatar;
  if (el.topProfileAvatar) {
    el.topProfileAvatar.src = avatar;
  }
}

async function loadPartner() {
  const { data: link, error } = await supabase
    .from("pair_links")
    .select("partner_id")
    .eq("user_id", state.user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!link) {
    state.partner = null;
    setStatus(el.pairStatus, "No partner connected yet.");
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .eq("id", link.partner_id)
    .single();

  if (profileError) {
    throw profileError;
  }

  state.partner = profile;
  setStatus(el.pairStatus, `Connected to ${profile.full_name || profile.username}`);
}

async function onLogin(event) {
  event.preventDefault();

  const username = document.getElementById("login-username").value.trim().toLowerCase();
  const password = document.getElementById("login-password").value;
  const email = usernameToEmail(username);

  if (!username) {
    setStatus(el.authStatus, "Username is required.", true);
    return;
  }

  setStatus(el.authStatus, "Logging in...");
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    setStatus(el.authStatus, error.message, true);
    return;
  }

  setStatus(el.authStatus, "");
  el.loginForm.reset();
}

async function onLogout() {
  await supabase.auth.signOut();
  clearSupabaseClientStorage();
  await handleSession(null);
  activateTab("planner-tab");
}

async function onSaveProfile(event) {
  event.preventDefault();

  const username = el.profileUsername.value.trim().toLowerCase();
  const fullName = el.profileFullname.value.trim();

  if (!username) {
    setStatus(el.pairStatus, "Username is required.", true);
    return;
  }

  if (el.saveProfileBtn) {
    el.saveProfileBtn.disabled = true;
    el.saveProfileBtn.textContent = "Saving...";
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ username, full_name: fullName || null })
    .eq("id", state.user.id)
    .select("id, username, full_name, avatar_url")
    .single();

  if (error) {
    setStatus(el.pairStatus, error.message, true);
    if (el.saveProfileBtn) {
      el.saveProfileBtn.disabled = false;
      el.saveProfileBtn.textContent = "Save Profile";
    }
    return;
  }

  state.profile = data;
  const displayName = state.profile.full_name || state.profile.username;
  setStatus(el.pairStatus, "");
  showThemedToast("Profile saved successfully.");

  if (el.dashboardTitle && state.partner) {
    const partnerDisplay = state.partner.full_name || state.partner.username;
    el.dashboardTitle.textContent = `You are connected with ${partnerDisplay}`;
  }

  el.welcomeText.textContent = `Welcome ${displayName}`;

  if (!state.profile.avatar_url && el.topProfileAvatar) {
    el.topProfileAvatar.src = avatarFallback(state.profile.username);
  }

  if (el.saveProfileBtn) {
    el.saveProfileBtn.disabled = false;
    el.saveProfileBtn.textContent = "Save Profile";
  }
}

async function onAvatarUpload(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    setStatus(el.pairStatus, "Please upload a valid image file.", true);
    return;
  }

  const maxBytes = 3 * 1024 * 1024;
  if (file.size > maxBytes) {
    setStatus(el.pairStatus, "Image is too large. Max size is 3MB.", true);
    return;
  }

  setStatus(el.pairStatus, "Uploading profile image...");

  const path = `${state.user.id}/${Date.now()}-${safeFileName(file.name)}`;
  const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, { upsert: true });

  if (uploadError) {
    setStatus(el.pairStatus, uploadError.message, true);
    return;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);

  const { data, error } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", state.user.id)
    .select("id, username, full_name, avatar_url")
    .single();

  if (error) {
    setStatus(el.pairStatus, error.message, true);
    return;
  }

  state.profile = data;
  el.avatarPreview.src = publicUrl;
  if (el.topProfileAvatar) {
    el.topProfileAvatar.src = publicUrl;
  }
  setStatus(el.pairStatus, "Profile image updated.");
}

async function onCreateTask(event) {
  event.preventDefault();

  const course = document.getElementById("task-course").value.trim();
  const title = document.getElementById("task-title").value.trim();
  const deadline = document.getElementById("task-deadline").value || null;
  const progress = clampNumber(Number(document.getElementById("task-progress").value), 0, 100);

  const { error } = await supabase.from("study_tasks").insert({
    user_id: state.user.id,
    course,
    title,
    target_date: deadline,
    progress,
  });

  if (error) {
    setStatus(el.pairStatus, error.message, true);
    return;
  }

  el.taskForm.reset();
  await refreshTasks();
}

async function onTaskProgressChange(event) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || !input.dataset.taskId) {
    return;
  }

  const progress = clampNumber(Number(input.value), 0, 100);
  const { error } = await supabase
    .from("study_tasks")
    .update({ progress })
    .eq("id", input.dataset.taskId)
    .eq("user_id", state.user.id);

  if (error) {
    setStatus(el.pairStatus, error.message, true);
    return;
  }

  await refreshTasks();
}

async function fetchTasks() {
  const allowedIds = getAllowedUserIds();
  const { data, error } = await supabase
    .from("study_tasks")
    .select("id, user_id, course, title, target_date, progress, created_at")
    .in("user_id", allowedIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

function renderTasks(tasks) {
  const mine = tasks.filter((task) => task.user_id === state.user?.id);
  const partner = tasks.filter((task) => task.user_id === state.partner?.id);

  el.myTasks.innerHTML = mine.map((task) => taskItemHtml(task, true)).join("") || "<li>No tasks yet.</li>";
  el.partnerTasks.innerHTML = partner.map((task) => taskItemHtml(task, false)).join("") || "<li>No partner tasks yet.</li>";
}

function taskItemHtml(task, editable) {
  const progress = clampNumber(Number(task.progress || 0), 0, 100);
  const input = editable
    ? `<label>Progress: <input type="range" min="0" max="100" value="${progress}" data-task-id="${task.id}" /> ${progress}%</label>`
    : `<p>Progress: ${progress}%</p>`;

  return `
    <li>
      <strong>${escapeHtml(task.course || "Unknown Course")}</strong><br />
      <span>${escapeHtml(task.title || "Untitled")}</span><br />
      <small>${escapeHtml(task.target_date ? formatDate(task.target_date) : "No deadline")}</small>
      <div class="progress-line"><span style="width:${progress}%"></span></div>
      ${input}
    </li>
  `;
}

async function onCreateMilestone(event) {
  event.preventDefault();

  const course = el.milestoneCourse.value;
  const title = document.getElementById("milestone-title").value.trim();
  const targetDate = document.getElementById("milestone-deadline").value;
  const progress = clampNumber(Number(document.getElementById("milestone-progress").value), 0, 100);

  const { error } = await supabase.from("study_milestones").insert({
    user_id: state.user.id,
    course,
    title,
    target_date: targetDate,
    progress,
    status: progress >= 100 ? "done" : "in_progress",
  });

  if (error) {
    setStatus(el.pairStatus, error.message, true);
    return;
  }

  el.milestoneForm.reset();
  await refreshMilestones();
}

async function onMilestoneProgressChange(event) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || !input.dataset.milestoneId) {
    return;
  }

  const progress = clampNumber(Number(input.value), 0, 100);
  const status = progress >= 100 ? "done" : progress > 0 ? "in_progress" : "planned";

  const { error } = await supabase
    .from("study_milestones")
    .update({ progress, status })
    .eq("id", input.dataset.milestoneId)
    .eq("user_id", state.user.id);

  if (error) {
    setStatus(el.pairStatus, error.message, true);
    return;
  }

  await refreshMilestones();
}

async function fetchMilestones() {
  const allowedIds = getAllowedUserIds();

  const { data, error } = await supabase
    .from("study_milestones")
    .select("id, user_id, course, title, target_date, progress, status, created_at")
    .in("user_id", allowedIds)
    .order("target_date", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

function renderMilestones(rows) {
  const mine = rows.filter((row) => row.user_id === state.user?.id);
  el.myMilestones.innerHTML = mine.map((row) => milestoneItemHtml(row)).join("") || "<li>No milestones yet.</li>";
}

function milestoneItemHtml(row) {
  const progress = clampNumber(Number(row.progress || 0), 0, 100);
  const deadline = row.target_date ? formatDate(row.target_date) : "No date";

  return `
    <li>
      <strong>${escapeHtml(row.course)}</strong><br />
      <span>${escapeHtml(row.title)}</span><br />
      <small>${escapeHtml(deadline)} | ${escapeHtml(row.status || "planned")}</small>
      <div class="progress-line"><span style="width:${progress}%"></span></div>
      <label>Progress: <input type="range" min="0" max="100" value="${progress}" data-milestone-id="${row.id}" /> ${progress}%</label>
    </li>
  `;
}

async function onCreateWeeklyTarget(event) {
  event.preventDefault();

  const course = el.weeklyCourse.value;
  const weekStart = document.getElementById("weekly-start").value;
  const targetHours = clampNumber(Number(document.getElementById("weekly-hours").value), 1, 60);
  const targetItems = clampNumber(Number(document.getElementById("weekly-items").value), 1, 200);

  const { error } = await supabase.from("weekly_targets").insert({
    user_id: state.user.id,
    course,
    week_start: weekStart,
    target_hours: targetHours,
    target_items: targetItems,
    completion: 0,
  });

  if (error) {
    setStatus(el.pairStatus, error.message, true);
    return;
  }

  el.weeklyForm.reset();
  await refreshWeeklyTargets();
}

async function onWeeklyCompletionChange(event) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || !input.dataset.weeklyId) {
    return;
  }

  const completion = clampNumber(Number(input.value), 0, 100);
  const { error } = await supabase
    .from("weekly_targets")
    .update({ completion })
    .eq("id", input.dataset.weeklyId)
    .eq("user_id", state.user.id);

  if (error) {
    setStatus(el.pairStatus, error.message, true);
    return;
  }

  await refreshWeeklyTargets();
}

async function fetchWeeklyTargets() {
  const allowedIds = getAllowedUserIds();

  const { data, error } = await supabase
    .from("weekly_targets")
    .select("id, user_id, course, week_start, target_hours, target_items, completion, created_at")
    .in("user_id", allowedIds)
    .order("week_start", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

function renderWeeklyTargets(rows) {
  const mine = rows.filter((row) => row.user_id === state.user?.id);
  el.myWeekly.innerHTML = mine.map((row) => weeklyItemHtml(row)).join("") || "<li>No weekly targets yet.</li>";
}

function weeklyItemHtml(row) {
  const completion = clampNumber(Number(row.completion || 0), 0, 100);

  return `
    <li>
      <strong>${escapeHtml(row.course)}</strong><br />
      <small>Week of ${escapeHtml(formatDate(row.week_start))}</small>
      <p>Target: ${escapeHtml(String(row.target_hours))}h, ${escapeHtml(String(row.target_items))} items</p>
      <div class="progress-line"><span style="width:${completion}%"></span></div>
      <label>Completion: <input type="range" min="0" max="100" value="${completion}" data-weekly-id="${row.id}" /> ${completion}%</label>
    </li>
  `;
}

async function onSendMessage(event) {
  event.preventDefault();
  if (!state.partner?.id) {
    setStatus(el.pairStatus, "Partner is not connected yet.", true);
    return;
  }

  const text = el.chatInput.value.trim();
  if (!text) {
    return;
  }

  const { error } = await supabase.from("chat_messages").insert({
    sender_id: state.user.id,
    receiver_id: state.partner.id,
    body: text,
  });

  if (error) {
    setStatus(el.pairStatus, error.message, true);
    return;
  }

  el.chatInput.value = "";
  await refreshMessages();
}

async function fetchMessages() {
  if (!state.partner?.id) {
    return [];
  }

  const me = state.user.id;
  const partner = state.partner.id;
  const conversationFilter = `and(sender_id.eq.${me},receiver_id.eq.${partner}),and(sender_id.eq.${partner},receiver_id.eq.${me})`;

  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, sender_id, receiver_id, body, created_at")
    .or(conversationFilter)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) {
    throw error;
  }

  return data || [];
}

function renderMessages(messages) {
  if (!messages.length) {
    el.chatBox.innerHTML = "<p class='status'>No messages yet.</p>";
    return;
  }

  el.chatBox.innerHTML = messages
    .map((msg) => {
      const mine = msg.sender_id === state.user?.id;
      const cls = mine ? "chat-msg chat-me" : "chat-msg chat-them";
      return `<div class="${cls}">${escapeHtml(msg.body)}<br /><small>${escapeHtml(formatDateTime(msg.created_at))}</small></div>`;
    })
    .join("");

  el.chatBox.scrollTop = el.chatBox.scrollHeight;
}

async function onSubmitQuestion(event) {
  event.preventDefault();

  const course = el.questionCourse.value.trim();
  const question = document.getElementById("question-text").value.trim();
  const scheduledRaw = document.getElementById("question-schedule").value;
  const scheduledFor = scheduledRaw ? new Date(scheduledRaw).toISOString() : null;
  const shouldRunNow = !scheduledFor || new Date(scheduledFor).getTime() <= Date.now();

  const { data, error } = await supabase
    .from("questions")
    .insert({
      user_id: state.user.id,
      course,
      question,
      scheduled_for: scheduledFor,
      status: shouldRunNow ? "processing" : "scheduled",
    })
    .select("id")
    .single();

  if (error) {
    setStatus(el.pairStatus, error.message, true);
    return;
  }

  if (shouldRunNow) {
    await invokeSummary(data.id);
  }

  el.summaryForm.reset();
  await refreshQuestions();
}

async function onSummaryListClick(event) {
  const button = event.target;
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  const questionId = button.dataset.runQuestion;
  if (!questionId) {
    return;
  }

  await invokeSummary(questionId);
  await refreshQuestions();
}

async function invokeSummary(questionId) {
  const { error } = await supabase.functions.invoke("ai-summary", {
    body: { questionId },
  });

  if (error) {
    setStatus(el.pairStatus, `AI summary failed: ${error.message}`, true);
  }
}

async function fetchQuestions() {
  const { data, error } = await supabase
    .from("questions")
    .select("id, course, question, status, ai_summary, scheduled_for, created_at")
    .eq("user_id", state.user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return data || [];
}

function renderQuestions(rows) {
  if (!rows.length) {
    el.summaryList.innerHTML = "<li>No questions yet.</li>";
    return;
  }

  el.summaryList.innerHTML = rows
    .map((row) => {
      const safeSummary = row.ai_summary ? escapeHtml(row.ai_summary) : "Summary not ready yet.";
      const scheduled = row.scheduled_for ? `Scheduled: ${escapeHtml(formatDateTime(row.scheduled_for))}` : "Immediate";
      const runButton = row.status === "scheduled" ? `<button data-run-question="${row.id}" class="ghost-btn" type="button">Run Now</button>` : "";

      return `
        <li>
          <strong>${escapeHtml(row.course || "Course")}</strong> <small>(${escapeHtml(row.status || "unknown")})</small><br />
          <span>${escapeHtml(row.question || "")}</span><br />
          <small>${scheduled}</small>
          <p>${safeSummary}</p>
          ${runButton}
        </li>
      `;
    })
    .join("");
}

function renderAnalytics() {
  if (!window.Chart || !state.user) {
    return;
  }

  const tasks = state.data.tasks;
  const meId = state.user.id;
  const partnerId = state.partner?.id;

  const meTasks = tasks.filter((t) => t.user_id === meId);
  const partnerTasks = tasks.filter((t) => t.user_id === partnerId);

  const meAvg = averageProgress(meTasks);
  const partnerAvg = averageProgress(partnerTasks);
  updateCompletionChart(meAvg, partnerAvg);

  const weekly = weeklyConsistency(tasks, meId, partnerId);
  updateConsistencyChart(weekly.labels, weekly.me, weekly.partner);

  const weak = weakTopics(tasks);
  updateWeakTopicsChart(weak.labels, weak.values);
}

function updateCompletionChart(meAvg, partnerAvg) {
  const ctx = el.completionChart?.getContext("2d");
  if (!ctx) {
    return;
  }

  state.charts.completion?.destroy();
  state.charts.completion = new window.Chart(ctx, {
    type: "bar",
    data: {
      labels: ["You", "Partner"],
      datasets: [
        {
          label: "Average Completion %",
          data: [meAvg, partnerAvg],
          backgroundColor: ["#1b7a49", "#f0b429"],
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      scales: { y: { min: 0, max: 100 } },
    },
  });
}

function updateConsistencyChart(labels, meData, partnerData) {
  const ctx = el.consistencyChart?.getContext("2d");
  if (!ctx) {
    return;
  }

  state.charts.consistency?.destroy();
  state.charts.consistency = new window.Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "You",
          data: meData,
          borderColor: "#1b7a49",
          backgroundColor: "rgba(27, 122, 73, 0.16)",
          tension: 0.3,
          fill: true,
        },
        {
          label: "Partner",
          data: partnerData,
          borderColor: "#f0b429",
          backgroundColor: "rgba(240, 180, 41, 0.16)",
          tension: 0.3,
          fill: true,
        },
      ],
    },
    options: { responsive: true },
  });
}

function updateWeakTopicsChart(labels, values) {
  const ctx = el.weakTopicsChart?.getContext("2d");
  if (!ctx) {
    return;
  }

  state.charts.weakTopics?.destroy();
  state.charts.weakTopics = new window.Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Average Progress %",
          data: values,
          backgroundColor: "#c94242",
          borderRadius: 8,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      scales: { x: { min: 0, max: 100 } },
    },
  });
}

function destroyCharts() {
  state.charts.completion?.destroy();
  state.charts.consistency?.destroy();
  state.charts.weakTopics?.destroy();
  state.charts = { completion: null, consistency: null, weakTopics: null };
}

function averageProgress(rows) {
  if (!rows.length) {
    return 0;
  }

  const total = rows.reduce((sum, row) => sum + clampNumber(Number(row.progress || 0), 0, 100), 0);
  return Math.round(total / rows.length);
}

function weeklyConsistency(tasks, meId, partnerId) {
  const labelDates = lastMondayDates(8);
  const labels = labelDates.map((d) => shortDate(d));

  const meMap = new Map(labelDates.map((d) => [d, 0]));
  const partnerMap = new Map(labelDates.map((d) => [d, 0]));

  tasks.forEach((task) => {
    const created = new Date(task.created_at);
    const week = isoDate(mondayOf(created));

    if (meMap.has(week) && task.user_id === meId) {
      meMap.set(week, (meMap.get(week) || 0) + 1);
    }

    if (partnerMap.has(week) && task.user_id === partnerId) {
      partnerMap.set(week, (partnerMap.get(week) || 0) + 1);
    }
  });

  return {
    labels,
    me: labelDates.map((d) => meMap.get(d) || 0),
    partner: labelDates.map((d) => partnerMap.get(d) || 0),
  };
}

function weakTopics(tasks) {
  if (!tasks.length) {
    return { labels: ["No data"], values: [0] };
  }

  const byCourse = new Map();
  tasks.forEach((task) => {
    if (!task.course) {
      return;
    }

    const key = task.course;
    if (!byCourse.has(key)) {
      byCourse.set(key, { sum: 0, count: 0 });
    }

    const row = byCourse.get(key);
    row.sum += clampNumber(Number(task.progress || 0), 0, 100);
    row.count += 1;
  });

  const ranked = Array.from(byCourse.entries())
    .map(([course, row]) => ({ course, avg: Math.round(row.sum / row.count) }))
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 6);

  return {
    labels: ranked.map((r) => r.course),
    values: ranked.map((r) => r.avg),
  };
}

function subscribeRealtime() {
  const tables = [
    { name: "study_tasks", fn: refreshTasks },
    { name: "study_milestones", fn: refreshMilestones },
    { name: "weekly_targets", fn: refreshWeeklyTargets },
    { name: "chat_messages", fn: refreshMessages },
    { name: "questions", fn: refreshQuestions },
  ];

  state.channels = tables.map((entry) => {
    return supabase
      .channel(`${entry.name}-realtime`)
      .on("postgres_changes", { event: "*", schema: "public", table: entry.name }, entry.fn)
      .subscribe();
  });
}

function clearRealtimeChannels() {
  state.channels.forEach((channel) => {
    supabase.removeChannel(channel);
  });
  state.channels = [];
}

async function refreshTasks() {
  try {
    const tasks = await fetchTasks();
    state.data.tasks = tasks;
    renderTasks(tasks);
    updateNavProgress();
  } catch (error) {
    console.error(error);
  }
}

async function refreshMilestones() {
  try {
    const rows = await fetchMilestones();
    state.data.milestones = rows;
    renderMilestones(rows);
    updateNavProgress();
  } catch (error) {
    console.error(error);
  }
}

async function refreshWeeklyTargets() {
  try {
    const rows = await fetchWeeklyTargets();
    state.data.weeklyTargets = rows;
    renderWeeklyTargets(rows);
    updateNavProgress();
  } catch (error) {
    console.error(error);
  }
}

async function refreshMessages() {
  try {
    const messages = await fetchMessages();
    state.data.messages = messages;
    renderMessages(messages);
  } catch (error) {
    console.error(error);
  }
}

async function refreshQuestions() {
  try {
    const rows = await fetchQuestions();
    state.data.questions = rows;
    renderQuestions(rows);
  } catch (error) {
    console.error(error);
  }
}

function getAllowedUserIds() {
  const ids = [state.user.id];
  if (state.partner?.id) {
    ids.push(state.partner.id);
  }
  return ids;
}

function lastMondayDates(count) {
  const result = [];
  const base = mondayOf(new Date());

  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(base);
    date.setDate(date.getDate() - i * 7);
    result.push(isoDate(date));
  }

  return result;
}

function mondayOf(date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const shift = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + shift);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function isoDate(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function shortDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(raw) {
  return new Date(raw).toLocaleDateString();
}

function formatDateTime(raw) {
  return new Date(raw).toLocaleString();
}

function clampNumber(value, min, max) {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
}

function setStatus(node, message, isError = false) {
  node.textContent = message || "";
  node.style.color = isError ? "var(--danger)" : "var(--muted)";
}

function safeFileName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function avatarFallback(seed) {
  const value = encodeURIComponent(seed || "User");
  return `https://api.dicebear.com/7.x/initials/svg?seed=${value}`;
}

function usernameToEmail(username) {
  return `${username}@${USERNAME_LOGIN_DOMAIN}`;
}

function showThemedToast(message) {
  if (!el.themedToast || !el.themedToastText) {
    return;
  }

  el.themedToastText.textContent = message;
  el.themedToast.classList.remove("hidden");
  window.clearTimeout(showThemedToast.hideTimer);
  showThemedToast.hideTimer = window.setTimeout(() => {
    el.themedToast.classList.add("hidden");
  }, 2200);
}

function clearSupabaseClientStorage() {
  const stores = [window.localStorage, window.sessionStorage];
  stores.forEach((store) => {
    const keys = [];
    for (let i = 0; i < store.length; i += 1) {
      const key = store.key(i);
      if (key && key.toLowerCase().includes("supabase")) {
        keys.push(key);
      }
    }
    keys.forEach((key) => store.removeItem(key));
  });
}
