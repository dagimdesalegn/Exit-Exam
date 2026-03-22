import { supabase } from "./supabaseClient.js";
import { APP_NAME, AVATAR_BUCKET } from "./config.js";

const USERNAME_LOGIN_DOMAIN = "exit.local";
const EXAM_COUNTDOWN_DAYS = 55;
const COURSE_CACHE_TTL_MS = 5 * 60 * 1000;
const METRICS_CACHE_TTL_MS = 12 * 1000;
const USERNAME_PATTERN = /^[a-z0-9._-]{3,20}$/;

const courseNameCache = {
  expiresAt: 0,
  data: null,
};

const metricsCache = {
  at: 0,
  data: null,
};

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
  partnerTyping: false,
  pendingReply: null,
  partnerReadAt: null,
  forceLoginView: false,
  myReadAt: 0,
  chatReadStateEnabled: true,
  unreadCount: 0,
  partnerOnline: false,
  partnerLastSeenAt: 0,
  typingStopTimer: null,
  typingLastSentAt: 0,
  chatSignalChannel: null,
  presenceHeartbeatTimer: null,
  messagePollTimer: null,
  messagePollRunning: false,
  chatAutoSyncBound: false,
  channels: [],
  chatSignalReady: false,
  chatSeenColumnsAvailable: true,
  studyTasksAvailable: true,
  realtimeDisabled: false,
  questionCleanupStarted: false,
  metrics: {
    totalQuestions: 0,
    totalCourses: 0,
    liveQuestions: 0,
    liveCourses: 0,
  },
  data: {
    tasks: [],
    milestones: [],
    weeklyTargets: [],
    messages: [],
    questions: [],
    questionAttempts: [],
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
  chatNotifyBtn: document.getElementById("chat-notify-btn"),
  chatUnreadBadge: document.getElementById("chat-unread-badge"),
  totalQuestionsFeature: document.getElementById("totalQuestionsFeature"),
  totalCoursesFeature: document.getElementById("totalCoursesFeature"),
  totalMilestonesFeature: document.getElementById("totalMilestonesFeature"),
  partnerProgressFeature: document.getElementById("partnerProgressFeature"),
  homePartnerAvatar: document.getElementById("home-partner-avatar"),
  homePartnerName: document.getElementById("home-partner-name"),
  homeQuestionsStat: document.getElementById("homeQuestionsStat"),
  homeCoursesStat: document.getElementById("homeCoursesStat"),
  homeMilestonesStat: document.getElementById("homeMilestonesStat"),
  homeProgressStat: document.getElementById("homeProgressStat"),
  homePartnerMilestonesStat: document.getElementById("homePartnerMilestonesStat"),
  homePartnerProgressStat: document.getElementById("homePartnerProgressStat"),
  homeTrendStat: document.getElementById("homeTrendStat"),
  weeklyContributionGrid: document.getElementById("weeklyContributionGrid"),
  weeklyContributionSummary: document.getElementById("weeklyContributionSummary"),
  startLearningBtn: document.getElementById("start-learning-btn"),
  learningChoiceModal: document.getElementById("learning-choice-modal"),
  closeLearningChoiceBtn: document.getElementById("close-learning-choice-btn"),
  openQuestionBankBtn: document.getElementById("open-question-bank-btn"),
  openStudyMaterialsBtn: document.getElementById("open-study-materials-btn"),

  loginForm: document.getElementById("login-form"),
  loginPasswordInput: document.getElementById("login-password"),
  loginPasswordToggle: document.getElementById("login-password-toggle"),
  profileShortcut: document.getElementById("profile-shortcut"),
  closeMobileTabMenu: document.getElementById("close-mobile-tab-menu"),
  closeProfileActionMenu: document.getElementById("close-profile-action-menu"),
  editProfileBtn: document.getElementById("edit-profile-btn"),
  profileLogoutBtn: document.getElementById("profile-logout-btn"),
  profileActionMenu: document.getElementById("profile-action-menu"),
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
  closeChatBtn: document.getElementById("close-chat-btn"),
  closeProfileBtn: document.getElementById("close-profile-btn"),
  chatSelfAvatar: document.getElementById("chat-self-avatar"),
  chatPartnerPresence: document.getElementById("chat-partner-presence"),
  chatPartnerStatus: document.getElementById("chat-partner-status"),
  chatPartnerTyping: document.getElementById("chat-partner-typing"),
  chatLoading: document.getElementById("chat-loading"),
  chatReplyPreview: document.getElementById("chat-reply-preview"),
  chatReplyText: document.getElementById("chat-reply-text"),
  chatReplyCancel: document.getElementById("chat-reply-cancel"),

  examCountdownDays: document.getElementById("examCountdownDays"),
  examCountdownDate: document.getElementById("examCountdownDate"),

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
  clearLoginInputs();
  setupTabs();
  bindEvents();
  await fillCourseSelects();
  initExamCountdown();

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
    el.profileShortcut.addEventListener("click", (event) => {
      event.stopPropagation();
      if (el.profileActionMenu) {
        if (el.mobileTabMenu) {
          el.mobileTabMenu.classList.add("hidden");
        }
        const nextHidden = !el.profileActionMenu.classList.contains("hidden");
        el.profileActionMenu.classList.toggle("hidden");
        if (!nextHidden) {
          positionMenuToTrigger(el.profileActionMenu, el.profileShortcut);
        }
      }
    });
  }

  if (el.mobileMenuBtn && el.mobileTabMenu) {
    el.mobileMenuBtn.addEventListener("click", () => {
      if (el.profileActionMenu) {
        el.profileActionMenu.classList.add("hidden");
      }
      const nextHidden = !el.mobileTabMenu.classList.contains("hidden");
      el.mobileTabMenu.classList.toggle("hidden");
      if (!nextHidden) {
        positionMenuToTrigger(el.mobileTabMenu, el.mobileMenuBtn);
      }
    });

    document.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }
      if (!el.mobileMenuBtn.contains(event.target) && !el.mobileTabMenu.contains(event.target)) {
        el.mobileTabMenu.classList.add("hidden");
      }

      if (el.profileActionMenu && el.profileShortcut) {
        const clickedProfileMenu = el.profileActionMenu.contains(event.target) || el.profileShortcut.contains(event.target);
        if (!clickedProfileMenu) {
          el.profileActionMenu.classList.add("hidden");
        }
      }
    });
  }

  if (el.closeMobileTabMenu && el.mobileTabMenu) {
    el.closeMobileTabMenu.addEventListener("click", () => {
      el.mobileTabMenu.classList.add("hidden");
    });
  }

  if (el.closeProfileActionMenu && el.profileActionMenu) {
    el.closeProfileActionMenu.addEventListener("click", () => {
      el.profileActionMenu.classList.add("hidden");
    });
  }

  window.addEventListener("resize", () => {
    if (el.mobileTabMenu && !el.mobileTabMenu.classList.contains("hidden") && el.mobileMenuBtn) {
      positionMenuToTrigger(el.mobileTabMenu, el.mobileMenuBtn);
    }
    if (el.profileActionMenu && !el.profileActionMenu.classList.contains("hidden") && el.profileShortcut) {
      positionMenuToTrigger(el.profileActionMenu, el.profileShortcut);
    }
  });
}

