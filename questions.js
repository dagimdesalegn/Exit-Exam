import { supabase } from "./supabaseClient.js";

const el = {
  learnShell: document.querySelector(".learn-shell"),
  courseModal: document.getElementById("courseModal"),
  examContainer: document.getElementById("examContainer"),
  courseGrid: document.getElementById("courseGrid"),
  totalQuestionsStat: document.getElementById("totalQuestionsStat"),
  totalCoursesStat: document.getElementById("totalCoursesStat"),
  completedQuestionsStat: document.getElementById("completedQuestionsStat"),
  attemptScoreStat: document.getElementById("attemptScoreStat"),
  yearPicker: document.getElementById("yearPicker"),
  yearPickerBtn: document.getElementById("yearPickerBtn"),
  yearPickerMenu: document.getElementById("yearPickerMenu"),
  coursePicker: document.getElementById("coursePicker"),
  coursePickerBtn: document.getElementById("coursePickerBtn"),
  coursePickerMenu: document.getElementById("coursePickerMenu"),
  selectedCourseInfo: document.getElementById("selectedCourseInfo"),
  selectedCourseName: document.getElementById("selectedCourseName"),
  selectedCourseTotal: document.getElementById("selectedCourseTotal"),
  quantitySection: document.getElementById("quantitySection"),
  quantityOptions: document.getElementById("quantityOptions"),
  quantityNoteText: document.getElementById("quantityNoteText"),
  startSelectedBtn: document.getElementById("startSelectedBtn"),
  loadStatus: document.getElementById("q-load-status"),
  examModeTitle: document.getElementById("examModeTitle"),
  progress: document.getElementById("progress"),
  progressFill: document.getElementById("examProgressFill"),
  currentQNum: document.getElementById("currentQNum"),
  totalQCount: document.getElementById("totalQCount"),
  questionBox: document.getElementById("questionBox"),
  prevBtn: document.getElementById("prevBtn"),
  checkAnswerBtn: document.getElementById("checkAnswerBtn"),
  aiExplainBtn: document.getElementById("aiExplainBtn"),
  nextBtn: document.getElementById("nextBtn"),
  submitBtn: document.getElementById("submitBtn"),
  backToModeBtn: document.getElementById("backToModeBtn"),
  startExamConfirm: document.getElementById("startExamConfirm"),
  startExamMessage: document.getElementById("startExamMessage"),
  confirmStartExamBtn: document.getElementById("confirmStartExamBtn"),
  cancelStartExamBtn: document.getElementById("cancelStartExamBtn"),
  submitExamConfirm: document.getElementById("submitExamConfirm"),
  submitExamMessage: document.getElementById("submitExamMessage"),
  confirmSubmitExamBtn: document.getElementById("confirmSubmitExamBtn"),
  cancelSubmitExamBtn: document.getElementById("cancelSubmitExamBtn"),
  submitResultModal: document.getElementById("submitResultModal"),
  submitResultMessage: document.getElementById("submitResultMessage"),
  closeSubmitResultBtn: document.getElementById("closeSubmitResultBtn"),
};

const state = {
  rows: [],
  session: null,
  selectedMode: null,
  selectedCourse: null,
  selectedCount: 0,
  selectedYear: "all",
  selectedCourseFilter: "all",
  examQuestions: [],
  currentIndex: 0,
  answers: new Map(),
  checked: new Set(),
  aiInsights: new Map(),
  aiBusy: false,
  attemptStats: { averageScore: 0, attempts: 0 },
  startedAtMs: 0,
  submitting: false,
};

init().catch((error) => {
  console.error(error);
  if (el.loadStatus) {
    el.loadStatus.textContent = "Failed to load questions.";
  }
});

async function init() {
  const session = await requireSession();
  if (!session) {
    return;
  }
  state.session = session;

  bindEvents();
  await loadQuestions();
}

