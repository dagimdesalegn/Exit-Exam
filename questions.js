import { supabase } from "./supabaseClient.js";

const el = {
  learnShell: document.querySelector(".learn-shell"),
  courseModal: document.getElementById("courseModal"),
  examContainer: document.getElementById("examContainer"),
  randomModeCard: document.getElementById("randomModeCard"),
  previousExamGrid: document.getElementById("previousExamGrid"),
  courseGrid: document.getElementById("courseGrid"),
  totalQuestionsCount: document.getElementById("totalQuestionsCount"),
  totalQuestionsStat: document.getElementById("totalQuestionsStat"),
  totalCoursesStat: document.getElementById("totalCoursesStat"),
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
  timer: document.getElementById("timer"),
  currentQNum: document.getElementById("currentQNum"),
  totalQCount: document.getElementById("totalQCount"),
  questionBox: document.getElementById("questionBox"),
  questionNavigator: document.getElementById("questionNavigator"),
  prevBtn: document.getElementById("prevBtn"),
  checkAnswerBtn: document.getElementById("checkAnswerBtn"),
  nextBtn: document.getElementById("nextBtn"),
  submitBtn: document.getElementById("submitBtn"),
  backToModeBtn: document.getElementById("backToModeBtn"),
};

const state = {
  rows: [],
  session: null,
  selectedMode: null,
  selectedCourse: null,
  selectedCount: 0,
  selectedExamKey: null,
  examQuestions: [],
  currentIndex: 0,
  answers: new Map(),
  checked: new Set(),
  timerMs: 2 * 60 * 60 * 1000,
  timerHandle: null,
};