function positionMenuToTrigger(menuEl, triggerEl) {
  if (!menuEl || !triggerEl) {
    return;
  }

  const margin = 8;
  const rect = triggerEl.getBoundingClientRect();

  menuEl.style.visibility = "hidden";
  menuEl.classList.remove("hidden");
  const menuRect = menuEl.getBoundingClientRect();

  const targetLeft = rect.left + rect.width / 2 - menuRect.width / 2;
  const minLeft = margin;
  const maxLeft = Math.max(margin, window.innerWidth - menuRect.width - margin);
  const left = Math.min(maxLeft, Math.max(minLeft, targetLeft));

  const belowTop = rect.bottom + 8;
  const fitsBelow = belowTop + menuRect.height <= window.innerHeight - margin;
  const aboveTop = rect.top - menuRect.height - 8;
  const desiredTop = fitsBelow ? belowTop : Math.max(margin, aboveTop);
  const maxTop = Math.max(margin, window.innerHeight - menuRect.height - margin);
  const top = Math.min(maxTop, Math.max(margin, desiredTop));

  menuEl.style.left = `${Math.round(left)}px`;
  menuEl.style.top = `${Math.round(top)}px`;
  menuEl.style.visibility = "visible";
}

function activateTab(target) {
  const allButtons = Array.from(document.querySelectorAll(".tab-nav, .mobile-tab-btn"));
  const panels = Array.from(document.querySelectorAll(".tab-panel"));
  allButtons.forEach((b) => b.classList.toggle("active", b.dataset.tab === target));
  panels.forEach((panel) => panel.classList.toggle("hidden", panel.id !== target));

  if (target === "chat-tab") {
    markChatAsRead();
    emitReadReceipt();
  }
}

function bindEvents() {
  el.loginForm.addEventListener("submit", onLogin);
  if (el.loginPasswordToggle) {
    el.loginPasswordToggle.addEventListener("click", toggleLoginPasswordVisibility);
  }
  if (el.chatNotifyBtn) {
    el.chatNotifyBtn.addEventListener("click", onOpenChatFromNotification);
  }
  if (el.editProfileBtn) {
    el.editProfileBtn.addEventListener("click", () => {
      activateTab("profile-tab");
      if (el.profileActionMenu) {
        el.profileActionMenu.classList.add("hidden");
      }
    });
  }
  if (el.profileLogoutBtn) {
    el.profileLogoutBtn.addEventListener("click", async () => {
      if (el.profileActionMenu) {
        el.profileActionMenu.classList.add("hidden");
      }
      await onLogout();
    });
  }

  el.profileForm.addEventListener("submit", onSaveProfile);
  el.avatarInput.addEventListener("change", onAvatarUpload);

  if (el.taskForm) {
    el.taskForm.addEventListener("submit", onCreateTask);
  }
  if (el.myTasks) {
    el.myTasks.addEventListener("change", onTaskProgressChange);
  }

  if (el.milestoneForm) {
    el.milestoneForm.addEventListener("submit", onCreateMilestone);
  }
  if (el.myMilestones) {
    el.myMilestones.addEventListener("change", onMilestoneProgressChange);
  }

  el.chatForm.addEventListener("submit", onSendMessage);
  el.chatInput.addEventListener("input", onChatInputTyping);
  if (el.chatBox) {
    el.chatBox.addEventListener("click", onChatBoxClick);
  }
  if (el.chatReplyCancel) {
    el.chatReplyCancel.addEventListener("click", clearReplyTarget);
  }
  if (el.closeChatBtn) {
    el.closeChatBtn.addEventListener("click", () => activateTab("home-tab"));
  }
  if (el.closeProfileBtn) {
    el.closeProfileBtn.addEventListener("click", () => activateTab("home-tab"));
  }

  if (el.startLearningBtn) {
    el.startLearningBtn.addEventListener("click", openLearningChoiceModal);
  }
  if (el.closeLearningChoiceBtn) {
    el.closeLearningChoiceBtn.addEventListener("click", closeLearningChoiceModal);
  }
  if (el.openQuestionBankBtn) {
    el.openQuestionBankBtn.addEventListener("click", () => {
      window.location.href = "questions.html";
    });
  }
  if (el.openStudyMaterialsBtn) {
    el.openStudyMaterialsBtn.addEventListener("click", () => {
      window.location.href = "study.html";
    });
  }
  if (el.learningChoiceModal) {
    el.learningChoiceModal.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }
      if (event.target.hasAttribute("data-close-learning-choice")) {
        closeLearningChoiceModal();
      }
    });
  }

  window.addEventListener("beforeunload", () => {
    sendChatSignal("presence", { online: false });
    sendChatSignal("typing", { isTyping: false });
  });

  document.addEventListener("visibilitychange", () => {
    if (!state.user?.id || !state.partner?.id) {
      return;
    }
    if (document.visibilityState === "hidden") {
      sendChatSignal("presence", { online: false });
      return;
    }
    sendChatSignal("presence", { online: true });
  });
}

function toggleLoginPasswordVisibility() {
  if (!el.loginPasswordInput || !el.loginPasswordToggle) {
    return;
  }

  const nextType = el.loginPasswordInput.type === "password" ? "text" : "password";
  el.loginPasswordInput.type = nextType;

  const icon = el.loginPasswordToggle.querySelector("i");
  if (icon) {
    icon.className = nextType === "password" ? "fa-regular fa-eye" : "fa-regular fa-eye-slash";
  }

  const isHidden = nextType === "password";
  el.loginPasswordToggle.setAttribute("aria-label", isHidden ? "Show password" : "Hide password");
  el.loginPasswordToggle.title = isHidden ? "Show password" : "Hide password";
}

async function fillCourseSelects() {
  const courses = await fetchCourseNames();
  const options = courses.map((course) => `<option value="${escapeHtml(course)}">${escapeHtml(course)}</option>`).join("");
  if (el.milestoneCourse) {
    el.milestoneCourse.innerHTML = options;
  }
  if (el.weeklyCourse) {
    el.weeklyCourse.innerHTML = options;
  }
  if (el.quickCourse) {
    el.quickCourse.innerHTML = options;
  }
}

async function fetchCourseNames() {
  if (courseNameCache.data && Date.now() < courseNameCache.expiresAt) {
    return [...courseNameCache.data];
  }

  try {
    const { data, error } = await supabase
      .from("courses")
      .select("name, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      return [...FULL_COURSE_LIST];
    }

    const fromDb = (data || [])
      .map((row) => sanitizeUserText(row.name || "", 80))
      .filter(Boolean);
    const resolved = fromDb.length ? fromDb : [...FULL_COURSE_LIST];
    courseNameCache.data = resolved;
    courseNameCache.expiresAt = Date.now() + COURSE_CACHE_TTL_MS;
    return [...resolved];
  } catch (_error) {
    return [...FULL_COURSE_LIST];
  }
}

async function handleSession(session) {
  const previousUserId = state.user?.id || null;
  const incomingUserId = session?.user?.id || null;
  const sameAuthenticatedUser = Boolean(previousUserId && incomingUserId && previousUserId === incomingUserId);

  if (!sameAuthenticatedUser) {
    stopChatAutoSync();
    clearRealtimeChannels();
    state.realtimeDisabled = false;
  }

  state.session = session;

  if (state.forceLoginView && session) {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch (error) {
      console.error("Forced logout guard signOut failed:", error);
    }
    session = null;
    state.session = null;
  }

  if (!session) {
    document.body.classList.add("auth-only");
    window.clearTimeout(state.typingStopTimer);
    state.user = null;
    state.profile = null;
    state.partner = null;
    state.partnerTyping = false;
    state.partnerReadAt = null;
    state.myReadAt = 0;
    state.unreadCount = 0;
    state.partnerOnline = false;
    state.partnerLastSeenAt = 0;
    state.data = { tasks: [], milestones: [], weeklyTargets: [], messages: [], questions: [], questionAttempts: [] };

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
    renderMessages([]);
    updateUnreadBadge();
    renderChatPresence();
    renderHomeDashboard();
    updateNavProgress();
    clearLoginInputs();
    return;
  }

  state.user = session.user;
  document.body.classList.remove("auth-only");
  setStatus(el.authStatus, "");
  el.authView.classList.add("hidden");
  el.appView.classList.remove("hidden");

  await loadEverything();
  subscribeRealtime();
  startChatAutoSync();
  activateTab("home-tab");
}