function bindEvents() {
  if (el.courseGrid) {
    el.courseGrid.addEventListener("click", onCourseCardClick);
  }

  document.addEventListener("click", onGlobalClick);

  if (el.quantityOptions) {
    el.quantityOptions.addEventListener("click", onQuantityClick);
  }

  if (el.yearPickerBtn) {
    el.yearPickerBtn.addEventListener("click", () => {
      toggleFilterPicker("year");
    });
  }

  if (el.coursePickerBtn) {
    el.coursePickerBtn.addEventListener("click", () => {
      toggleFilterPicker("course");
    });
  }

  if (el.yearPickerMenu) {
    el.yearPickerMenu.addEventListener("click", onFilterOptionClick);
  }

  if (el.coursePickerMenu) {
    el.coursePickerMenu.addEventListener("click", onFilterOptionClick);
  }

  if (el.startSelectedBtn) {
    el.startSelectedBtn.addEventListener("click", startExamFromSelection);
  }

  if (el.confirmStartExamBtn) {
    el.confirmStartExamBtn.addEventListener("click", confirmStartExam);
  }

  if (el.cancelStartExamBtn) {
    el.cancelStartExamBtn.addEventListener("click", closeStartConfirm);
  }

  if (el.prevBtn) {
    el.prevBtn.addEventListener("click", () => moveQuestion(-1));
  }
  if (el.nextBtn) {
    el.nextBtn.addEventListener("click", () => moveQuestion(1));
  }
  if (el.checkAnswerBtn) {
    el.checkAnswerBtn.addEventListener("click", checkCurrentAnswer);
  }
  if (el.aiExplainBtn) {
    el.aiExplainBtn.addEventListener("click", onAiExplainCurrent);
  }
  if (el.submitBtn) {
    el.submitBtn.addEventListener("click", openSubmitConfirm);
  }
  if (el.backToModeBtn) {
    el.backToModeBtn.addEventListener("click", backToModeSelection);
  }
  if (el.confirmSubmitExamBtn) {
    el.confirmSubmitExamBtn.addEventListener("click", () => {
      submitExam(true);
    });
  }
  if (el.cancelSubmitExamBtn) {
    el.cancelSubmitExamBtn.addEventListener("click", closeSubmitConfirm);
  }
  if (el.closeSubmitResultBtn) {
    el.closeSubmitResultBtn.addEventListener("click", closeSubmitResult);
  }
}

async function loadQuestions() {
  if (!state.session) {
    return;
  }

  await cleanupGeneratedAiPromptRows(state.session.user.id);
  const allowedUserIds = await getAllowedQuestionUserIds(state.session.user.id);
  state.rows = await fetchAllQuestionsForUsers(allowedUserIds);
  state.attemptStats = await fetchAttemptStats(state.session.user.id);
  renderModeSelection();
}

async function getAllowedQuestionUserIds(userId) {
  const ids = new Set([userId]);

  const { data, error } = await supabase
    .from("pair_links")
    .select("user_id, partner_id")
    .or(`user_id.eq.${userId},partner_id.eq.${userId}`);

  if (error || !Array.isArray(data)) {
    return Array.from(ids);
  }

  data.forEach((row) => {
    const left = String(row.user_id || "").trim();
    const right = String(row.partner_id || "").trim();
    if (left) {
      ids.add(left);
    }
    if (right) {
      ids.add(right);
    }
  });

  return Array.from(ids);
}

async function fetchAttemptStats(userId) {
  const { data, error } = await supabase
    .from("question_attempts")
    .select("score_percent")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return { averageScore: 0, attempts: 0 };
  }

  const rows = data || [];
  if (!rows.length) {
    return { averageScore: 0, attempts: 0 };
  }

  const averageScore = Math.round(
    rows.reduce((sum, row) => sum + clampNumber(Number(row.score_percent || 0), 0, 100), 0) / rows.length,
  );
  return { averageScore, attempts: rows.length };
}

async function cleanupGeneratedAiPromptRows(userId) {
  const { error } = await supabase
    .from("questions")
    .delete()
    .eq("user_id", userId)
    .or("question.ilike.Create a short learning insight for this exit exam question.%,question.ilike.Plan type:%User request:%");

  if (error) {
    console.warn("Cleanup skipped:", error.message);
  }
}

async function fetchAllQuestionsForUsers(userIds) {
  const pageSize = 1000;
  let from = 0;
  const rows = [];
  const allowed = Array.isArray(userIds) && userIds.length ? userIds : [state.session?.user?.id].filter(Boolean);

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("questions")
      .select("id, course, question, status, ai_summary, created_at, options, answer, explanation, code, source_type, source_year, source_month")
      .in("user_id", allowed)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      throw error;
    }

    const chunk = data || [];
    rows.push(...chunk);
    if (chunk.length < pageSize) {
      break;
    }
    from += pageSize;
  }

  return rows;
}

