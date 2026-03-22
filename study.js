import { supabase } from "./supabaseClient.js";

const REMOTE_STUDY_BASE = "https://exam-system-rho.vercel.app/studyCourses";
const MAX_SUBSECTIONS_PER_CHAPTER = 40;
const COURSE_SLUG_OVERRIDES = {
  "Data Communication and Computer Networking": "data-communication-networking",
};
const chapterCache = new Map();
const pageState = {
  sessionUserId: null,
  questions: [],
  tasks: [],
  milestones: [],
  liveMap: new Map(),
  selectedCourse: null,
};
let viewerLayoutRaf = 0;

const COURSE_META = [
  { name: "Computer Programming", icon: "fas fa-code", color: "#667eea", total: 8, desc: "Learn programming fundamentals using C++, including variables, data types, control structures, functions, and object-oriented programming." },
  { name: "Fundamentals of Database Systems", icon: "fas fa-database", color: "#764ba2", total: 10, desc: "Master database design, SQL, normalization, transactions, and database management systems." },
  { name: "Advanced Database Systems", icon: "fas fa-database", color: "#8b5fbf", total: 8, desc: "Explore distributed systems, concurrency, indexing, optimization, and advanced data modeling." },
  { name: "Object Oriented Programming", icon: "fas fa-cubes", color: "#f093fb", total: 7, desc: "Understand classes, objects, inheritance, polymorphism, encapsulation, and design patterns in C++." },
  { name: "Computer Organization and Architecture", icon: "fas fa-microchip", color: "#f5576c", total: 9, desc: "Explore CPU design, memory hierarchy, I/O systems, pipelining, and assembly language." },
  { name: "Data Communication and Computer Networking", icon: "fas fa-network-wired", color: "#4facfe", total: 8, desc: "Study OSI model, TCP/IP, protocols, routing, switching, and network security." },
  { name: "Data Structures and Algorithms", icon: "fas fa-sitemap", color: "#43e97b", total: 10, desc: "Learn arrays, linked lists, stacks, queues, trees, graphs, and algorithm analysis." },
  { name: "Web Programming", icon: "fas fa-globe", color: "#fa709a", total: 8, desc: "Master HTML, CSS, JavaScript, and modern web development frameworks." },
  { name: "Operating System", icon: "fas fa-windows", color: "#30cfd0", total: 9, desc: "Understand process management, memory management, file systems, and scheduling." },
  { name: "Software Engineering", icon: "fas fa-cog", color: "#a18cd1", total: 8, desc: "Learn SDLC, agile methodologies, testing, and software design patterns." },
  { name: "Design and Analysis of Algorithms", icon: "fas fa-chart-line", color: "#fbc2eb", total: 7, desc: "Study algorithm design techniques, complexity analysis, and optimization." },
  { name: "Introduction to Artificial Intelligence", icon: "fas fa-robot", color: "#a6c1ee", total: 8, desc: "Explore machine learning, neural networks, expert systems, and NLP." },
  { name: "Computer Security", icon: "fas fa-shield-alt", color: "#84fab0", total: 7, desc: "Learn cryptography, network security, authentication, and security protocols." },
  { name: "Network and System Administration", icon: "fas fa-server", color: "#fccb90", total: 6, desc: "Master system configuration, network management, and troubleshooting." },
  { name: "Automata and Complexity Theory", icon: "fas fa-infinity", color: "#ff9a9e", total: 7, desc: "Study formal languages, automata, Turing machines, and computational complexity." },
  { name: "Compiler Design", icon: "fas fa-file-code", color: "#4facfe", total: 7, desc: "Understand lexical analysis, parsing, semantic analysis, and code generation." },
];

const el = {
  shell: document.querySelector(".learn-shell"),
  courseGrid: document.getElementById("courseGridStudy"),
  status: document.getElementById("learn-status"),
  subtitle: document.getElementById("learn-subtitle"),
  fetchOverlay: document.getElementById("studyFetchOverlay"),
};

init().catch((error) => {
  console.error(error);
  if (el.status) {
    el.status.textContent = "Failed to load study materials.";
  }
});