function clearLoginInputs() {
  const usernameInput = document.getElementById("login-username");
  const passwordInput = document.getElementById("login-password");

  if (usernameInput instanceof HTMLInputElement) {
    usernameInput.value = "";
  }
  if (passwordInput instanceof HTMLInputElement) {
    passwordInput.value = "";
  }
}

async function loadEverything() {
  await ensureProfile();
  await loadPartner();
  await loadChatReadStateFromDb();

  const [tasks, messages, questionAttempts] = await Promise.all([
    fetchTasks(),
    fetchMessages(),
    fetchQuestionAttempts(),
  ]);

  state.data.tasks = tasks;
  state.data.milestones = [];
  state.data.weeklyTargets = [];
  state.data.messages = messages;
  state.data.questions = [];
  state.data.questionAttempts = questionAttempts;

  await refreshHomeMetrics();

  renderTasks(tasks);
  renderMessages(messages, { forceBottom: true });
  updateUnreadFromMessages(messages);
  renderHomeDashboard();
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
  syncChatSelfAvatar();
}

async function loadPartner() {
  let { data: link, error } = await supabase
    .from("pair_links")
    .select("user_id, partner_id")
    .eq("user_id", state.user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  // Fallback for links created in the opposite direction.
  if (!link) {
    const reverse = await supabase
      .from("pair_links")
      .select("user_id, partner_id")
      .eq("partner_id", state.user.id)
      .maybeSingle();

    if (reverse.error) {
      throw reverse.error;
    }

    if (reverse.data) {
      link = {
        user_id: reverse.data.user_id,
        partner_id: reverse.data.user_id,
      };
    }
  }

  if (!link) {
    state.partner = null;
    setStatus(el.pairStatus, "No partner connected yet.");
    renderChatPresence();
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
  state.partnerLastSeenAt = Date.now();
  setStatus(el.pairStatus, `Connected to ${profile.full_name || profile.username}`);
  renderChatPresence();
}

async function onLogin(event) {
  event.preventDefault();
  state.forceLoginView = false;

  const username = sanitizeUserText(document.getElementById("login-username").value, 20).toLowerCase();
  const password = document.getElementById("login-password").value;
  const email = usernameToEmail(username);

  if (!username) {
    setStatus(el.authStatus, "Username is required.", true);
    return;
  }

  if (!USERNAME_PATTERN.test(username)) {
    setStatus(el.authStatus, "Username must be 3-20 chars (letters, numbers, ., _, -).", true);
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
  sendChatSignal("presence", { online: false });
  state.forceLoginView = true;
  clearSupabaseClientStorage();
  await handleSession(null);

  try {
    // Local scope clears the current tab/app session quickly.
    await supabase.auth.signOut({ scope: "local" });
  } catch (error) {
    console.error("Logout signOut failed, forcing local logout view:", error);
  } finally {
    clearSupabaseClientStorage();
    await handleSession(null);
    activateTab("home-tab");
    if (el.profileActionMenu) {
      el.profileActionMenu.classList.add("hidden");
    }
  }
}

async function onSaveProfile(event) {
  event.preventDefault();

  const username = sanitizeUserText(el.profileUsername.value, 20).toLowerCase();
  const fullName = sanitizeUserText(el.profileFullname.value, 40);

  if (!username) {
    setStatus(el.pairStatus, "Username is required.", true);
    return;
  }

  if (!USERNAME_PATTERN.test(username)) {
    setStatus(el.pairStatus, "Username must be 3-20 chars (letters, numbers, ., _, -).", true);
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
  syncChatSelfAvatar();

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
  syncChatSelfAvatar();
  setStatus(el.pairStatus, "Profile image updated.");
}

async function onCreateTask(event) {
  event.preventDefault();

  if (!state.studyTasksAvailable) {
    setStatus(el.pairStatus, "Study tasks are disabled because the study_tasks table is missing.", true);
    return;
  }

  const course = sanitizeUserText(document.getElementById("task-course").value, 80);
  const title = sanitizeUserText(document.getElementById("task-title").value, 140);
  const deadline = document.getElementById("task-deadline").value || null;
  const progress = clampNumber(Number(document.getElementById("task-progress").value), 0, 100);

  if (!course || !title) {
    setStatus(el.pairStatus, "Course and task title are required.", true);
    return;
  }

  const { error } = await supabase.from("study_tasks").insert({
    user_id: state.user.id,
    course,
    title,
    target_date: deadline,
    progress,
  });

  if (error) {
    if (isMissingTableError(error, "study_tasks")) {
      state.studyTasksAvailable = false;
      state.data.tasks = [];
      renderTasks([]);
      renderHomeDashboard();
      updateNavProgress();
      setStatus(el.pairStatus, "Study tasks table is not available in this project.", true);
      return;
    }
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

  if (!state.studyTasksAvailable) {
    setStatus(el.pairStatus, "Study tasks are disabled because the study_tasks table is missing.", true);
    return;
  }

  const progress = clampNumber(Number(input.value), 0, 100);
  const { error } = await supabase
    .from("study_tasks")
    .update({ progress })
    .eq("id", input.dataset.taskId)
    .eq("user_id", state.user.id);

  if (error) {
    if (isMissingTableError(error, "study_tasks")) {
      state.studyTasksAvailable = false;
      state.data.tasks = [];
      renderTasks([]);
      renderHomeDashboard();
      updateNavProgress();
      setStatus(el.pairStatus, "Study tasks table is not available in this project.", true);
      return;
    }
    setStatus(el.pairStatus, error.message, true);
    return;
  }

  await refreshTasks();
}

async function fetchTasks() {
  if (!state.studyTasksAvailable) {
    return [];
  }

  const allowedIds = getAllowedUserIds();
  const { data, error } = await supabase
    .from("study_tasks")
    .select("id, user_id, course, title, target_date, progress, created_at")
    .in("user_id", allowedIds)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingTableError(error, "study_tasks")) {
      state.studyTasksAvailable = false;
      return [];
    }
    throw error;
  }

  return data || [];
}

function renderTasks(tasks) {
  if (!el.myTasks || !el.partnerTasks) {
    return;
  }

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

  const course = sanitizeUserText(el.milestoneCourse.value, 80);
  const title = sanitizeUserText(document.getElementById("milestone-title").value, 140);
  const targetDate = document.getElementById("milestone-deadline").value;
  const progress = clampNumber(Number(document.getElementById("milestone-progress").value), 0, 100);

  if (!course || !title) {
    setStatus(el.pairStatus, "Course and milestone title are required.", true);
    return;
  }

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
  if (!el.myMilestones) {
    return;
  }
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

  const finalBody = buildOutgoingMessageBody(text);

  el.chatInput.value = "";
  sendChatSignal("typing", { isTyping: false });

  const optimisticMessage = {
    id: `temp-${Date.now()}`,
    sender_id: state.user.id,
    receiver_id: state.partner.id,
    body: finalBody,
    created_at: new Date().toISOString(),
  };
  state.data.messages = [...state.data.messages, optimisticMessage];
  renderMessages(state.data.messages, { forceBottom: true });

  const { data, error } = await sendChatMessageToDb(finalBody);

  if (error) {
    setStatus(el.pairStatus, "Message failed to send. Please retry.", true);
    await refreshMessages();
    return;
  }

  if (data) {
    handleRealtimeMessageInsert(data);
  } else {
    await refreshMessages();
  }
  if (!document.getElementById("chat-tab")?.classList.contains("hidden")) {
    markChatAsRead();
  }
  clearReplyTarget();
}

async function fetchMessages() {
  if (!state.partner?.id) {
    return [];
  }

  const me = state.user.id;
  const partner = state.partner.id;
  const conversationFilter = `and(sender_id.eq.${me},receiver_id.eq.${partner}),and(sender_id.eq.${partner},receiver_id.eq.${me})`;

  const selectColumns = state.chatSeenColumnsAvailable
    ? "id, sender_id, receiver_id, body, created_at, delivered_at, seen_at"
    : "id, sender_id, receiver_id, body, created_at";

  let { data, error } = await supabase
    .from("chat_messages")
    .select(selectColumns)
    .or(conversationFilter)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error && isMissingChatSeenColumnsError(error)) {
    state.chatSeenColumnsAvailable = false;
    const retry = await supabase
      .from("chat_messages")
      .select("id, sender_id, receiver_id, body, created_at")
      .or(conversationFilter)
      .order("created_at", { ascending: true })
      .limit(200);
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    // Fallback path when OR filter parsing/realtime backend behaves inconsistently.
    const [sent, received] = await Promise.all([
      supabase
        .from("chat_messages")
        .select("id, sender_id, receiver_id, body, created_at")
        .eq("sender_id", me)
        .eq("receiver_id", partner)
        .order("created_at", { ascending: true })
        .limit(200),
      supabase
        .from("chat_messages")
        .select("id, sender_id, receiver_id, body, created_at")
        .eq("sender_id", partner)
        .eq("receiver_id", me)
        .order("created_at", { ascending: true })
        .limit(200),
    ]);

    if (!sent.error && !received.error) {
      const merged = [...(sent.data || []), ...(received.data || [])]
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const uniqueById = new Map();
      merged.forEach((row) => {
        uniqueById.set(String(row.id), row);
      });
      return Array.from(uniqueById.values()).slice(-200);
    }
  }

  if (error) {
    throw error;
  }

  return data || [];
}

function renderMessages(messages, options = {}) {
  const forceBottom = Boolean(options.forceBottom);
  const wasNearBottom = isChatNearBottom();

  const partnerPresenceTooltip = getPartnerPresenceTooltip();
  const partnerAvatar = state.partner?.avatar_url || avatarFallback(state.partner?.username || "Partner");
  const partnerAvatarPresenceClass = state.partnerOnline ? "online" : "offline";
  const typingMarkup = state.partnerTyping
    ? `
      <div class="chat-row theirs typing-row">
        <div class="chat-avatar-wrap ${partnerAvatarPresenceClass}" title="${escapeHtml(partnerPresenceTooltip)}">
          <img class="chat-avatar" src="${escapeHtml(partnerAvatar)}" alt="${escapeHtml(state.partner?.full_name || state.partner?.username || "Partner")}" />
          <span class="presence-dot" aria-hidden="true"></span>
        </div>
        <div class="chat-bubble typing-bubble">
          <p class="chat-text chat-text-typing">typing</p>
          <div class="typing-double-mark" aria-hidden="true">✓✓</div>
        </div>
      </div>
    `
    : "";

  if (!messages.length) {
    el.chatBox.innerHTML = typingMarkup || "<p class='status'>No messages yet.</p>";
    return;
  }

  el.chatBox.innerHTML = messages
    .map((msg) => {
      const mine = msg.sender_id === state.user?.id;
      const rowClass = mine ? "chat-row mine" : "chat-row theirs";
      const senderName = mine
        ? state.profile?.full_name || state.profile?.username || "You"
        : state.partner?.full_name || state.partner?.username || "Partner";
      const avatar = mine
        ? state.profile?.avatar_url || avatarFallback(state.profile?.username || "You")
        : state.partner?.avatar_url || avatarFallback(state.partner?.username || "Partner");
      const avatarPresenceClass = mine ? "online" : state.partnerOnline ? "online" : "offline";
      const deliveryState = mine ? ownMessageDelivery(msg) : "";
      const delivery = mine ? chatDeliveryMarkup(deliveryState) : "";
      const parsed = parseMessageBody(msg.body);
      const replyMarkup = parsed.reply ? `<p class="chat-reply-quote">${escapeHtml(parsed.reply)}</p>` : "";

      const avatarMarkup = `
        <div class="chat-avatar-wrap ${avatarPresenceClass}" title="${escapeHtml(
          mine ? "Online" : partnerPresenceTooltip,
        )}">
          <img class="chat-avatar" src="${escapeHtml(avatar)}" alt="${escapeHtml(senderName)}" />
          <span class="presence-dot" aria-hidden="true"></span>
        </div>
      `;

      return `
        <div class="${rowClass}">
          ${mine ? "" : avatarMarkup}
          <div class="chat-bubble">
            ${replyMarkup}
            <p class="chat-text">${escapeHtml(parsed.main)}</p>
            ${delivery}
            <div class="chat-actions">
              <button class="chat-reply-btn" type="button" data-reply-id="${escapeHtml(String(msg.id))}" data-reply-body="${escapeHtml(parsed.main)}">Reply</button>
            </div>
          </div>
          ${mine ? avatarMarkup : ""}
        </div>
      `;
    })
    .join("") + typingMarkup;

  if (forceBottom || wasNearBottom) {
    el.chatBox.scrollTop = el.chatBox.scrollHeight;
  }
}

function isChatNearBottom() {
  if (!el.chatBox) {
    return true;
  }
  const threshold = 42;
  const distance = el.chatBox.scrollHeight - el.chatBox.scrollTop - el.chatBox.clientHeight;
  return distance <= threshold;
}

function getPartnerPresenceTooltip() {
  if (state.partnerOnline) {
    return "Online";
  }

  if (!state.partnerLastSeenAt) {
    return "Offline";
  }

  const diffMs = Date.now() - state.partnerLastSeenAt;
  const diffSec = Math.max(1, Math.floor(diffMs / 1000));
  if (diffSec < 60) {
    return "Last seen just now";
  }

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `Last seen ${diffMin}m ago`;
  }

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) {
    return `Last seen ${diffHour}h ago`;
  }

  const diffDay = Math.floor(diffHour / 24);
  return `Last seen ${diffDay}d ago`;
}