init().catch((error) => {
  console.error(error);
  el.loadStatus.textContent = "Failed to load questions.";
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
  if (el.randomModeCard) {
    el.randomModeCard.addEventListener("click", () => {
      state.selectedMode = "random";
      state.selectedCourse = null;
      state.selectedExamKey = null;
      state.selectedCount = 100;
      updateSelectionUi();
    });
  }

  if (el.courseGrid) {
    el.courseGrid.addEventListener("click", onCourseCardClick);
  }

  if (el.previousExamGrid) {
    el.previousExamGrid.addEventListener("click", onPreviousExamClick);
  }

  if (el.quantityOptions) {
    el.quantityOptions.addEventListener("click", onQuantityClick);
  }

  if (el.startSelectedBtn) {
    el.startSelectedBtn.addEventListener("click", startExamFromSelection);
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
  if (el.submitBtn) {
    el.submitBtn.addEventListener("click", submitExam);
  }
  if (el.backToModeBtn) {
    el.backToModeBtn.addEventListener("click", backToModeSelection);
  }
  if (el.questionNavigator) {
    el.questionNavigator.addEventListener("click", onNavigatorClick);
  }
}

async function loadQuestions() {
  if (!state.session) {
    return;
  }

  state.rows = await fetchAllQuestionsForUser(state.session.user.id);
  renderModeSelection();
}

async function fetchAllQuestionsForUser(userId) {
  const pageSize = 1000;
  let from = 0;
  const rows = [];

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("questions")
      .select("id, course, question, status, ai_summary, created_at, options, answer, explanation, code, source_type, source_year, source_month")
      .eq("user_id", userId)
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
  const total = state.rows.length;
  const courseCounts = getCourseCounts();
  const previousExamCounts = getPreviousExamCounts();

  if (el.totalQuestionsCount) {
    el.totalQuestionsCount.textContent = `${total} Total Questions`;
  }
  if (el.totalQuestionsStat) {
    el.totalQuestionsStat.textContent = String(total);
  }
  if (el.totalCoursesStat) {
    el.totalCoursesStat.textContent = String(courseCounts.length);
  }

  if (el.previousExamGrid) {
    el.previousExamGrid.innerHTML = previousExamCounts.map((exam) => `
      <div class="exam-card ${state.selectedMode === "previous" && state.selectedExamKey === exam.key ? "active" : ""}" data-exam-key="${escapeHtml(exam.key)}">
        <div class="exam-icon"><i class="fas fa-calendar-alt"></i></div>
        <div class="exam-info">
          <h4>${escapeHtml(exam.label)}</h4>
          <span class="exam-count">${exam.count} Questions</span>
        </div>
      </div>
    `).join("");
  }

  if (el.courseGrid) {
    el.courseGrid.innerHTML = courseCounts.map((row) => `
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
    el.loadStatus.textContent = `Loaded ${total} questions from your database.`;
  }

  updateSelectionUi();
}

function getCourseCounts() {
  const map = new Map();
  state.rows.forEach((row) => {
    if (!row.course) {
      return;
    }
    map.set(row.course, (map.get(row.course) || 0) + 1);
  });
  return Array.from(map.entries())
    .map(([course, count]) => ({ course, count }))
    .sort((a, b) => a.course.localeCompare(b.course));
}

function getPreviousExamCounts() {
  const keyToLabel = {
    "2016": "2016 Exit Exam",
    "2017-January": "2017 Exit Exam (Jan)",
    "2017-June": "2017 Exit Exam (June)",
  };

  const map = new Map();
  state.rows.forEach((row) => {
    if (row.source_type !== "previous_exam") {
      return;
    }
    const year = row.source_year ? String(row.source_year) : "Unknown";
    const month = row.source_month ? String(row.source_month) : "";
    const key = month ? `${year}-${month}` : year;
    map.set(key, (map.get(key) || 0) + 1);
  });

  return Array.from(map.entries()).map(([key, count]) => ({
    key,
    count,
    label: keyToLabel[key] || `Exit Exam ${key}`,
  }));
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
  state.selectedExamKey = null;
  state.selectedCount = 0;
  updateSelectionUi();
}

function onPreviousExamClick(event) {
  const card = event.target.closest(".exam-card");
  if (!card) {
    return;
  }
  const key = card.getAttribute("data-exam-key") || "";
  if (!key) {
    return;
  }

  state.selectedMode = "previous";
  state.selectedExamKey = key;
  state.selectedCourse = null;
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
  const courseRows = mode === "course" && state.selectedCourse
    ? state.rows.filter((row) => row.course === state.selectedCourse)
    : [];

  if (el.selectedCourseInfo) {
    el.selectedCourseInfo.classList.toggle("hidden", mode !== "course");
  }
  if (el.selectedCourseName) {
    el.selectedCourseName.textContent = state.selectedCourse || "";
  }
  if (el.selectedCourseTotal) {
    el.selectedCourseTotal.textContent = String(courseRows.length);
  }

  if (el.quantitySection) {
    el.quantitySection.classList.toggle("hidden", mode !== "course");
  }

  if (mode === "course" && el.quantityOptions) {
    const max = Math.max(0, courseRows.length);
    const options = buildQuantityList(max);
    el.quantityOptions.innerHTML = options.map((count) => `
      <button type="button" class="quantity-btn ${state.selectedCount === count ? "active" : ""}" data-count="${count}">${count}</button>
    `).join("");
  }

  if (el.randomModeCard) {
    el.randomModeCard.classList.toggle("active", mode === "random");
  }

  renderModeSelectionPartial();

  const canStartRandom = mode === "random";
  const canStartCourse = mode === "course" && state.selectedCourse && state.selectedCount > 0;
  const canStartPrevious = mode === "previous" && Boolean(state.selectedExamKey);
  if (el.startSelectedBtn) {
    el.startSelectedBtn.disabled = !(canStartRandom || canStartCourse || canStartPrevious);
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
  let selected = [];
  if (state.selectedMode === "random") {
    selected = shuffle([...state.rows]).slice(0, 100);
  }

  if (state.selectedMode === "course" && state.selectedCourse) {
    selected = shuffle(state.rows.filter((row) => row.course === state.selectedCourse)).slice(0, state.selectedCount);
  }

  if (state.selectedMode === "previous" && state.selectedExamKey) {
    const [yearText, month = ""] = state.selectedExamKey.split("-");
    const year = Number(yearText);
    const monthNorm = String(month || "").trim().toLowerCase();
    selected = shuffle(state.rows.filter((row) => row.source_type === "previous_exam"
      && Number(row.source_year || 0) === year
      && String(row.source_month || "").trim().toLowerCase() === monthNorm)).slice(0, 1000);
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
  state.timerMs = 2 * 60 * 60 * 1000;

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
    if (state.selectedMode === "random") {
      el.examModeTitle.innerHTML = "Comprehensive Mode <span>100 Questions</span>";
    } else if (state.selectedMode === "course") {
      el.examModeTitle.innerHTML = `${escapeHtml(state.selectedCourse)} <span>${state.examQuestions.length} Questions</span>`;
    } else {
      el.examModeTitle.innerHTML = `Previous Exit Exam <span>${state.examQuestions.length} Questions</span>`;
    }
  }

  renderNavigator();
  renderCurrentQuestion();
  startTimer();
}

function backToModeSelection() {
  window.clearInterval(state.timerHandle);
  if (el.examContainer) {
    el.examContainer.classList.add("hidden");
  }
  if (el.courseModal) {
    el.courseModal.classList.remove("hidden");
  }
  if (el.learnShell) {
    el.learnShell.classList.remove("exam-running");
  }
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

  const options = normalizeOptions(row.options);
  const selected = state.answers.get(row.id);

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
    <div id="questionFeedback" class="question-feedback ${state.checked.has(row.id) ? "" : "hidden"}"></div>
  `;

  el.questionBox.querySelectorAll("input[name='answer']").forEach((node) => {
    node.addEventListener("change", () => {
      state.answers.set(row.id, Number(node.value));
      if (el.checkAnswerBtn) {
        el.checkAnswerBtn.disabled = false;
      }
      renderNavigator();
      if (el.progress) {
        el.progress.textContent = `${state.answers.size} answered / ${state.examQuestions.length}`;
      }
    });
  });

  if (el.prevBtn) {
    el.prevBtn.disabled = state.currentIndex === 0;
  }
  if (el.nextBtn) {
    el.nextBtn.disabled = state.currentIndex >= state.examQuestions.length - 1;
  }
  if (el.checkAnswerBtn) {
    el.checkAnswerBtn.disabled = !state.answers.has(row.id);
  }
}

function normalizeOptions(rawOptions) {
  if (!Array.isArray(rawOptions)) {
    return [];
  }
  return rawOptions.map((item) => String(item || "").trim()).filter(Boolean);
}

function renderNavigator() {
  if (!el.questionNavigator) {
    return;
  }
  el.questionNavigator.innerHTML = state.examQuestions.map((row, idx) => {
    const answered = state.answers.has(row.id);
    const current = idx === state.currentIndex;
    return `<button type="button" class="nav-question ${current ? "current" : ""} ${answered ? "answered" : ""}" data-index="${idx}">${idx + 1}</button>`;
  }).join("");
}

function onNavigatorClick(event) {
  const btn = event.target.closest(".nav-question");
  if (!btn) {
    return;
  }
  const idx = Number(btn.getAttribute("data-index") || 0);
  if (Number.isNaN(idx)) {
    return;
  }
  state.currentIndex = idx;
  renderCurrentQuestion();
  renderNavigator();
}

function moveQuestion(delta) {
  const next = state.currentIndex + delta;
  if (next < 0 || next >= state.examQuestions.length) {
    return;
  }
  state.currentIndex = next;
  renderCurrentQuestion();
  renderNavigator();
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
}

function submitExam() {
  const total = state.examQuestions.length;
  let correct = 0;
  state.examQuestions.forEach((row) => {
    if (state.answers.get(row.id) === Number(row.answer)) {
      correct += 1;
    }
  });
  const score = total ? Math.round((correct / total) * 100) : 0;
  alert(`Exam submitted. Score: ${score}% (${correct}/${total})`);
}

function startTimer() {
  window.clearInterval(state.timerHandle);
  updateTimerUi();
  state.timerHandle = window.setInterval(() => {
    state.timerMs -= 1000;
    if (state.timerMs <= 0) {
      state.timerMs = 0;
      updateTimerUi();
      window.clearInterval(state.timerHandle);
      submitExam();
      return;
    }
    updateTimerUi();
  }, 1000);
}

function updateTimerUi() {
  const totalSec = Math.max(0, Math.floor(state.timerMs / 1000));
  const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
  const s = String(totalSec % 60).padStart(2, "0");
  if (el.timer) {
    el.timer.textContent = `${h}:${m}:${s}`;
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