async function init() {
  showFetchOverlay(true);
  try {
    const session = await requireSession();
    if (!session) {
      return;
    }
    pageState.sessionUserId = session.user.id;

    const userIds = await getAllowedUserIds(session.user.id);
    const [questions, tasks, milestones] = await Promise.all([
      fetchRows("questions", "course", userIds),
      fetchRows("study_tasks", "course", userIds),
      Promise.resolve([]),
    ]);

    const liveMap = await fetchLiveCourseMap();
    pageState.questions = questions;
    pageState.tasks = tasks;
    pageState.milestones = milestones;
    pageState.liveMap = liveMap;

    renderCourses(questions, tasks, milestones, liveMap);

    if (el.courseGrid) {
      el.courseGrid.addEventListener("click", onCourseGridClick);
      document.addEventListener("click", onGlobalClick);
      window.addEventListener("resize", queueViewerLayoutSync);
    }
  } finally {
    showFetchOverlay(false);
  }
}

async function requireSession() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    window.location.href = "index.html";
    return null;
  }
  return data.session;
}

async function getAllowedUserIds(meId) {
  const ids = [meId];
  const { data } = await supabase
    .from("pair_links")
    .select("partner_id")
    .eq("user_id", meId)
    .maybeSingle();

  if (data?.partner_id) {
    ids.push(data.partner_id);
  }
  return ids;
}

async function fetchRows(table, column, userIds) {
  const { data, error } = await supabase.from(table).select(`${column}, user_id`).in("user_id", userIds);
  if (error) {
    throw error;
  }
  return data || [];
}

function renderCourses(questions, tasks, milestones, liveMap = new Map()) {
  setViewerMode(false);
  pageState.selectedCourse = null;
  const allCourses = buildCourseList(liveMap);

  const cards = allCourses.map((meta, index) => {
    const live = liveMap.get(meta.name);
    const ready = Boolean(live?.is_active);
    const isFirstCourse = index === 0;
    const canOpen = isFirstCourse;
    const totalChapters = Number(live?.total_chapters || meta.total || 0) || meta.total;
    const label = ready ? `${totalChapters} Chapters` : "Coming Soon";

    return `
      <article class="course-card-study ${ready ? "" : "coming-soon"}" data-course="${escapeHtml(meta.name)}">
        ${canOpen ? "" : '<div class="coming-soon-badge"><i class="fas fa-hourglass-half"></i> Coming Soon</div>'}
        <div class="course-icon-study"><i class="${meta.icon}" style="color: ${meta.color};"></i></div>
        <h3>${escapeHtml(meta.name)}</h3>
        <p>${escapeHtml(live?.description || meta.desc)}</p>
        <div class="course-meta-study">
          <span class="chapter-count"><i class="far fa-file-alt"></i> ${totalChapters} Total</span>
          <span class="status-badge ${ready ? "status-ready" : "status-soon"}"><i class="${ready ? "fas fa-check-circle" : "fas fa-clock"}"></i> ${escapeHtml(label)}</span>
        </div>
        <button
          class="open-course-btn"
          type="button"
          data-open-course="${escapeHtml(meta.name)}"
          data-total-chapters="${totalChapters}"
          ${canOpen ? "" : "disabled"}
        >
          <i class="fas fa-book-reader"></i> ${canOpen ? "Open Course" : "Coming Soon"}
        </button>
      </article>
    `;
  }).join("");

  el.courseGrid.innerHTML = cards;
  if (el.status) {
    el.status.textContent = "";
  }
}

function buildCourseList(liveMap) {
  const merged = [...COURSE_META.map((course) => ({ ...course }))];
  liveMap.forEach((row, name) => {
    if (merged.some((item) => item.name === name)) {
      return;
    }
    merged.push({
      name,
      icon: row.icon || "fas fa-book",
      color: row.color || "#2d6a4f",
      total: Number(row.total_chapters || 1),
      desc: row.description || "Custom course loaded from database.",
    });
  });
  return merged;
}

async function fetchLiveCourseMap() {
  try {
    const { data, error } = await supabase
      .from("courses")
      .select("name, description, is_active, code, total_chapters");

    if (error) {
      return new Map();
    }

    return new Map((data || []).filter((row) => row?.name).map((row) => [row.name, row]));
  } catch (error) {
    return new Map();
  }
}