function ownMessageDelivery(message) {
  if (!message?.created_at) {
    return "sent";
  }

  if (message.seen_at) {
    return "received";
  }

  if (state.partnerReadAt && new Date(message.created_at).getTime() <= state.partnerReadAt) {
    return "received";
  }

  return "sent";
}

function chatDeliveryMarkup(stateValue) {
  if (!stateValue) {
    return "";
  }

  if (stateValue === "received") {
    return `<div class="chat-delivery received">✓✓</div>`;
  }

  return `<div class="chat-delivery sent">✓</div>`;
}

async function fetchQuestionAttempts() {
  try {
    const allowedIds = getAllowedUserIds();
    const { data, error } = await supabase
      .from("question_attempts")
      .select("id, user_id, score_percent, created_at")
      .in("user_id", allowedIds)
      .order("created_at", { ascending: false })
      .limit(300);

    if (error) {
      return [];
    }

    return data || [];
  } catch (_error) {
    return [];
  }
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
  if (state.realtimeDisabled) {
    return;
  }

  const handleChannelStatus = (name) => (status) => {
    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      console.warn(`Realtime channel failed (${name}: ${status}). Falling back without realtime.`);
      state.realtimeDisabled = true;
      clearRealtimeChannels();
    }
  };

  const tables = [{ name: "questions", fn: refreshQuestions }];

  if (state.studyTasksAvailable) {
    tables.push({ name: "study_tasks", fn: refreshTasks });
  }

  state.channels = tables.map((entry) => {
    return supabase
      .channel(`${entry.name}-realtime`)
      .on("postgres_changes", { event: "*", schema: "public", table: entry.name }, entry.fn)
      .subscribe(handleChannelStatus(`${entry.name}-realtime`));
  });

  if (state.user?.id && state.partner?.id) {
    const isConversationMessage = (row) => {
      if (!row || !state.user?.id || !state.partner?.id) {
        return false;
      }
      const me = state.user.id;
      const partner = state.partner.id;
      return (
        (row.sender_id === me && row.receiver_id === partner) ||
        (row.sender_id === partner && row.receiver_id === me)
      );
    };

    const chatInsertChannel = supabase
      .channel("chat-messages-insert-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        ({ new: newRow }) => {
          if (!isConversationMessage(newRow)) {
            return;
          }
          handleRealtimeMessageInsert(newRow);
        },
      )
      .subscribe(handleChannelStatus("chat-messages-insert-realtime"));

    const chatFallbackChannel = supabase
      .channel("chat-messages-fallback-realtime")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_messages" }, refreshMessages)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "chat_messages" }, refreshMessages)
      .subscribe(handleChannelStatus("chat-messages-fallback-realtime"));

    state.channels.push(chatInsertChannel, chatFallbackChannel);
  }

  const chatSignalChannel = supabase
    .channel(getChatSignalChannelName())
    .on("broadcast", { event: "typing" }, ({ payload }) => {
      if (!payload || payload.from !== state.partner?.id || payload.to !== state.user?.id) {
        return;
      }
      state.partnerTyping = Boolean(payload.isTyping);
      renderTypingIndicator();
    })
    .on("broadcast", { event: "read" }, ({ payload }) => {
      if (!payload || payload.from !== state.partner?.id || payload.to !== state.user?.id) {
        return;
      }
      const readAt = Date.parse(payload.readAt || "");
      if (Number.isNaN(readAt)) {
        return;
      }
      state.partnerReadAt = readAt;
      renderMessages(state.data.messages);
    })
    .on("broadcast", { event: "presence" }, ({ payload }) => {
      if (!payload || payload.from !== state.partner?.id || payload.to !== state.user?.id) {
        return;
      }
      state.partnerOnline = Boolean(payload.online);
      state.partnerLastSeenAt = Date.now();
      renderChatPresence();
    })
    .subscribe((status) => {
      state.chatSignalReady = status === "SUBSCRIBED";
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn(`Realtime channel failed (chat-signal: ${status}). Falling back without realtime.`);
        state.realtimeDisabled = true;
        clearRealtimeChannels();
      }
    });

  state.chatSignalChannel = chatSignalChannel;
  state.channels.push(chatSignalChannel);

  sendChatSignal("presence", { online: true });
  state.presenceHeartbeatTimer = window.setInterval(() => {
    if (state.user?.id && state.partner?.id) {
      sendChatSignal("presence", { online: true });
    }

    if (state.partnerOnline && Date.now() - state.partnerLastSeenAt > 12000) {
      state.partnerOnline = false;
      renderChatPresence();
    }
  }, 4000);
}