async function requireSession() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    window.location.href = "index.html";
    return null;
  }
  return data.session;
}

function renderModeSelection() {
  const globalRows = getRowsAfterGlobalFilters();
  const total = globalRows.length;
  const completed = globalRows.filter((row) => String(row.status || "").toLowerCase() === "completed").length;
  const courseCounts = getCourseCounts(globalRows);
  const filteredCourseCounts = applyCourseFilter(courseCounts);

  renderYearPickerOptions(state.rows);
  renderCoursePickerOptions(getCourseCounts(state.rows));

  if (el.totalQuestionsStat) {
    el.totalQuestionsStat.textContent = String(total);
  }
  if (el.totalCoursesStat) {
    el.totalCoursesStat.textContent = String(filteredCourseCounts.length);
  }
  if (el.completedQuestionsStat) {
    el.completedQuestionsStat.textContent = String(completed);
  }
  if (el.attemptScoreStat) {
    el.attemptScoreStat.textContent = `${state.attemptStats.averageScore || 0}%`;
  }

  if (el.courseGrid) {
    el.courseGrid.innerHTML = filteredCourseCounts.map((row) => `
      <div class="course-card ${state.selectedMode === "course" && state.selectedCourse === row.course ? "active" : ""}" data-course="${escapeHtml(row.course)}">
        <div class="course-check"><i class="${state.selectedMode === "course" && state.selectedCourse === row.course ? "fas fa-check-circle" : "far fa-circle"}"></i></div>
        <div class="course-info">
          <h4>${escapeHtml(row.course)}</h4>
          <div class="course-meta"><span class="course-count"><i class="fas fa-question-circle"></i> ${row.count} questions</span></div>
        </div>
      </div>
    `).join("");
  }

  if (el.loadStatus) {
    const yearText = state.selectedYear === "all" ? "All years" : state.selectedYear;
    const courseText = state.selectedCourseFilter === "all" ? "All courses" : state.selectedCourseFilter;
    el.loadStatus.textContent = `Showing ${total} questions (${yearText}, ${courseText}).`;
  }

  updateSelectionUi();
}

function getCourseCounts(rows = state.rows) {
  const map = new Map();
  rows.forEach((row) => {
    const normalized = normalizeCourseName(row.course);
    if (!normalized) {
      return;
    }
    map.set(normalized, (map.get(normalized) || 0) + 1);
  });
  return Array.from(map.entries())
    .map(([course, count]) => ({ course, count }))
    .sort((a, b) => a.course.localeCompare(b.course));
}

function renderYearPickerOptions(rows = state.rows) {
  if (!el.yearPickerMenu || !el.yearPickerBtn) {
    return;
  }

  const years = Array.from(new Set(
    rows.map((item) => Number(item.source_year || 0)).filter((value) => value > 0).map((value) => String(value)),
  )).sort((a, b) => Number(b) - Number(a));

  el.yearPickerMenu.innerHTML = [
    `<button type="button" class="chapter-picker-option ${state.selectedYear === "all" ? "active" : ""}" data-filter-type="year" data-filter-value="all">All Years</button>`,
    ...years.map((year) => `<button type="button" class="chapter-picker-option ${state.selectedYear === year ? "active" : ""}" data-filter-type="year" data-filter-value="${escapeHtml(year)}">${escapeHtml(year)}</button>`),
  ].join("");

  const label = state.selectedYear === "all" ? "All Years" : state.selectedYear;
  const span = el.yearPickerBtn.querySelector("span");
  if (span) {
    span.textContent = label;
  }
}

function applyCourseFilter(courseRows) {
  return courseRows.filter((row) => {
    const passCourseFilter = state.selectedCourseFilter === "all" || row.course === state.selectedCourseFilter;
    return passCourseFilter;
  });
}

function onYearFilterChange() {
  keepSelectedCourseIfVisible();
  renderModeSelection();
}

function onCourseFilterChange() {
  keepSelectedCourseIfVisible();
  renderModeSelection();
}