async function onCourseGridClick(event) {
  const pickerToggleBtn = event.target.closest("#chapterPickerBtn");
  if (pickerToggleBtn) {
    toggleChapterPicker();
    return;
  }

  const pickerOption = event.target.closest(".chapter-picker-option");
  if (pickerOption) {
    const chapterNo = Number(pickerOption.getAttribute("data-chapter") || 0);
    if (chapterNo > 0) {
      await renderSelectedChapter(chapterNo);
    }
    setChapterPickerOpen(false);
    return;
  }

  const backToListBtn = event.target.closest("[data-action='back-course-list']");
  if (backToListBtn) {
    renderCourses(pageState.questions, pageState.tasks, pageState.milestones, pageState.liveMap);
    return;
  }

  const openButton = event.target.closest(".open-course-btn");
  if (openButton) {
    const courseName = openButton.dataset.openCourse || "";
    const totalChapters = Number(openButton.dataset.totalChapters || 0);
    if (courseName && totalChapters > 0) {
      await openCourseViewer(courseName, totalChapters);
    }
    return;
  }

}

function onGlobalClick(event) {
  if (!pageState.selectedCourse || !el.courseGrid) {
    return;
  }
  if (!(event.target instanceof Element)) {
    return;
  }

  const picker = el.courseGrid.querySelector("#chapterPicker");
  if (!picker) {
    return;
  }

  if (!picker.contains(event.target)) {
    setChapterPickerOpen(false);
  }
}

async function openCourseViewer(courseName, totalChapters) {
  showFetchOverlay(true);
  try {
    setViewerMode(true);
    const meta = getCourseMeta(courseName);
    const safeCourse = escapeHtml(courseName);
    const chapterItems = Array.from({ length: totalChapters }, (_, idx) => {
      const chapterNo = idx + 1;
      return `<button type="button" class="chapter-picker-option ${chapterNo === 1 ? "active" : ""}" data-chapter="${chapterNo}" role="option" aria-selected="${chapterNo === 1 ? "true" : "false"}">Chapter ${chapterNo}</button>`;
    }).join("");

    pageState.selectedCourse = {
      name: courseName,
      totalChapters,
    };

    if (!el.courseGrid) {
      return;
    }

    el.courseGrid.innerHTML = `
    <section class="course-viewer-shell card">
      <header class="course-viewer-header">
        <div class="course-viewer-title-block">
          <button class="back-course-list-btn" type="button" data-action="back-course-list">
            <i class="fas fa-arrow-left"></i> Back to Course List
          </button>
          <h2>
            <i class="${escapeHtml(meta.icon)}" style="color:${escapeHtml(meta.color)}"></i>
            ${safeCourse}
          </h2>
          <p>${escapeHtml(meta.desc)}</p>
        </div>
        <div class="course-viewer-count">
          <span id="viewerCurrentChapter">1</span> / <span id="viewerTotalChapters">${totalChapters}</span>
        </div>
      </header>

      <section class="course-viewer-selectors">
        <label for="chapterPickerBtn"><i class="fas fa-book"></i> Select Chapter</label>
        <div class="chapter-picker" id="chapterPicker">
          <button id="chapterPickerBtn" class="chapter-picker-btn" type="button" aria-haspopup="listbox" aria-expanded="false">
            <span>Chapter 1</span>
            <i class="fas fa-chevron-down" aria-hidden="true"></i>
          </button>
          <div id="chapterPickerMenu" class="chapter-picker-menu hidden" role="listbox" aria-label="Chapter list">
            ${chapterItems}
          </div>
        </div>
      </section>


      <section class="course-viewer-panel" id="viewerChapterPanel" aria-live="polite">
        <div class="chapter-loading"><i class="fas fa-spinner fa-spin"></i> Loading chapter content...</div>
      </section>
    </section>
  `;

    if (el.status) {
      el.status.textContent = "";
    }

    queueViewerLayoutSync();
    await renderSelectedChapter(1);
    queueViewerLayoutSync();
  } finally {
    showFetchOverlay(false);
  }
}