function clearRealtimeChannels() {
  window.clearInterval(state.presenceHeartbeatTimer);
  state.presenceHeartbeatTimer = null;
  state.channels.forEach((channel) => {
    supabase.removeChannel(channel);
  });
  state.channels = [];
  state.chatSignalChannel = null;
  state.chatSignalReady = false;
  state.partnerTyping = false;
  state.partnerOnline = false;
  renderTypingIndicator();
  renderChatPresence();
}

function stopChatAutoSync() {
  window.clearInterval(state.messagePollTimer);
  state.messagePollTimer = null;
  state.messagePollRunning = false;
}

function onChatInputTyping() {
  if (!state.partner?.id || !state.user?.id) {
    return;
  }

  const now = Date.now();
  if (now - state.typingLastSentAt > 1200) {
    sendChatSignal("typing", { isTyping: true });
    state.typingLastSentAt = now;
  }

  window.clearTimeout(state.typingStopTimer);
  state.typingStopTimer = window.setTimeout(() => {
    sendChatSignal("typing", { isTyping: false });
  }, 1300);
}

function emitReadReceipt() {
  if (!state.user?.id || !state.partner?.id) {
    return;
  }

  const chatVisible = !document.getElementById("chat-tab")?.classList.contains("hidden");
  if (!chatVisible) {
    return;
  }

  sendChatSignal("read", { readAt: new Date().toISOString() });
}

function sendChatSignal(eventName, payload) {
  if (!state.user?.id || !state.partner?.id || !state.chatSignalChannel || !state.chatSignalReady) {
    return;
  }

  state.chatSignalChannel.send({
    type: "broadcast",
    event: eventName,
    payload: {
      ...payload,
      from: state.user.id,
      to: state.partner.id,
    },
  });
}

function getChatSignalChannelName() {
  if (!state.user?.id || !state.partner?.id) {
    return "chat-signals";
  }

  const ids = [state.user.id, state.partner.id].sort();
  return `chat-signals-${ids[0]}-${ids[1]}`;
}

function renderTypingIndicator() {
  if (!el.chatPartnerTyping) {
    return;
  }

  // Keep legacy line hidden; typing motion now renders inside chat box.
  el.chatPartnerTyping.textContent = "";
  el.chatPartnerTyping.classList.add("hidden");
  renderMessages(state.data.messages);
}

function renderChatPresence() {
  if (!el.chatPartnerStatus || !el.chatPartnerPresence) {
    return;
  }

  if (!state.partner) {
    el.chatPartnerStatus.textContent = "";
    el.chatPartnerPresence.setAttribute("aria-label", "Partner offline");
    el.chatPartnerPresence.classList.add("offline");
    el.chatPartnerPresence.classList.remove("online");
    return;
  }

  if (state.partnerOnline) {
    el.chatPartnerStatus.textContent = "";
    el.chatPartnerPresence.setAttribute("aria-label", "Partner online");
    el.chatPartnerPresence.classList.remove("offline");
    el.chatPartnerPresence.classList.add("online");
  } else {
    el.chatPartnerStatus.textContent = "";
    el.chatPartnerPresence.setAttribute("aria-label", "Partner offline");
    el.chatPartnerPresence.classList.add("offline");
    el.chatPartnerPresence.classList.remove("online");
  }
}

function onOpenChatFromNotification() {
  openChatWithLoading();
}

async function openChatWithLoading() {
  showChatLoading(true);
  activateTab("chat-tab");
  await refreshMessages();
  showChatLoading(false);
}

function showChatLoading(isLoading) {
  if (!el.chatLoading) {
    return;
  }
  el.chatLoading.classList.toggle("hidden", !isLoading);
}

function parseMessageBody(body) {
  const text = String(body || "");
  const marker = "\n\n";
  if (!text.startsWith("REPLY:")) {
    return { reply: "", main: text };
  }

  const splitAt = text.indexOf(marker);
  if (splitAt < 0) {
    return { reply: "", main: text };
  }

  const reply = text.slice(6, splitAt).trim();
  const main = text.slice(splitAt + marker.length).trim();
  return { reply, main };
}

