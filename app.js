import { supabase } from "./supabaseClient.js";
import { APP_NAME, AVATAR_BUCKET } from "./config.js";

const USERNAME_LOGIN_DOMAIN = "exit.local";
const EXAM_START_GREGORIAN = new Date("2026-05-16T00:00:00");

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
  lastAppliedPlan: null,
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
  channels: [],
  metrics: {
    totalQuestions: 0,
    totalCourses: 0,
    myWeeklyTargets: 0,
    liveQuestions: 0,
    liveCourses: 0,
  },
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
  examCountdownLabel: document.getElementById("exam-countdown-label"),
  examCountdownSub: document.getElementById("exam-countdown-sub"),
  chatNotifyBtn: document.getElementById("chat-notify-btn"),
  chatUnreadBadge: document.getElementById("chat-unread-badge"),
  totalQuestionsFeature: document.getElementById("totalQuestionsFeature"),
  totalCoursesFeature: document.getElementById("totalCoursesFeature"),
  totalMilestonesFeature: document.getElementById("totalMilestonesFeature"),
  totalWeeklyFeature: document.getElementById("totalWeeklyFeature"),
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
  startBtn: document.getElementById("startBtn"),
  startLearningBtn: document.getElementById("start-learning-btn"),
  learningChoiceModal: document.getElementById("learning-choice-modal"),
  closeLearningChoiceBtn: document.getElementById("close-learning-choice-btn"),
  openQuestionBankBtn: document.getElementById("open-question-bank-btn"),
  openStudyMaterialsBtn: document.getElementById("open-study-materials-btn"),

  loginForm: document.getElementById("login-form"),
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

  summaryForm: document.getElementById("summary-form"),
  questionCourse: document.getElementById("question-course"),
  summaryList: document.getElementById("summary-list"),
  undoAiPlanBtn: document.getElementById("undo-ai-plan-btn"),

  manualPlannerBtn: document.getElementById("manual-planner-btn"),
  aiPlannerBtn: document.getElementById("ai-planner-btn"),
  closePlannerBtn: document.getElementById("close-planner-btn"),
  manualTaskBtn: document.getElementById("manual-task-btn"),
  manualMilestoneBtn: document.getElementById("manual-milestone-btn"),
  manualWeeklyBtn: document.getElementById("manual-weekly-btn"),
  quickPlannerForm: document.getElementById("quick-planner-form"),
  quickType: document.getElementById("quick-type"),
  quickCourse: document.getElementById("quick-course"),
  quickTitle: document.getElementById("quick-title"),
  quickDate: document.getElementById("quick-date"),
  quickProgress: document.getElementById("quick-progress"),
  quickHours: document.getElementById("quick-hours"),
  quickItems: document.getElementById("quick-items"),
  quickTitleWrap: document.getElementById("quick-title-wrap"),
  quickProgressWrap: document.getElementById("quick-progress-wrap"),
  quickHoursWrap: document.getElementById("quick-hours-wrap"),
  quickItemsWrap: document.getElementById("quick-items-wrap"),
  quickAiReviewPrompt: document.getElementById("quick-ai-review-prompt"),
  quickAiReviewBtn: document.getElementById("quick-ai-review-btn"),
  quickAiReviewOutput: document.getElementById("quick-ai-review-output"),
  taskFormWrap: document.getElementById("task-form-wrap"),
  milestoneFormWrap: document.getElementById("milestone-form-wrap"),
  weeklyFormWrap: document.getElementById("weekly-form-wrap"),
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
  clearLoginInputs();
  setupTabs();
  bindEvents();
  await fillCourseSelects();
  updateExamCountdown();
  window.setInterval(updateExamCountdown, 60000);
  updateQuickPlannerFields();
  setPlannerMode("manual");
  setManualForm("task");

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
  if (el.weeklyForm) {
    el.weeklyForm.addEventListener("submit", onCreateWeeklyTarget);
  }
  if (el.myMilestones) {
    el.myMilestones.addEventListener("change", onMilestoneProgressChange);
  }
  if (el.myWeekly) {
    el.myWeekly.addEventListener("change", onWeeklyCompletionChange);
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

  if (el.summaryForm) {
    el.summaryForm.addEventListener("submit", onSubmitQuestion);
  }
  if (el.summaryList) {
    el.summaryList.addEventListener("click", onSummaryListClick);
  }
  if (el.undoAiPlanBtn) {
    el.undoAiPlanBtn.addEventListener("click", onUndoLastAiPlan);
  }

  if (el.startBtn) {
    el.startBtn.addEventListener("click", () => {
      setPlannerMode("manual");
      setManualForm("task");
      activateTab("planner-tab");
    });
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

  if (el.closePlannerBtn) {
    el.closePlannerBtn.addEventListener("click", () => activateTab("home-tab"));
  }

  if (el.manualTaskBtn) {
    el.manualTaskBtn.addEventListener("click", () => setManualForm("task"));
  }
  if (el.manualMilestoneBtn) {
    el.manualMilestoneBtn.addEventListener("click", () => setManualForm("milestone"));
  }
  if (el.manualWeeklyBtn) {
    el.manualWeeklyBtn.addEventListener("click", () => setManualForm("weekly"));
  }

  if (el.quickType) {
    el.quickType.addEventListener("change", updateQuickPlannerFields);
  }
  if (el.quickPlannerForm) {
    el.quickPlannerForm.addEventListener("submit", onSubmitQuickPlanner);
  }
  if (el.quickAiReviewBtn) {
    el.quickAiReviewBtn.addEventListener("click", onQuickAiReview);
  }

  document.querySelectorAll("[data-reset-form]").forEach((button) => {
    button.addEventListener("click", onCancelPlannerForm);
  });

  if (el.manualPlannerBtn) {
    el.manualPlannerBtn.addEventListener("click", () => setPlannerMode("manual"));
  }
  if (el.aiPlannerBtn) {
    el.aiPlannerBtn.addEventListener("click", () => setPlannerMode("ai"));
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
  if (el.questionCourse) {
    el.questionCourse.innerHTML = options;
  }
}

async function fetchCourseNames() {
  try {
    const { data, error } = await supabase
      .from("courses")
      .select("name, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      return [...FULL_COURSE_LIST];
    }

    const fromDb = (data || []).map((row) => String(row.name || "").trim()).filter(Boolean);
    return fromDb.length ? fromDb : [...FULL_COURSE_LIST];
  } catch (_error) {
    return [...FULL_COURSE_LIST];
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

function setManualForm(formType) {
  if (!el.taskFormWrap && !el.milestoneFormWrap && !el.weeklyFormWrap) {
    return;
  }

  if (el.taskFormWrap) {
    el.taskFormWrap.classList.toggle("hidden", formType !== "task");
  }
  if (el.milestoneFormWrap) {
    el.milestoneFormWrap.classList.toggle("hidden", formType !== "milestone");
  }
  if (el.weeklyFormWrap) {
    el.weeklyFormWrap.classList.toggle("hidden", formType !== "weekly");
  }

  if (el.manualTaskBtn) {
    el.manualTaskBtn.classList.toggle("active", formType === "task");
  }
  if (el.manualMilestoneBtn) {
    el.manualMilestoneBtn.classList.toggle("active", formType === "milestone");
  }
  if (el.manualWeeklyBtn) {
    el.manualWeeklyBtn.classList.toggle("active", formType === "weekly");
  }
}

function updateExamCountdown() {
  if (!el.examCountdownLabel || !el.examCountdownSub) {
    return;
  }

  const today = new Date();
  const todayAtMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startAtMidnight = new Date(
    EXAM_START_GREGORIAN.getFullYear(),
    EXAM_START_GREGORIAN.getMonth(),
    EXAM_START_GREGORIAN.getDate()
  );

  const dayMs = 24 * 60 * 60 * 1000;
  const startDiff = Math.ceil((startAtMidnight.getTime() - todayAtMidnight.getTime()) / dayMs);

  let label = "0 Days Remaining";
  if (startDiff > 0) {
    label = `${startDiff} Days Remaining`;
  } else if (startDiff === 0) {
    label = "Exam Day";
  } else {
    label = "Exam Started";
  }

  el.examCountdownLabel.textContent = label;
  el.examCountdownSub.textContent = "";
  el.examCountdownSub.classList.add("hidden");
}

function updateQuickPlannerFields() {
  if (!el.quickType) {
    return;
  }

  const type = el.quickType.value;
  const isWeekly = type === "weekly";

  if (el.quickTitleWrap) {
    el.quickTitleWrap.classList.toggle("hidden", isWeekly);
  }
  if (el.quickProgressWrap) {
    el.quickProgressWrap.classList.toggle("hidden", type !== "task");
  }
  if (el.quickHoursWrap) {
    el.quickHoursWrap.classList.toggle("hidden", !isWeekly);
  }
  if (el.quickItemsWrap) {
    el.quickItemsWrap.classList.toggle("hidden", !isWeekly);
  }

  if (el.quickTitle) {
    el.quickTitle.required = !isWeekly;
  }
}

async function onSubmitQuickPlanner(event) {
  event.preventDefault();

  if (!state.user || !el.quickType || !el.quickCourse) {
    return;
  }

  const type = el.quickType.value;
  const course = el.quickCourse.value;

  if (!course) {
    setStatus(el.pairStatus, "Course is required.", true);
    return;
  }

  if (type === "task") {
    const title = (el.quickTitle?.value || "").trim();
    const targetDate = el.quickDate?.value || null;
    const progress = clampNumber(Number(el.quickProgress?.value || 0), 0, 100);

    if (!title) {
      setStatus(el.pairStatus, "Task title is required.", true);
      return;
    }

    const { error } = await supabase.from("study_tasks").insert({
      user_id: state.user.id,
      course,
      title,
      target_date: targetDate,
      progress,
    });

    if (error) {
      setStatus(el.pairStatus, error.message, true);
      return;
    }

    await refreshHomeMetrics();
    await refreshTasks();
    showThemedToast("Task saved.");
  }

  if (type === "weekly") {
    const weekStart = el.quickDate?.value || isoDate(mondayOf(new Date()));
    const targetHours = clampNumber(Number(el.quickHours?.value || 6), 1, 60);
    const targetItems = clampNumber(Number(el.quickItems?.value || 20), 1, 200);

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

    await refreshHomeMetrics();
    await refreshWeeklyTargets();
    showThemedToast("Weekly target saved.");
  }

  if (el.quickPlannerForm) {
    el.quickPlannerForm.reset();
  }
  if (el.quickProgress) {
    el.quickProgress.value = "0";
  }
  if (el.quickHours) {
    el.quickHours.value = "6";
  }
  if (el.quickItems) {
    el.quickItems.value = "20";
  }

  updateQuickPlannerFields();
  setStatus(el.pairStatus, "");
}

async function onQuickAiReview() {
  if (!state.user) {
    return;
  }

  const course = (el.quickCourse?.value || "").trim();
  const planType = (el.quickType?.value || "task").trim();
  const title = (el.quickTitle?.value || "").trim();
  const targetDate = (el.quickDate?.value || "").trim();
  const progress = (el.quickProgress?.value || "0").trim();
  const targetHours = (el.quickHours?.value || "6").trim();
  const targetItems = (el.quickItems?.value || "20").trim();
  const prompt = (el.quickAiReviewPrompt?.value || "").trim();

  if (!course) {
    setStatus(el.pairStatus, "Select a course before AI review.", true);
    return;
  }

  if (!prompt) {
    if (el.quickAiReviewOutput) {
      el.quickAiReviewOutput.textContent = "AI Review is optional. Add a prompt to get suggestions.";
    }
    return;
  }

  if (el.quickAiReviewBtn) {
    el.quickAiReviewBtn.disabled = true;
    el.quickAiReviewBtn.textContent = "Reviewing...";
  }
  if (el.quickAiReviewOutput) {
    el.quickAiReviewOutput.textContent = "Generating AI review...";
  }

  const planSummary = planType === "weekly"
    ? `Plan type: Weekly target. Course: ${course}. Week start: ${targetDate || "not set"}. Target hours: ${targetHours}. Target items: ${targetItems}.`
    : `Plan type: Task. Course: ${course}. Title: ${title || "untitled"}. Target date: ${targetDate || "not set"}. Progress: ${progress}%.`;

  const reviewPrompt = `${planSummary} User request: ${prompt}`;

  try {
    const { data, error } = await supabase
      .from("questions")
      .insert({
        user_id: state.user.id,
        course,
        question: reviewPrompt,
        status: "processing",
      })
      .select("id")
      .single();

    if (error || !data?.id) {
      throw new Error(error?.message || "Failed to create AI review job.");
    }

    await invokeSummary(data.id);

    let aiSummary = "";
    for (let i = 0; i < 8; i += 1) {
      await waitMs(900);
      const row = await fetchQuestionById(data.id);
      if (row?.ai_summary) {
        aiSummary = row.ai_summary;
        break;
      }
    }

    if (el.quickAiReviewOutput) {
      el.quickAiReviewOutput.textContent = aiSummary || "AI review started. Check Question Bank if it needs more time.";
    }
  } catch (error) {
    if (el.quickAiReviewOutput) {
      el.quickAiReviewOutput.textContent = `AI review failed: ${error.message}`;
    }
  } finally {
    if (el.quickAiReviewBtn) {
      el.quickAiReviewBtn.disabled = false;
      el.quickAiReviewBtn.textContent = "AI Review";
    }
  }
}

async function fetchQuestionById(questionId) {
  const { data, error } = await supabase
    .from("questions")
    .select("id, ai_summary, status")
    .eq("id", questionId)
    .maybeSingle();

  if (error) {
    return null;
  }
  return data || null;
}

function waitMs(duration) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, duration);
  });
}