function onFilterOptionClick(event) {
  const btn = event.target.closest(".chapter-picker-option");
  if (!btn) {
    return;
  }

  const filterType = btn.getAttribute("data-filter-type") || "";
  const filterValue = btn.getAttribute("data-filter-value") || "all";

  if (filterType === "year") {
    state.selectedYear = filterValue;
    onYearFilterChange();
    setFilterPickerOpen("year", false);
    return;
  }

  if (filterType === "course") {
    state.selectedCourseFilter = filterValue;
    onCourseFilterChange();
    setFilterPickerOpen("course", false);
  }
}

function onCourseCardClick(event) {
  const card = event.target.closest(".course-card");
  if (!card) {
    return;
  }

  const course = card.getAttribute("data-course") || "";
  if (!course) {
    return;
  }

  state.selectedMode = "course";
  state.selectedCourse = course;
  state.selectedCount = 0;
  updateSelectionUi();
}

function onQuantityClick(event) {
  const btn = event.target.closest(".quantity-btn");
  if (!btn) {
    return;
  }
  const count = Number(btn.getAttribute("data-count") || 0);
  if (!count) {
    return;
  }
  state.selectedCount = count;
  updateSelectionUi();
}

function updateSelectionUi() {
  const mode = state.selectedMode;
  const globalRows = getRowsAfterGlobalFilters();
  const courseRows = mode === "course" && state.selectedCourse
    ? globalRows.filter((row) => normalizeCourseName(row.course) === state.selectedCourse)
    : [];
  const chapterRows = courseRows;

  if (el.selectedCourseInfo) {
    el.selectedCourseInfo.classList.toggle("hidden", mode !== "course");
  }
  if (el.selectedCourseName) {
    el.selectedCourseName.textContent = state.selectedCourse || "";
  }
  if (el.selectedCourseTotal) {
    el.selectedCourseTotal.textContent = String(chapterRows.length);
  }

  if (el.quantitySection) {
    el.quantitySection.classList.toggle("hidden", mode !== "course");
  }

  if (mode === "course" && el.quantityOptions) {
    const max = Math.max(0, chapterRows.length);
    const options = buildQuantityList(max);
    el.quantityOptions.innerHTML = options.map((count) => `
      <button type="button" class="quantity-btn ${state.selectedCount === count ? "active" : ""}" data-count="${count}">${count}</button>
    `).join("");
  }

  renderModeSelectionPartial();

  const canStartCourse = mode === "course" && state.selectedCourse && state.selectedCount > 0;
  if (el.startSelectedBtn) {
    el.startSelectedBtn.disabled = !canStartCourse;
  }
}

function renderCoursePickerOptions(courseRows) {
  if (!el.coursePickerMenu || !el.coursePickerBtn) {
    return;
  }
  const options = [
    `<button type="button" class="chapter-picker-option ${state.selectedCourseFilter === "all" ? "active" : ""}" data-filter-type="course" data-filter-value="all">All Courses</button>`,
    ...courseRows.map((row) => {
      const selected = state.selectedCourseFilter === row.course ? "active" : "";
      return `<button type="button" class="chapter-picker-option ${selected}" data-filter-type="course" data-filter-value="${escapeHtml(row.course)}">${escapeHtml(row.course)}</button>`;
    }),
  ];
  el.coursePickerMenu.innerHTML = options.join("");
  if (state.selectedCourseFilter !== "all" && !courseRows.some((row) => row.course === state.selectedCourseFilter)) {
    state.selectedCourseFilter = "all";
  }

  const span = el.coursePickerBtn.querySelector("span");
  if (span) {
    span.textContent = state.selectedCourseFilter === "all" ? "All Courses" : state.selectedCourseFilter;
  }
}

function onGlobalClick(event) {
  if (!(event.target instanceof Element)) {
    return;
  }

  if (el.yearPicker && !el.yearPicker.contains(event.target)) {
    setFilterPickerOpen("year", false);
  }
  if (el.coursePicker && !el.coursePicker.contains(event.target)) {
    setFilterPickerOpen("course", false);
  }

  if (event.target.hasAttribute("data-action") && event.target.getAttribute("data-action") === "close-start-confirm") {
    closeStartConfirm();
  }

  if (event.target.hasAttribute("data-action") && event.target.getAttribute("data-action") === "close-submit-confirm") {
    closeSubmitConfirm();
  }

  if (event.target.hasAttribute("data-action") && event.target.getAttribute("data-action") === "close-submit-result") {
    closeSubmitResult();
  }
}