function buildOutgoingMessageBody(text) {
  if (!state.pendingReply?.body) {
    return text;
  }
  return `REPLY:${state.pendingReply.body}\n\n${text}`;
}

function onChatBoxClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const replyBtn = target.closest("[data-reply-id]");
  if (!(replyBtn instanceof HTMLButtonElement)) {
    return;
  }

  const replyId = replyBtn.dataset.replyId;
  const replyBody = replyBtn.dataset.replyBody;
  if (!replyId || !replyBody) {
    return;
  }

  setReplyTarget({ id: replyId, body: replyBody });
}

function setReplyTarget(reply) {
  state.pendingReply = reply;
  if (!el.chatReplyPreview || !el.chatReplyText) {
    return;
  }

  el.chatReplyText.textContent = reply.body;
  el.chatReplyPreview.classList.remove("hidden");
  el.chatInput?.focus();
}

function clearReplyTarget() {
  state.pendingReply = null;
  if (!el.chatReplyPreview || !el.chatReplyText) {
    return;
  }

  el.chatReplyText.textContent = "";
  el.chatReplyPreview.classList.add("hidden");
}

function startChatAutoSync() {
  stopChatAutoSync();
  state.messagePollRunning = false;
  state.messagePollTimer = window.setInterval(async () => {
    if (!state.user?.id || !state.partner?.id) {
      return;
    }

    if (state.messagePollRunning) {
      return;
    }

    state.messagePollRunning = true;
    try {
      await refreshMessages();
    } finally {
      state.messagePollRunning = false;
    }
  }, 800);

  const syncNow = () => {
    if (!state.user?.id || !state.partner?.id) {
      return;
    }
    refreshMessages();
  };

  if (!state.chatAutoSyncBound) {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        syncNow();
      }
    });
    window.addEventListener("focus", syncNow);
    window.addEventListener("online", syncNow);
    state.chatAutoSyncBound = true;
  }
}

function computeUnreadFromMessages(messages) {
  if (!state.user?.id) {
    return 0;
  }

  return messages.filter(
    (msg) =>
      msg.receiver_id === state.user.id &&
      msg.sender_id === state.partner?.id &&
      new Date(msg.created_at).getTime() > state.myReadAt,
  ).length;
}

async function sendChatMessageToDb(text) {
  const selectColumns = state.chatSeenColumnsAvailable
    ? "id, sender_id, receiver_id, body, created_at, delivered_at, seen_at"
    : "id, sender_id, receiver_id, body, created_at";

  let { data, error } = await supabase
    .from("chat_messages")
    .insert({
      sender_id: state.user.id,
      receiver_id: state.partner.id,
      body: text,
    })
    .select(selectColumns)
    .single();

  if (error && isMissingChatSeenColumnsError(error)) {
    state.chatSeenColumnsAvailable = false;
    const retry = await supabase
      .from("chat_messages")
      .insert({
        sender_id: state.user.id,
        receiver_id: state.partner.id,
        body: text,
      })
      .select("id, sender_id, receiver_id, body, created_at")
      .single();
    data = retry.data;
    error = retry.error;
  }

  return { data, error };
}

async function refreshUnreadCountFromDb() {
  if (!state.user?.id || !state.partner?.id) {
    state.unreadCount = 0;
    updateUnreadBadge();
    return;
  }

  let query = supabase
    .from("chat_messages")
    .select("id", { count: "exact", head: true })
    .eq("receiver_id", state.user.id)
    .eq("sender_id", state.partner.id);

  if (state.myReadAt > 0) {
    query = query.gt("created_at", new Date(state.myReadAt).toISOString());
  }

  const { count, error } = await query;
  if (error) {
    console.error(error);
    return;
  }

  state.unreadCount = Number(count || 0);
  updateUnreadBadge();
}

async function loadChatReadStateFromDb() {
  if (!state.user?.id || !state.partner?.id) {
    state.myReadAt = 0;
    return;
  }

  if (!state.chatReadStateEnabled) {
    state.myReadAt = Date.now();
    return;
  }

  const { data, error } = await supabase
    .from("chat_read_state")
    .select("last_read_at")
    .eq("user_id", state.user.id)
    .eq("partner_id", state.partner.id)
    .maybeSingle();

  if (error) {
    console.error(error);
    state.chatReadStateEnabled = false;
    state.myReadAt = Date.now();
    return;
  }

  if (!data?.last_read_at) {
    state.myReadAt = Date.now();
    await persistChatReadStateToDb();
    return;
  }

  const parsed = Date.parse(data.last_read_at);
  state.myReadAt = Number.isNaN(parsed) ? Date.now() : parsed;
}

async function persistChatReadStateToDb() {
  if (!state.chatReadStateEnabled || !state.user?.id || !state.partner?.id || !state.myReadAt) {
    return;
  }

  const { error } = await supabase.from("chat_read_state").upsert(
    {
      user_id: state.user.id,
      partner_id: state.partner.id,
      last_read_at: new Date(state.myReadAt).toISOString(),
    },
    { onConflict: "user_id,partner_id" },
  );

  if (error) {
    console.error(error);
    state.chatReadStateEnabled = false;
  }
}

function markChatAsRead() {
  const now = Date.now();
  if (state.myReadAt && now - state.myReadAt < 1000) {
    state.unreadCount = 0;
    updateUnreadBadge();
    persistSeenReceipts();
    return;
  }

  state.myReadAt = now;
  state.unreadCount = 0;
  updateUnreadBadge();
  persistChatReadStateToDb();
  persistSeenReceipts();
}

async function persistSeenReceipts() {
  if (!state.user?.id || !state.partner?.id || !state.chatSeenColumnsAvailable) {
    return;
  }

  const seenAt = new Date().toISOString();
  const { error } = await supabase
    .from("chat_messages")
    .update({ seen_at: seenAt })
    .eq("receiver_id", state.user.id)
    .eq("sender_id", state.partner.id)
    .is("seen_at", null);

  if (error) {
    if (isMissingChatSeenColumnsError(error)) {
      state.chatSeenColumnsAvailable = false;
      return;
    }
    console.error(error);
  }
}

function isMissingChatSeenColumnsError(error) {
  if (!error) {
    return false;
  }
  const code = String(error.code || "");
  const message = String(error.message || "").toLowerCase();
  if (code !== "42703") {
    return false;
  }
  return message.includes("delivered_at") || message.includes("seen_at");
}

function isMissingTableError(error, tableName) {
  if (!error || !tableName) {
    return false;
  }

  const code = String(error.code || "").toUpperCase();
  const message = String(error.message || "").toLowerCase();
  const table = String(tableName || "").toLowerCase();
  const qualified = `public.${table}`;

  if (code !== "PGRST205") {
    return false;
  }

  return message.includes("could not find the table") && (message.includes(qualified) || message.includes(table));
}

function updateUnreadBadge() {
  if (!el.chatUnreadBadge) {
    return;
  }

  const count = Math.max(0, state.unreadCount);
  if (!count) {
    el.chatUnreadBadge.classList.add("hidden");
    return;
  }

  el.chatUnreadBadge.textContent = count > 99 ? "99+" : String(count);
  el.chatUnreadBadge.classList.remove("hidden");
}

function updateUnreadFromMessages(messages) {
  const chatVisible = !document.getElementById("chat-tab")?.classList.contains("hidden");
  if (chatVisible) {
    if (state.unreadCount > 0) {
      markChatAsRead();
      emitReadReceipt();
    }
    return;
  }

  state.unreadCount = computeUnreadFromMessages(messages);
  updateUnreadBadge();
}