async function handleSession(session) {
  clearRealtimeChannels();
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
    state.lastAppliedPlan = null;
    state.partnerTyping = false;
    state.partnerReadAt = null;
    state.myReadAt = 0;
    state.unreadCount = 0;
    state.partnerOnline = false;
    state.partnerLastSeenAt = 0;
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
    renderWeeklyTargets([]);
    renderMessages([]);
    updateUnreadBadge();
    renderChatPresence();
    renderQuestions([]);
    renderHomeDashboard();
    refreshUndoButtonState();
    updateNavProgress();
    setPlannerMode("manual");
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

  const [tasks, weeklyTargets, messages, questions] = await Promise.all([
    fetchTasks(),
    fetchWeeklyTargets(),
    fetchMessages(),
    fetchQuestions(),
  ]);

  state.data.tasks = tasks;
  state.data.milestones = [];
  state.data.weeklyTargets = weeklyTargets;
  state.data.messages = messages;
  state.data.questions = questions;

  await refreshHomeMetrics();

  renderTasks(tasks);
  renderWeeklyTargets(weeklyTargets);
  renderMessages(messages, { forceBottom: true });
  updateUnreadFromMessages(messages);
  renderQuestions(questions);
  renderHomeDashboard();
  refreshUndoButtonState();
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

function renderMessages(messages, options = {}) {
  const forceBottom = Boolean(options.forceBottom);
  const wasNearBottom = isChatNearBottom();

  if (!messages.length) {
    el.chatBox.innerHTML = "<p class='status'>No messages yet.</p>";
    return;
  }

  const partnerPresenceTooltip = getPartnerPresenceTooltip();

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
    .join("");

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
  const applyPlanId = button.dataset.applyPlan;

  if (applyPlanId) {
    await applyAiPlan(applyPlanId);
    return;
  }

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

async function applyAiPlan(questionId) {
  const row = state.data.questions.find((item) => String(item.id) === String(questionId));
  if (!row) {
    setStatus(el.pairStatus, "Selected AI result was not found.", true);
    return;
  }

  if (!row.ai_summary || !row.ai_summary.trim()) {
    setStatus(el.pairStatus, "Generate AI summary first, then apply it as a plan.", true);
    return;
  }

  const parsed = parseAiPlan(row.course, row.question, row.ai_summary, row.created_at);

  const milestoneCandidates = parsed.milestones.map((item) => ({
    user_id: state.user.id,
    course: item.course,
    title: item.title,
    target_date: item.target_date,
    progress: 0,
    status: "planned",
  }));

  const weeklyCandidates = parsed.weeklyTargets.map((item) => ({
    user_id: state.user.id,
    course: item.course,
    week_start: item.week_start,
    target_hours: item.target_hours,
    target_items: item.target_items,
    completion: 0,
  }));

  const existingMilestoneKeys = new Set(
    state.data.milestones
      .filter((item) => item.user_id === state.user.id)
      .map((item) => milestoneKey(item.course, item.title, item.target_date)),
  );

  const existingWeeklyKeys = new Set(
    state.data.weeklyTargets
      .filter((item) => item.user_id === state.user.id)
      .map((item) => weeklyKey(item.course, item.week_start, item.target_hours, item.target_items)),
  );

  const milestonePayload = [];
  const localMilestoneKeys = new Set();
  milestoneCandidates.forEach((item) => {
    const key = milestoneKey(item.course, item.title, item.target_date);
    if (!existingMilestoneKeys.has(key) && !localMilestoneKeys.has(key)) {
      milestonePayload.push(item);
      localMilestoneKeys.add(key);
    }
  });

  const weeklyPayload = [];
  const localWeeklyKeys = new Set();
  weeklyCandidates.forEach((item) => {
    const key = weeklyKey(item.course, item.week_start, item.target_hours, item.target_items);
    if (!existingWeeklyKeys.has(key) && !localWeeklyKeys.has(key)) {
      weeklyPayload.push(item);
      localWeeklyKeys.add(key);
    }
  });

  if (!milestonePayload.length && !weeklyPayload.length) {
    showThemedToast("This AI plan has already been applied. No duplicate items were added.");
    return;
  }

  let insertedMilestones = [];
  if (milestonePayload.length) {
    const { data, error } = await supabase.from("study_milestones").insert(milestonePayload).select("id");
    if (error) {
      setStatus(el.pairStatus, `Could not apply milestones: ${error.message}`, true);
      return;
    }
    insertedMilestones = data || [];
  }

  let insertedWeekly = [];
  if (weeklyPayload.length) {
    const { data, error } = await supabase.from("weekly_targets").insert(weeklyPayload).select("id");
    if (error) {
      if (insertedMilestones.length) {
        await supabase
          .from("study_milestones")
          .delete()
          .eq("user_id", state.user.id)
          .in(
            "id",
            insertedMilestones.map((item) => item.id),
          );
      }
      setStatus(el.pairStatus, `Could not apply weekly targets: ${error.message}`, true);
      return;
    }
    insertedWeekly = data || [];
  }

  state.lastAppliedPlan = {
    questionId: row.id,
    milestoneIds: insertedMilestones.map((item) => item.id),
    weeklyIds: insertedWeekly.map((item) => item.id),
  };

  await Promise.all([refreshMilestones(), refreshWeeklyTargets()]);
  setPlannerMode("manual");
  refreshUndoButtonState();
  showThemedToast(`AI plan applied: ${milestonePayload.length} milestones and ${weeklyPayload.length} weekly targets created.`);
}

async function onUndoLastAiPlan() {
  const undo = state.lastAppliedPlan;
  if (!undo) {
    showThemedToast("No recent AI plan apply to undo.");
    return;
  }

  if (undo.milestoneIds.length) {
    const { error } = await supabase
      .from("study_milestones")
      .delete()
      .eq("user_id", state.user.id)
      .in("id", undo.milestoneIds);

    if (error) {
      setStatus(el.pairStatus, `Could not undo milestones: ${error.message}`, true);
      return;
    }
  }

  if (undo.weeklyIds.length) {
    const { error } = await supabase
      .from("weekly_targets")
      .delete()
      .eq("user_id", state.user.id)
      .in("id", undo.weeklyIds);

    if (error) {
      setStatus(el.pairStatus, `Could not undo weekly targets: ${error.message}`, true);
      return;
    }
  }

  state.lastAppliedPlan = null;
  refreshUndoButtonState();
  await Promise.all([refreshMilestones(), refreshWeeklyTargets()]);
  showThemedToast("Last AI plan apply has been rolled back.");
}

function refreshUndoButtonState() {
  if (!el.undoAiPlanBtn) {
    return;
  }

  const hasUndo = Boolean(
    state.lastAppliedPlan && (state.lastAppliedPlan.milestoneIds.length || state.lastAppliedPlan.weeklyIds.length),
  );
  el.undoAiPlanBtn.disabled = !hasUndo;
}

function parseAiPlan(course, question, summaryText, anchorDateRaw) {
  const cleanCourse = (course || "General Course").trim();
  const anchorDate = anchorDateRaw ? new Date(anchorDateRaw) : new Date();
  const lines = String(summaryText || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*\d).\s]+/, "").trim())
    .filter((line) => line.length >= 8);

  const weekLines = lines.filter((line) => /week\s*\d+/i.test(line)).slice(0, 6);
  const milestoneLines = lines
    .filter((line) => /chapter|module|milestone|implement|practice|review|complete|finish|design|theory|project|algorithm/i.test(line))
    .slice(0, 6);

  const selectedMilestones = (milestoneLines.length ? milestoneLines : lines).slice(0, 4);
  const milestones = selectedMilestones.map((line, index) => ({
    course: cleanCourse,
    title: cropPlanText(line),
    target_date: addDaysIso(anchorDate, (index + 1) * 7),
  }));

  const weeklySource = weekLines.length ? weekLines : [question || "Core revision", "Practice and mock questions", "Weak-topic reinforcement", "Final revision"];
  const monday = mondayOf(anchorDate);
  const weeklyTargets = weeklySource.slice(0, 4).map((line, index) => {
    const hoursMatch = line.match(/(\d+)\s*(?:hours?|hrs?)/i);
    const itemsMatch = line.match(/(\d+)\s*(?:items?|questions?|problems?)/i);

    return {
      course: cleanCourse,
      week_start: addDaysIso(monday, index * 7),
      target_hours: clampNumber(Number(hoursMatch?.[1] || 6), 1, 60),
      target_items: clampNumber(Number(itemsMatch?.[1] || 20), 1, 200),
    };
  });

  return { milestones, weeklyTargets };
}