function toggleFilterPicker(type) {
  const menu = type === "year" ? el.yearPickerMenu : el.coursePickerMenu;
  if (!menu) {
    return;
  }
  const isOpen = !menu.classList.contains("hidden");
  setFilterPickerOpen(type, !isOpen);
}

function setFilterPickerOpen(type, isOpen) {
  if (isOpen) {
    setFilterPickerOpen(type === "year" ? "course" : "year", false);
  }

  const menu = type === "year" ? el.yearPickerMenu : el.coursePickerMenu;
  const button = type === "year" ? el.yearPickerBtn : el.coursePickerBtn;
  const picker = type === "year" ? el.yearPicker : el.coursePicker;
  const label = picker ? picker.closest("label") : null;
  if (!menu || !button) {
    return;
  }
  menu.classList.toggle("hidden", !isOpen);
  button.setAttribute("aria-expanded", isOpen ? "true" : "false");
  if (picker) {
    picker.classList.toggle("is-open", isOpen);
  }
  if (label) {
    label.classList.toggle("picker-open", isOpen);
  }
}

function matchesYearFilter(row) {
  if (state.selectedYear === "all") {
    return true;
  }
  if (!row?.source_year) {
    return false;
  }
  return Number(row.source_year) === Number(state.selectedYear);
}

function getRowsAfterGlobalFilters() {
  return state.rows.filter((row) => matchesYearFilter(row));
}

function keepSelectedCourseIfVisible() {
  if (!state.selectedCourse) {
    return;
  }
  const visible = applyCourseFilter(getCourseCounts(getRowsAfterGlobalFilters())).some((row) => row.course === state.selectedCourse);
  if (!visible) {
    state.selectedCourse = null;
    state.selectedCount = 0;
    state.selectedMode = null;
  }
}

function renderModeSelectionPartial() {
  if (el.courseGrid) {
    el.courseGrid.querySelectorAll(".course-card").forEach((node) => {
      const course = node.getAttribute("data-course") || "";
      const active = state.selectedMode === "course" && state.selectedCourse === course;
      node.classList.toggle("active", active);
      const icon = node.querySelector(".course-check i");
      if (icon) {
        icon.className = active ? "fas fa-check-circle" : "far fa-circle";
      }
    });
  }
  if (el.previousExamGrid) {
    el.previousExamGrid.querySelectorAll(".exam-card").forEach((node) => {
      const key = node.getAttribute("data-exam-key") || "";
      node.classList.toggle("active", state.selectedMode === "previous" && state.selectedExamKey === key);
    });
  }
}

function buildQuantityList(max) {
  const preset = [10, 20, 30, 40, 50, 75, 100];
  const list = preset.filter((n) => n <= max);
  if (max > 0 && !list.includes(max)) {
    list.push(max);
  }
  return list;
}

async function startExamFromSelection() {
  if (state.selectedMode !== "course" || !state.selectedCourse || state.selectedCount <= 0) {
    return;
  }

  if (el.startExamMessage) {
    el.startExamMessage.textContent = `${state.selectedCourse} • ${state.selectedCount} questions`;
  }
  openStartConfirm();
}

function openStartConfirm() {
  if (!el.startExamConfirm) {
    return;
  }
  el.startExamConfirm.classList.remove("hidden");
  el.startExamConfirm.setAttribute("aria-hidden", "false");
}

function closeStartConfirm() {
  if (!el.startExamConfirm) {
    return;
  }
  el.startExamConfirm.classList.add("hidden");
  el.startExamConfirm.setAttribute("aria-hidden", "true");
}

function openSubmitConfirm() {
  if (!el.submitExamConfirm || state.submitting) {
    return;
  }

  const total = state.examQuestions.length;
  const answered = state.answers.size;
  const unanswered = Math.max(0, total - answered);
  if (el.submitExamMessage) {
    el.submitExamMessage.textContent = unanswered > 0
      ? `You still have ${unanswered} unanswered question${unanswered === 1 ? "" : "s"}. Submit anyway?`
      : "All questions are answered. Submit now?";
  }

  el.submitExamConfirm.classList.remove("hidden");
  el.submitExamConfirm.setAttribute("aria-hidden", "false");
}