function handleRealtimeMessageInsert(newMessage) {
  if (!newMessage || !newMessage.id) {
    return;
  }

  const optimisticIndex = state.data.messages.findIndex(
    (msg) =>
      String(msg.id || "").startsWith("temp-") &&
      msg.sender_id === newMessage.sender_id &&
      msg.receiver_id === newMessage.receiver_id &&
      msg.body === newMessage.body,
  );

  if (optimisticIndex >= 0) {
    state.data.messages.splice(optimisticIndex, 1);
  }

  const exists = state.data.messages.some((msg) => String(msg.id) === String(newMessage.id));
  if (!exists) {
    state.data.messages = [...state.data.messages, newMessage].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }

  const chatVisible = !document.getElementById("chat-tab")?.classList.contains("hidden");
  const isIncomingForMe =
    newMessage.receiver_id === state.user?.id &&
    newMessage.sender_id === state.partner?.id;

  if (chatVisible) {
    markChatAsRead();
    emitReadReceipt();
  } else if (isIncomingForMe) {
    state.unreadCount += 1;
    updateUnreadBadge();
    refreshUnreadCountFromDb();
  }

  renderMessages(state.data.messages, { forceBottom: !isIncomingForMe || isChatNearBottom() });
}

async function refreshTasks() {
  try {
    const tasks = await fetchTasks();
    state.data.tasks = tasks;
    await refreshHomeMetrics();
    renderTasks(tasks);
    renderHomeDashboard();
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
    renderHomeDashboard();
    updateNavProgress();
  } catch (error) {
    console.error(error);
  }
}

async function refreshMessages() {
  try {
    const messages = await fetchMessages();
    state.data.messages = messages;

    updateUnreadFromMessages(messages);
    if (state.user?.id && state.partner?.id) {
      refreshUnreadCountFromDb();
    }
    renderMessages(messages);
  } catch (error) {
    console.error(error);
  }
}

async function refreshQuestions() {
  try {
    metricsCache.at = 0;
    metricsCache.data = null;
    await refreshHomeMetrics();
    renderHomeDashboard();
    updateNavProgress();
  } catch (error) {
    console.error(error);
  }
}

async function refreshHomeMetrics() {
  if (!state.user?.id) {
    state.metrics = {
      totalQuestions: 0,
      totalCourses: 0,
      liveQuestions: 0,
      liveCourses: 0,
    };
    return;
  }

  if (metricsCache.data && Date.now() - metricsCache.at < METRICS_CACHE_TTL_MS) {
    state.metrics = { ...metricsCache.data };
    return;
  }

  try {
    const allowedIds = getAllowedUserIds();

    const [questionsResult, coursesResult] = await Promise.all([
      supabase
        .from("questions")
        .select("id", { count: "exact", head: true })
        .in("user_id", allowedIds),
      supabase
        .from("courses")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
    ]);

    const totalQuestions = Number(questionsResult.count || 0);
    const totalCourses = Number(coursesResult.count || 0);

    state.metrics = {
      totalQuestions,
      totalCourses,
      liveQuestions: totalQuestions,
      liveCourses: totalCourses,
    };
    metricsCache.data = { ...state.metrics };
    metricsCache.at = Date.now();
  } catch (error) {
    console.error(error);
    const fallbackQuestions = state.data.questions.length;
    const fallbackCourses = new Set(
      [
        ...state.data.tasks.map((row) => row.course),
        ...state.data.weeklyTargets.map((row) => row.course),
        ...state.data.questions.map((row) => row.course),
      ].filter(Boolean),
    ).size;
    state.metrics = {
      totalQuestions: fallbackQuestions,
      totalCourses: fallbackCourses,
      liveQuestions: fallbackQuestions,
      liveCourses: fallbackCourses,
    };
    metricsCache.data = { ...state.metrics };
    metricsCache.at = Date.now();
  }
}

function renderHomeDashboard() {
  const totalQuestions = Number(state.metrics.totalQuestions || 0);
  const totalCourses = Number(state.metrics.totalCourses || 0);
  const liveQuestions = Number(state.metrics.liveQuestions || totalQuestions);
  const liveCourses = Number(state.metrics.liveCourses || totalCourses);

  const myProgress = progressBreakdownForUser(state.user?.id);
  const progress = myProgress.total;
  const partnerProgress = state.partner ? progressForUser(state.partner.id) : 0;
  const trend = combinedCompletionTrend();
  const countdown = getExamCountdown();

  if (el.totalQuestionsFeature) {
    el.totalQuestionsFeature.textContent = String(totalQuestions);
  }
  if (el.totalCoursesFeature) {
    el.totalCoursesFeature.textContent = String(totalCourses);
  }
  if (el.partnerProgressFeature) {
    el.partnerProgressFeature.textContent = `${partnerProgress}%`;
  }
  if (el.homePartnerName) {
    el.homePartnerName.textContent = state.partner?.full_name || state.partner?.username || "Not linked yet";
  }
  if (el.homePartnerAvatar) {
    const seed = state.partner?.username || "Partner";
    el.homePartnerAvatar.src = state.partner?.avatar_url || avatarFallback(seed);
  }

  // Update overall progress bar in Home tab
  if (document.getElementById("overallProgressFill")) {
    document.getElementById("overallProgressFill").style.width = `${progress}%`;
  }
  if (document.getElementById("overallProgressLabel")) {
    document.getElementById("overallProgressLabel").textContent = `${progress}%`;
  }
  renderWeeklyContributionStrip();

  if (el.examCountdownDays) {
    el.examCountdownDays.textContent = String(countdown.daysLeft);
  }
  if (el.examCountdownDate) {
    el.examCountdownDate.textContent = "";
  }

  if (el.homeQuestionsStat) {
    el.homeQuestionsStat.textContent = String(liveQuestions);
  }
  if (el.homeCoursesStat) {
    el.homeCoursesStat.textContent = String(liveCourses);
  }
  if (el.homeProgressStat) {
    el.homeProgressStat.textContent = `${progress}%`;
  }
  if (el.homePartnerProgressStat) {
    el.homePartnerProgressStat.textContent = `${partnerProgress}%`;
  }
  if (el.homeTrendStat) {
    const sign = trend > 0 ? "+" : "";
    el.homeTrendStat.textContent = `${sign}${trend}%`;
  }
}

function openLearningChoiceModal() {
  if (!el.learningChoiceModal) {
    return;
  }
  el.learningChoiceModal.classList.remove("hidden");
  el.learningChoiceModal.setAttribute("aria-hidden", "false");
}

function closeLearningChoiceModal() {
  if (!el.learningChoiceModal) {
    return;
  }
  el.learningChoiceModal.classList.add("hidden");
  el.learningChoiceModal.setAttribute("aria-hidden", "true");
}

function updateNavProgress() {
  if (!state.user) {
    if (el.navProgressFill) {
      el.navProgressFill.style.width = "0%";
    }
    if (el.navProgressLabel) {
      el.navProgressLabel.textContent = "Your progress: 0%";
    }
    return;
  }

  const overall = currentOverallProgress();

  if (el.navProgressFill) {
    el.navProgressFill.style.width = `${overall}%`;
  }
  if (el.navProgressLabel) {
    el.navProgressLabel.textContent = `Your progress: ${overall}%`;
  }
}

function currentOverallProgress() {
  if (!state.user) {
    return 0;
  }

  return progressForUser(state.user.id);
}

function progressForUser(userId) {
  return progressBreakdownForUser(userId).total;
}