function cropPlanText(value) {
  const text = String(value || "").trim();
  if (text.length <= 140) {
    return text;
  }
  return `${text.slice(0, 137)}...`;
}

function addDaysIso(baseDate, dayCount) {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + dayCount);
  return isoDate(date);
}

function milestoneKey(course, title, targetDate) {
  return `${String(course || "").trim().toLowerCase()}|${String(title || "").trim().toLowerCase()}|${String(targetDate || "")}`;
}

function weeklyKey(course, weekStart, targetHours, targetItems) {
  return `${String(course || "").trim().toLowerCase()}|${String(weekStart || "")}|${Number(targetHours || 0)}|${Number(targetItems || 0)}`;
}

function onCancelPlannerForm(event) {
  const button = event.target;
  if (!(button instanceof HTMLElement)) {
    return;
  }

  const formId = button.dataset.resetForm;
  if (!formId) {
    return;
  }

  const form = document.getElementById(formId);
  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  form.reset();
  setStatus(el.pairStatus, "");
  if (el.quickAiReviewOutput) {
    el.quickAiReviewOutput.textContent = "";
  }
  activateTab("home-tab");
  showThemedToast("Planner form canceled and closed.");
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
  if (!el.summaryList) {
    return;
  }

  if (!rows.length) {
    el.summaryList.innerHTML = "";
    return;
  }

  el.summaryList.innerHTML = rows
    .map((row) => {
      const safeSummary = row.ai_summary ? escapeHtml(row.ai_summary) : "Summary not ready yet.";
      const scheduled = row.scheduled_for ? `Scheduled: ${escapeHtml(formatDateTime(row.scheduled_for))}` : "Immediate";
      const runButton = row.status === "scheduled" ? `<button data-run-question="${row.id}" class="ghost-btn" type="button">Run Now</button>` : "";
      const applyButton = row.ai_summary
        ? `<button data-apply-plan="${row.id}" class="primary-btn" type="button">Apply AI Plan</button>`
        : "";

      return `
        <li>
          <strong>${escapeHtml(row.course || "Course")}</strong> <small>(${escapeHtml(row.status || "unknown")})</small><br />
          <span>${escapeHtml(row.question || "")}</span><br />
          <small>${scheduled}</small>
          <p>${safeSummary}</p>
          ${runButton}
          ${applyButton}
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
    { name: "weekly_targets", fn: refreshWeeklyTargets },
    { name: "questions", fn: refreshQuestions },
  ];

  state.channels = tables.map((entry) => {
    return supabase
      .channel(`${entry.name}-realtime`)
      .on("postgres_changes", { event: "*", schema: "public", table: entry.name }, entry.fn)
      .subscribe();
  });

  if (state.user?.id && state.partner?.id) {
    const myToPartner = `sender_id=eq.${state.user.id},receiver_id=eq.${state.partner.id}`;
    const partnerToMe = `sender_id=eq.${state.partner.id},receiver_id=eq.${state.user.id}`;

    const chatInsertChannel = supabase
      .channel("chat-messages-insert-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: myToPartner },
        ({ new: newRow }) => handleRealtimeMessageInsert(newRow),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: partnerToMe },
        ({ new: newRow }) => handleRealtimeMessageInsert(newRow),
      )
      .subscribe();

    const chatFallbackChannel = supabase
      .channel("chat-messages-fallback-realtime")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_messages" }, refreshMessages)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "chat_messages" }, refreshMessages)
      .subscribe();

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
    .subscribe();

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
  window.clearInterval(state.messagePollTimer);
  state.messagePollTimer = null;
  state.messagePollRunning = false;
  window.clearInterval(state.presenceHeartbeatTimer);
  state.presenceHeartbeatTimer = null;
  state.channels.forEach((channel) => {
    supabase.removeChannel(channel);
  });
  state.channels = [];
  state.chatSignalChannel = null;
  state.partnerTyping = false;
  state.partnerOnline = false;
  renderTypingIndicator();
  renderChatPresence();
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
  if (!state.user?.id || !state.partner?.id || !state.chatSignalChannel) {
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

  const partnerName = state.partner?.full_name || state.partner?.username || "Partner";
  el.chatPartnerTyping.textContent = state.partnerTyping ? `${partnerName} is typing...` : "";
  el.chatPartnerTyping.classList.toggle("hidden", !state.partnerTyping);
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
  window.clearInterval(state.messagePollTimer);
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

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      syncNow();
    }
  });
  window.addEventListener("focus", syncNow);
  window.addEventListener("online", syncNow);
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
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      sender_id: state.user.id,
      receiver_id: state.partner.id,
      body: text,
    })
    .select("id, sender_id, receiver_id, body, created_at")
    .single();

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
    return;
  }

  state.myReadAt = now;
  state.unreadCount = 0;
  updateUnreadBadge();
  persistChatReadStateToDb();
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

async function refreshWeeklyTargets() {
  try {
    const rows = await fetchWeeklyTargets();
    state.data.weeklyTargets = rows;
    await refreshHomeMetrics();
    renderWeeklyTargets(rows);
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
    renderMessages(messages);
  } catch (error) {
    console.error(error);
  }
}

async function refreshQuestions() {
  try {
    const rows = await fetchQuestions();
    state.data.questions = rows;
    await refreshHomeMetrics();
    renderQuestions(rows);
    renderHomeDashboard();
  } catch (error) {
    console.error(error);
  }
}

async function refreshHomeMetrics() {
  if (!state.user?.id) {
    state.metrics = {
      totalQuestions: 0,
      totalCourses: 0,
      myWeeklyTargets: 0,
      liveQuestions: 0,
      liveCourses: 0,
    };
    return;
  }

  try {
    const allowedIds = getAllowedUserIds();

    const [questionsResult, coursesResult, myWeeklyResult] = await Promise.all([
      supabase
        .from("questions")
        .select("id", { count: "exact", head: true })
        .in("user_id", allowedIds),
      supabase
        .from("courses")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      supabase
        .from("weekly_targets")
        .select("id", { count: "exact", head: true })
        .eq("user_id", state.user.id),
    ]);

    const totalQuestions = Number(questionsResult.count || 0);
    const totalCourses = Number(coursesResult.count || 0);
    const myWeeklyTargets = Number(myWeeklyResult.count || 0);

    state.metrics = {
      totalQuestions,
      totalCourses,
      myWeeklyTargets,
      liveQuestions: totalQuestions,
      liveCourses: totalCourses,
    };
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
    const fallbackWeekly = state.user
      ? state.data.weeklyTargets.filter((row) => row.user_id === state.user.id).length
      : 0;

    state.metrics = {
      totalQuestions: fallbackQuestions,
      totalCourses: fallbackCourses,
      myWeeklyTargets: fallbackWeekly,
      liveQuestions: fallbackQuestions,
      liveCourses: fallbackCourses,
    };
  }
}

function renderHomeDashboard() {
  const totalQuestions = Number(state.metrics.totalQuestions || 0);
  const totalCourses = Number(state.metrics.totalCourses || 0);
  const myWeeklyTargets = Number(state.metrics.myWeeklyTargets || 0);
  const liveQuestions = Number(state.metrics.liveQuestions || totalQuestions);
  const liveCourses = Number(state.metrics.liveCourses || totalCourses);

  const progress = currentOverallProgress();
  const partnerProgress = state.partner ? progressForUser(state.partner.id) : 0;
  const trend = combinedCompletionTrend();

  if (el.totalQuestionsFeature) {
    el.totalQuestionsFeature.textContent = String(totalQuestions);
  }
  if (el.totalCoursesFeature) {
    el.totalCoursesFeature.textContent = String(totalCourses);
  }
  if (el.totalWeeklyFeature) {
    el.totalWeeklyFeature.textContent = String(myWeeklyTargets);
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
  if (!userId) {
    return 0;
  }

  const myTasks = state.data.tasks.filter((row) => row.user_id === userId);
  const myMilestones = state.data.milestones.filter((row) => row.user_id === userId);
  const myWeekly = state.data.weeklyTargets.filter((row) => row.user_id === userId);

  const values = [];
  if (myTasks.length) {
    values.push(averageProgress(myTasks));
  }
  if (myMilestones.length) {
    values.push(averageProgress(myMilestones));
  }
  if (myWeekly.length) {
    const weeklyAvg = Math.round(
      myWeekly.reduce((sum, row) => sum + clampNumber(Number(row.completion || 0), 0, 100), 0) / myWeekly.length,
    );
    values.push(weeklyAvg);
  }

  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
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