async function renderSelectedChapter(chapterNo) {
  if (!pageState.selectedCourse || !el.courseGrid) {
    return;
  }

  const { name: courseName, totalChapters } = pageState.selectedCourse;
  const panel = el.courseGrid.querySelector("#viewerChapterPanel");
  if (!panel) {
    return;
  }

  const pickerBtn = el.courseGrid.querySelector("#chapterPickerBtn span");
  if (pickerBtn) {
    pickerBtn.textContent = `Chapter ${chapterNo}`;
  }

  el.courseGrid.querySelectorAll(".chapter-picker-option").forEach((option) => {
    const optionChapter = Number(option.getAttribute("data-chapter") || 0);
    const isActive = optionChapter === chapterNo;
    option.classList.toggle("active", isActive);
    option.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  const currentEl = el.courseGrid.querySelector("#viewerCurrentChapter");
  if (currentEl) {
    currentEl.textContent = String(chapterNo);
  }

  panel.innerHTML = '<div class="chapter-loading"><i class="fas fa-spinner fa-spin"></i> Loading chapter content...</div>';
  showFetchOverlay(true);

  try {
    const payload = await loadChapterData(courseName, chapterNo);
    const safeTitle = escapeHtml(payload.title || `Chapter ${chapterNo}`);
    const safeContent = sanitizeChapterHtml(payload.content || "<p>No content found for this chapter.</p>");
    panel.innerHTML = `
      <article class="chapter-content-card">
        <h5>${safeTitle}</h5>
        <small>Chapter ${chapterNo} of ${totalChapters}</small>
        <div class="chapter-content-html">${safeContent}</div>
      </article>
    `;
  } catch (error) {
    console.error(error);
    panel.innerHTML = '<div class="chapter-error"><i class="fas fa-triangle-exclamation"></i> Could not load this chapter right now.</div>';
  } finally {
    showFetchOverlay(false);
  }
}

function showFetchOverlay(isVisible) {
  if (!el.fetchOverlay) {
    return;
  }
  el.fetchOverlay.classList.toggle("hidden", !isVisible);
}

function toggleChapterPicker() {
  if (!el.courseGrid) {
    return;
  }

  const menu = el.courseGrid.querySelector("#chapterPickerMenu");
  const isOpen = menu ? !menu.classList.contains("hidden") : false;
  setChapterPickerOpen(!isOpen);
}

function setChapterPickerOpen(isOpen) {
  if (!el.courseGrid) {
    return;
  }

  const menu = el.courseGrid.querySelector("#chapterPickerMenu");
  const button = el.courseGrid.querySelector("#chapterPickerBtn");
  const picker = el.courseGrid.querySelector("#chapterPicker");
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

  if (el.shell) {
    el.shell.classList.toggle("chapter-picker-open", isOpen);
  }

  queueViewerLayoutSync();
}

function queueViewerLayoutSync() {
  if (!el.shell || !el.courseGrid || !el.shell.classList.contains("viewer-mode")) {
    return;
  }

  if (viewerLayoutRaf) {
    cancelAnimationFrame(viewerLayoutRaf);
  }

  viewerLayoutRaf = requestAnimationFrame(() => {
    viewerLayoutRaf = 0;
    syncViewerLayout();
  });
}

function syncViewerLayout() {
  if (!el.shell || !el.courseGrid || !el.shell.classList.contains("viewer-mode")) {
    return;
  }

  const header = el.courseGrid.querySelector(".course-viewer-header");
  const selectors = el.courseGrid.querySelector(".course-viewer-selectors");
  if (!header || !selectors) {
    return;
  }

  const headerHeight = Math.ceil(header.getBoundingClientRect().height);
  const selectorsHeight = Math.ceil(selectors.getBoundingClientRect().height);

  el.shell.style.setProperty("--viewer-header-height", `${headerHeight}px`);
  el.shell.style.setProperty("--viewer-selectors-height", `${selectorsHeight}px`);
}

async function loadChapterData(courseName, chapterNo) {
  const cacheKey = `${slugify(courseName)}::${chapterNo}`;
  if (chapterCache.has(cacheKey)) {
    return chapterCache.get(cacheKey);
  }

  const payload = await loadChapterWithSubsections(courseName, chapterNo);
  chapterCache.set(cacheKey, payload);
  return payload;
}

async function loadChapterWithSubsections(courseName, chapterNo) {
  const sections = [];

  for (let subsectionNo = 1; subsectionNo <= MAX_SUBSECTIONS_PER_CHAPTER; subsectionNo += 1) {
    const url = getChapterUrl(courseName, chapterNo, subsectionNo);

    try {
      const payload = await loadScriptPayload(url);
      sections.push({
        subsectionNo,
        title: payload.title || `Subsection ${subsectionNo}`,
        content: payload.content || "",
      });
    } catch (error) {
      if (sections.length === 0 && subsectionNo === 1) {
        throw error;
      }
      break;
    }
  }

  if (!sections.length) {
    throw new Error(`No subsection content found for chapter ${chapterNo}.`);
  }

  const chapterTitle = sections[0].title || `Chapter ${chapterNo}`;
  const chapterHtml = sections.map((section) => {
    const safeTitle = escapeHtml(section.title || `Subsection ${section.subsectionNo}`);
    const hideTitle = shouldHideSubsectionTitle(section.title, section.content);
    return `
      <section class="chapter-subsection" data-subsection="${section.subsectionNo}">
        ${hideTitle ? "" : `<h6 class=\"chapter-subsection-title\">${safeTitle}</h6>`}
        <div class="chapter-subsection-body">${section.content}</div>
      </section>
    `;
  }).join("");

  return {
    title: chapterTitle,
    content: chapterHtml,
  };
}

function getChapterUrl(courseName, chapterNo, subsectionNo = 1) {
  const slug = COURSE_SLUG_OVERRIDES[courseName] || slugify(courseName);
  return `${REMOTE_STUDY_BASE}/${slug}/chapter${chapterNo}/ch${chapterNo}-${subsectionNo}.js?t=${Date.now()}`;
}

function loadScriptPayload(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = url;
    script.async = true;

    const clean = () => {
      script.onload = null;
      script.onerror = null;
      script.remove();
    };

    script.onload = () => {
      const data = window.currentSubsectionData;
      clean();

      if (data && typeof data === "object" && data.content) {
        resolve({
          title: data.title || "Untitled Chapter",
          content: data.content,
        });
        return;
      }

      reject(new Error("Chapter payload was empty."));
    };

    script.onerror = () => {
      clean();
      reject(new Error(`Failed to load script: ${url}`));
    };

    document.head.appendChild(script);
  });
}

function sanitizeChapterHtml(rawHtml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(String(rawHtml || ""), "text/html");

  doc.querySelectorAll("script, iframe, object, embed").forEach((node) => node.remove());

  doc.querySelectorAll("*").forEach((node) => {
    [...node.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = String(attr.value || "").trim().toLowerCase();
      if (name.startsWith("on")) {
        node.removeAttribute(attr.name);
      }
      if ((name === "href" || name === "src") && value.startsWith("javascript:")) {
        node.removeAttribute(attr.name);
      }
    });
  });

  return doc.body.innerHTML;
}

function shouldHideSubsectionTitle(title, html) {
  const cleanedTitle = normalizeText(title);
  if (!cleanedTitle) {
    return false;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(String(html || ""), "text/html");
  const firstHeading = doc.querySelector("h1, h2, h3, h4, h5, h6");
  if (!firstHeading) {
    return false;
  }

  const firstHeadingText = normalizeText(firstHeading.textContent || "");
  return firstHeadingText && firstHeadingText === cleanedTitle;
}

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function countByCourse(rows) {
  const map = new Map();
  rows.forEach((row) => {
    if (!row.course) {
      return;
    }
    map.set(row.course, (map.get(row.course) || 0) + 1);
  });
  return map;
}

async function onLogout() {
}

function setViewerMode(isViewerMode) {
  if (!el.shell) {
    return;
  }
  el.shell.classList.toggle("viewer-mode", Boolean(isViewerMode));
  if (!isViewerMode) {
    el.shell.classList.remove("chapter-picker-open");
    el.shell.style.removeProperty("--viewer-header-height");
    el.shell.style.removeProperty("--viewer-selectors-height");
    if (viewerLayoutRaf) {
      cancelAnimationFrame(viewerLayoutRaf);
      viewerLayoutRaf = 0;
    }
    return;
  }

  queueViewerLayoutSync();
}

function getCourseMeta(courseName) {
  const meta = COURSE_META.find((item) => item.name === courseName);
  if (meta) {
    return meta;
  }
  return {
    name: courseName,
    icon: "fas fa-book",
    color: "#2d6a4f",
    total: 1,
    desc: "Course content loaded from database.",
  };
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