function progressBreakdownForUser(userId) {
  if (!userId) {
    return {
      total: 0,
      detailLine: "",
      tooltip: "",
    };
  }

  const myTasks = state.data.tasks.filter((row) => row.user_id === userId);
  const myMilestones = state.data.milestones.filter((row) => row.user_id === userId);
  const myAttempts = state.data.questionAttempts.filter((row) => row.user_id === userId);

  const taskAvg = myTasks.length ? averageProgress(myTasks) : 0;
  const milestoneAvg = myMilestones.length ? averageProgress(myMilestones) : 0;
  const attemptAvg = myAttempts.length
    ? Math.round(myAttempts.reduce((sum, row) => sum + clampNumber(Number(row.score_percent || 0), 0, 100), 0) / myAttempts.length)
    : 0;

  const activityCount = myTasks.length + myMilestones.length + myAttempts.length;
  const activityScore = clampNumber(activityCount * 4, 0, 100);

  const smartScore =
    (taskAvg * 0.45) +
    (milestoneAvg * 0.2) +
    (attemptAvg * 0.25) +
    (activityScore * 0.1);

  const total = clampNumber(Math.round(smartScore), 0, 100);
  const weightedTask = Math.round(taskAvg * 0.45);
  const weightedMilestone = Math.round(milestoneAvg * 0.2);
  const weightedExam = Math.round(attemptAvg * 0.25);
  const weightedConsistency = Math.round(activityScore * 0.1);

  const detailLine = `Task ${weightedTask} | Milestone ${weightedMilestone} | Exam ${weightedExam} | Consistency ${weightedConsistency}`;
  const tooltip = `Progress detail\nTask average: ${taskAvg}% (${myTasks.length} items)\nMilestone average: ${milestoneAvg}% (${myMilestones.length} items)\nExam attempts: ${attemptAvg}% (${myAttempts.length} attempts)\nConsistency score: ${activityScore}% (activity count: ${activityCount})`;

  return {
    total,
    detailLine,
    tooltip,
  };
}

function renderWeeklyContributionStrip() {
  if (!el.weeklyContributionGrid) {
    return;
  }

  const meId = state.user?.id;
  if (!meId) {
    el.weeklyContributionGrid.innerHTML = "";
    if (el.weeklyContributionSummary) {
      el.weeklyContributionSummary.textContent = "";
    }
    return;
  }

  const weeks = 16;
  const today = new Date();
  const todayKey = isoDate(today);
  const startMonday = addDays(mondayOf(today), -((weeks - 1) * 7));
  const dayMap = new Map();

  for (let dayOffset = 0; dayOffset < weeks * 7; dayOffset += 1) {
    const key = isoDate(addDays(startMonday, dayOffset));
    dayMap.set(key, 0);
  }

  const orderedDays = Array.from(dayMap.keys());
  const pastAndToday = orderedDays.filter((dayIso) => dayIso <= todayKey);
  const progressPercent = clampNumber(Math.round(progressForUser(meId)), 0, 100);
  const filledSquares = clampNumber(progressPercent, 0, Math.min(100, pastAndToday.length));
  const filledDays = new Set(pastAndToday.slice(0, filledSquares));

  const cells = orderedDays.map((dayIso) => {
    const isFilled = filledDays.has(dayIso);
    const fillRank = isFilled ? (pastAndToday.indexOf(dayIso) + 1) : 0;
    const ratio = filledSquares > 0 ? fillRank / filledSquares : 0;
    const level = !isFilled
      ? 0
      : ratio >= 0.85
        ? 4
        : ratio >= 0.6
          ? 3
          : ratio >= 0.35
            ? 2
            : 1;
    const isToday = dayIso === todayKey;
    const isFuture = dayIso > todayKey;

    const weekday = new Date(`${dayIso}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" });
    const label = `${weekday} ${shortDate(dayIso)}: ${isFilled ? "filled" : "empty"}`;
    return `<span class="gh-cell level-${level} ${isToday ? "today" : ""} ${isFuture ? "future" : ""}" aria-label="${label}" title="${label}"></span>`;
  }).join("");

  el.weeklyContributionGrid.innerHTML = `
    <div class="gh-contrib-shell" role="img" aria-label="Contribution heatmap for the last ${weeks} weeks">
      <div class="gh-grid-wrap">
        <div class="gh-grid">${cells}</div>
      </div>
    </div>
  `;
  if (el.weeklyContributionSummary) {
    el.weeklyContributionSummary.textContent = "";
  }
}

function addDays(baseDate, offsetDays) {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + offsetDays);
  return date;
}

function initExamCountdown() {
  const tick = () => {
    const data = getExamCountdown();
    if (el.examCountdownDays) {
      el.examCountdownDays.textContent = String(data.daysLeft);
    }
    if (el.examCountdownDate) {
      el.examCountdownDate.textContent = "";
    }
  };

  tick();
  window.setInterval(tick, 60 * 1000);
}

function getExamCountdown() {
  const monthIndex = {
    meskerem: 1,
    tikimt: 2,
    hidar: 3,
    tahsas: 4,
    tir: 5,
    yekatit: 6,
    megabit: 7,
    miazia: 8,
    ginbot: 9,
    sene: 10,
    hamle: 11,
    nehase: 12,
    pagume: 13,
  };

  // User-provided Ethiopian dates (fixed):
  // Today: Megabit 13/2018, Exam: Ginbot 08/2018.
  // Assumption requested: all Ethiopian months are 30 days.
  const todayEt = { year: 2018, month: "megabit", day: 13 };
  const examEt = { year: 2018, month: "ginbot", day: 8 };

  const toAbsoluteDays = (et) => {
    const month = monthIndex[String(et.month || "").toLowerCase()] || 1;
    const year = Number(et.year || 0);
    const day = clampNumber(Number(et.day || 1), 1, 30);
    return (year * 13 * 30) + ((month - 1) * 30) + (day - 1);
  };

  const daysLeft = clampNumber(toAbsoluteDays(examEt) - toAbsoluteDays(todayEt), 0, 3650);

  return {
    daysLeft,
    targetDateLabel: "Ginbot 08/2018",
  };
}

function combinedCompletionTrend() {
  const map = new Map();

  state.data.tasks.forEach((row) => {
    const week = isoDate(mondayOf(new Date(row.created_at)));
    if (!map.has(week)) {
      map.set(week, []);
    }
    map.get(week).push(clampNumber(Number(row.progress || 0), 0, 100));
  });

  const rankedWeeks = Array.from(map.keys()).sort();
  if (rankedWeeks.length < 2) {
    return 0;
  }

  const latest = rankedWeeks[rankedWeeks.length - 1];
  const previous = rankedWeeks[rankedWeeks.length - 2];
  const latestAvg = averageOfList(map.get(latest));
  const previousAvg = averageOfList(map.get(previous));
  return latestAvg - previousAvg;
}

function averageOfList(list) {
  if (!list?.length) {
    return 0;
  }
  return Math.round(list.reduce((sum, value) => sum + value, 0) / list.length);
}

function syncChatSelfAvatar() {
  if (!el.chatSelfAvatar) {
    return;
  }

  const avatar = state.profile?.avatar_url || avatarFallback(state.profile?.username || "User");
  el.chatSelfAvatar.src = avatar;
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

function sanitizeUserText(value, maxLen = 800) {
  return String(value || "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
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
      if (!key) {
        continue;
      }

      const lowerKey = key.toLowerCase();
      const isSupabaseKey = lowerKey.includes("supabase");
      const isSbAuthTokenKey = lowerKey.startsWith("sb-") && lowerKey.includes("auth-token");
      if (isSupabaseKey || isSbAuthTokenKey) {
        keys.push(key);
      }
    }
    keys.forEach((key) => store.removeItem(key));
  });
}