function closeSubmitConfirm() {
  if (!el.submitExamConfirm) {
    return;
  }
  el.submitExamConfirm.classList.add("hidden");
  el.submitExamConfirm.setAttribute("aria-hidden", "true");
}

function openSubmitResult(message) {
  if (!el.submitResultModal) {
    return;
  }
  if (el.submitResultMessage) {
    el.submitResultMessage.textContent = message;
  }
  el.submitResultModal.classList.remove("hidden");
  el.submitResultModal.setAttribute("aria-hidden", "false");
}

function closeSubmitResult() {
  if (!el.submitResultModal) {
    return;
  }
  el.submitResultModal.classList.add("hidden");
  el.submitResultModal.setAttribute("aria-hidden", "true");
}

async function confirmStartExam() {
  closeStartConfirm();

  let selected = [];
  if (state.selectedMode === "course" && state.selectedCourse) {
    const rows = getRowsAfterGlobalFilters().filter((row) => normalizeCourseName(row.course) === state.selectedCourse);
    selected = shuffle(rows).slice(0, state.selectedCount);
  }

  if (!selected.length) {
    if (el.loadStatus) {
      el.loadStatus.textContent = "No questions found for this selection.";
    }
    return;
  }

  state.examQuestions = selected;
  state.currentIndex = 0;
  state.answers = new Map();
  state.checked = new Set();
  state.aiInsights = new Map();
  state.aiBusy = false;
  state.startedAtMs = Date.now();
  state.submitting = false;

  if (el.courseModal) {
    el.courseModal.classList.add("hidden");
  }
  if (el.examContainer) {
    el.examContainer.classList.remove("hidden");
  }
  if (el.learnShell) {
    el.learnShell.classList.add("exam-running");
  }

  if (el.examModeTitle) {
    if (state.selectedMode === "course") {
      el.examModeTitle.innerHTML = `${escapeHtml(state.selectedCourse)} <span>${state.examQuestions.length} Questions</span>`;
    } else {
      el.examModeTitle.innerHTML = `Practice Exam <span>${state.examQuestions.length} Questions</span>`;
    }
  }

  renderCurrentQuestion();
}

function backToModeSelection() {
  if (el.examContainer) {
    el.examContainer.classList.add("hidden");
  }
  if (el.courseModal) {
    el.courseModal.classList.remove("hidden");
  }
  if (el.learnShell) {
    el.learnShell.classList.remove("exam-running");
  }
  closeStartConfirm();
  closeSubmitConfirm();
}

function renderCurrentQuestion() {
  const row = state.examQuestions[state.currentIndex];
  if (!row) {
    return;
  }

  if (el.currentQNum) {
    el.currentQNum.textContent = String(state.currentIndex + 1);
  }
  if (el.totalQCount) {
    el.totalQCount.textContent = String(state.examQuestions.length);
  }
  if (el.progress) {
    el.progress.textContent = `${state.answers.size} answered / ${state.examQuestions.length}`;
  }
  if (el.progressFill) {
    const percent = state.examQuestions.length
      ? Math.round((state.answers.size / state.examQuestions.length) * 100)
      : 0;
    el.progressFill.style.width = `${percent}%`;
  }

  const options = normalizeOptions(row.options);
  const selected = state.answers.get(row.id);
  const aiInsight = state.aiInsights.get(row.id) || "";
  const aiLoading = state.aiBusy ? "" : "hidden";

  el.questionBox.innerHTML = `
    <div class="question-focus-row">
      <span class="question-focus-pill">Question ${state.currentIndex + 1} / ${state.examQuestions.length}</span>
    </div>
    <p><b>${escapeHtml(row.question || "")}</b></p>
    ${row.code ? `<pre class="question-code">${escapeHtml(row.code)}</pre>` : ""}
    ${options.map((opt, idx) => `
      <div class="option ${selected === idx ? "selected" : ""}">
        <input type="radio" name="answer" value="${idx}" id="opt-${idx}" ${selected === idx ? "checked" : ""}>
        <label for="opt-${idx}">${escapeHtml(opt)}</label>
      </div>
    `).join("")}
    <div class="ai-tools-row">
      <span id="aiLoadingTag" class="ai-loading-tag ${aiLoading}"><i class="fas fa-spinner fa-spin"></i> AI is generating insight...</span>
    </div>
    <div id="aiInsight" class="ai-insight ${aiInsight ? "" : "hidden"}">${aiInsight ? escapeHtml(aiInsight) : ""}</div>
    <div id="questionFeedback" class="question-feedback ${state.checked.has(row.id) ? "" : "hidden"}"></div>
  `;

  el.questionBox.querySelectorAll("input[name='answer']").forEach((node) => {
    node.addEventListener("change", () => {
      state.answers.set(row.id, Number(node.value));
      if (el.checkAnswerBtn) {
        el.checkAnswerBtn.disabled = false;
      }
      if (el.progress) {
        el.progress.textContent = `${state.answers.size} answered / ${state.examQuestions.length}`;
      }
      if (el.progressFill) {
        const percent = state.examQuestions.length
          ? Math.round((state.answers.size / state.examQuestions.length) * 100)
          : 0;
        el.progressFill.style.width = `${percent}%`;
      }
    });
  });

  if (el.prevBtn) {
    el.prevBtn.disabled = state.currentIndex === 0;
  }
  if (el.nextBtn) {
    const isLast = state.currentIndex >= state.examQuestions.length - 1;
    const checked = state.checked.has(row.id);
    el.nextBtn.disabled = isLast || !checked;
  }
  if (el.checkAnswerBtn) {
    el.checkAnswerBtn.disabled = !state.answers.has(row.id);
  }
  if (el.aiExplainBtn) {
    el.aiExplainBtn.disabled = state.aiBusy;
  }
}

async function onAiExplainCurrent() {
  const row = state.examQuestions[state.currentIndex];
  if (!row || state.aiBusy || !state.session) {
    return;
  }

  if (state.aiInsights.has(row.id)) {
    renderCurrentQuestion();
    return;
  }

  state.aiBusy = true;
  renderCurrentQuestion();

  try {
    const { error: invokeError } = await supabase.functions.invoke("ai-summary", {
      body: { questionId: row.id },
    });
    if (invokeError) {
      throw new Error(invokeError.message || "AI summary invoke failed.");
    }

    let summary = "";
    for (let i = 0; i < 10; i += 1) {
      await waitMs(900);
      const result = await fetchQuestionAiResult(row.id);
      if (result?.ai_summary) {
        summary = result.ai_summary;
        break;
      }
    }

    state.aiInsights.set(row.id, summary || "AI insight is still processing. Please try again in a moment.");
  } catch (error) {
    const raw = String(error?.message || "");
    const isCorsLike = /failed to fetch|cors|preflight|networkerror|net::err_failed/i.test(raw);
    state.aiInsights.set(
      row.id,
      isCorsLike
        ? "AI insight blocked by CORS/preflight on ai-summary. Redeploy the Edge Function and try again."
        : `AI insight failed: ${raw}`,
    );
  } finally {
    state.aiBusy = false;
    renderCurrentQuestion();
  }
}

async function fetchQuestionAiResult(questionId) {
  const { data, error } = await supabase
    .from("questions")
    .select("id, ai_summary")
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

function normalizeOptions(rawOptions) {
  if (!Array.isArray(rawOptions)) {
    return [];
  }
  return rawOptions.map((item) => String(item || "").trim()).filter(Boolean);
}

function moveQuestion(delta) {
  if (delta > 0) {
    const row = state.examQuestions[state.currentIndex];
    if (row && !state.checked.has(row.id)) {
      return;
    }
  }

  const next = state.currentIndex + delta;
  if (next < 0 || next >= state.examQuestions.length) {
    return;
  }
  state.currentIndex = next;
  renderCurrentQuestion();
}

function checkCurrentAnswer() {
  const row = state.examQuestions[state.currentIndex];
  if (!row) {
    return;
  }
  const selected = state.answers.get(row.id);
  const correct = Number(row.answer);
  const feedback = el.questionBox.querySelector("#questionFeedback");
  if (!feedback) {
    return;
  }

  state.checked.add(row.id);
  const ok = selected === correct;
  const explanation = row.explanation ? `<p>${escapeHtml(row.explanation)}</p>` : "";
  feedback.classList.remove("hidden");
  feedback.className = `question-feedback ${ok ? "correct" : "wrong"}`;
  feedback.innerHTML = `
    <strong>${ok ? "Correct" : "Incorrect"}</strong>
    <p>Correct answer: ${Number.isInteger(correct) ? `Option ${correct + 1}` : "Not available"}</p>
    ${explanation}
  `;

  if (el.nextBtn) {
    const isLast = state.currentIndex >= state.examQuestions.length - 1;
    el.nextBtn.disabled = isLast;
  }
}

async function submitExam(confirmed = false) {
  if (!state.examQuestions.length) {
    return;
  }

  if (!confirmed) {
    openSubmitConfirm();
    return;
  }

  closeSubmitConfirm();
  if (state.submitting) {
    return;
  }
  state.submitting = true;
  if (el.submitBtn) {
    el.submitBtn.disabled = true;
  }
  if (el.confirmSubmitExamBtn) {
    el.confirmSubmitExamBtn.disabled = true;
  }

  try {
    const total = state.examQuestions.length;
    const answered = state.answers.size;
    let correct = 0;
    state.examQuestions.forEach((row) => {
      if (state.answers.get(row.id) === Number(row.answer)) {
        correct += 1;
      }
    });
    const score = total ? Math.round((correct / total) * 100) : 0;
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - state.startedAtMs) / 1000));

    await persistExamProgress({
      total,
      answered,
      correct,
      score,
      elapsedSeconds,
    });

    state.rows = state.rows.map((row) => {
      if (!state.answers.has(row.id)) {
        return row;
      }
      return { ...row, status: "completed" };
    });

    await loadQuestions();
    backToModeSelection();
    openSubmitResult(`Submitted successfully. Score: ${score}% (${correct}/${total})`);
  } finally {
    state.submitting = false;
    if (el.submitBtn) {
      el.submitBtn.disabled = false;
    }
    if (el.confirmSubmitExamBtn) {
      el.confirmSubmitExamBtn.disabled = false;
    }
  }
}

async function persistExamProgress(summary) {
  if (!state.session?.user?.id) {
    return;
  }

  const answeredQuestionIds = state.examQuestions
    .filter((row) => state.answers.has(row.id))
    .map((row) => row.id);

  if (answeredQuestionIds.length) {
    const { error: updateError } = await supabase
      .from("questions")
      .update({ status: "completed" })
      .in("id", answeredQuestionIds)
      .eq("user_id", state.session.user.id);

    if (updateError) {
      console.warn("Question status update skipped:", updateError.message);
    }
  }

  const answerMap = state.examQuestions.map((row) => ({
    question_id: row.id,
    selected: state.answers.has(row.id) ? state.answers.get(row.id) : null,
    correct: Number(row.answer),
    is_correct: state.answers.has(row.id) ? state.answers.get(row.id) === Number(row.answer) : false,
  }));

  const { error: attemptError } = await supabase.from("question_attempts").insert({
    user_id: state.session.user.id,
    course: state.selectedCourse || "Mixed",
    total_questions: summary.total,
    answered_questions: summary.answered,
    correct_answers: summary.correct,
    score_percent: summary.score,
    duration_seconds: summary.elapsedSeconds,
    answers_json: answerMap,
  });

  if (attemptError) {
    console.warn("Attempt tracking skipped:", attemptError.message);
  }
}

function shuffle(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeCourseName(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  const key = raw.toLowerCase();
  const aliases = {
    "algorithms": "Design and Analysis of Algorithms",
    "design & analysis of algorithms": "Design and Analysis of Algorithms",
    "data structures": "Data Structures and Algorithms",
    "automata theory": "Automata and Complexity Theory",
    "computer organization": "Computer Organization and Architecture",
    "operating systems": "Operating System",
    "programming": "Computer Programming",
    "networking": "Data Communication and Computer Networking",
    "data communication & networking": "Data Communication and Computer Networking",
    "artificial intelligence": "Introduction to Artificial Intelligence",
    "system administration": "Network and System Administration",
  };

  return aliases[key] || raw;
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
