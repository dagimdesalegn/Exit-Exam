import { supabase } from "./supabaseClient.js";

const REMOTE_STUDY_BASE = "https://exam-system-rho.vercel.app/studyCourses";
const MAX_SUBSECTIONS_PER_CHAPTER = 40;
const COURSE_SLUG_OVERRIDES = {
  "Data Communication and Computer Networking": "data-communication-networking",
};
const UPLOAD_DISABLED_COURSES = new Set();
const chapterCache = new Map();
const pageState = {
  sessionUserId: null,
  questions: [],
  tasks: [],
  milestones: [],
  liveMap: new Map(),
  selectedCourse: null,
};

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
};

init().catch((error) => {
  console.error(error);
  if (el.status) {
    el.status.textContent = "Failed to load study materials.";
  }
});

async function init() {
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
    el.courseGrid.addEventListener("submit", onCourseFileUploadSubmit);
    document.addEventListener("click", onGlobalClick);
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
  const qMap = countByCourse(questions);
  const tMap = countByCourse(tasks);
  const mMap = countByCourse(milestones);

  const allCourses = buildCourseList(liveMap);

  const cards = allCourses.map((meta) => {
    const live = liveMap.get(meta.name);
    const available = (qMap.get(meta.name) || 0) + (tMap.get(meta.name) || 0) + (mMap.get(meta.name) || 0);
    const ready = Boolean(live?.is_active);
    const totalChapters = Number(live?.total_chapters || meta.total || 0) || meta.total;
    const needsUpload = !live || !Number(live?.total_chapters || 0);
    const uploadsDisabled = isUploadDisabledCourse(meta.name);
    const label = ready ? `${totalChapters} Chapters` : "Coming Soon";

    return `
      <article class="course-card-study ${ready ? "" : "coming-soon"}" data-course="${escapeHtml(meta.name)}">
        ${ready ? "" : '<div class="coming-soon-badge"><i class="fas fa-hourglass-half"></i> Coming Soon</div>'}
        <div class="course-icon-study"><i class="${meta.icon}" style="color: ${meta.color};"></i></div>
        <h3>${escapeHtml(meta.name)}</h3>
        <p>${escapeHtml(live?.description || meta.desc)}</p>
        <div class="course-meta-study">
          <span class="chapter-count"><i class="far fa-file-alt"></i> ${totalChapters} Total</span>
          <span class="status-badge ${ready ? "status-ready" : "status-soon"}"><i class="${ready ? "fas fa-check-circle" : "fas fa-clock"}"></i> ${escapeHtml(label)}</span>
        </div>
        ${!uploadsDisabled ? `
          <form class="course-file-upload-form" data-course="${escapeHtml(meta.name)}">
            <input type="file" class="course-file-input" />
            <button type="submit" class="course-upload-btn"><i class="fas fa-upload"></i> Upload File</button>
          </form>
          <div class="course-files-list" data-course-files="${escapeHtml(meta.name)}"></div>
        ` : ""}
        <button
          class="open-course-btn"
          type="button"
          data-open-course="${escapeHtml(meta.name)}"
          data-total-chapters="${totalChapters}"
          ${ready ? "" : "disabled"}
        >
          <i class="fas fa-book-reader"></i> ${ready ? "Open Course" : "Not Ready Yet"}
        </button>
      </article>
    `;
  }).join("");

  el.courseGrid.innerHTML = cards;
  allCourses.forEach((course) => {
    void loadCourseFiles(course.name);
  });
  if (el.status) {
    el.status.textContent = "";
  }
}

function showUploadModal(message, isError = false) {
  let modal = document.getElementById("upload-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "upload-modal";
    modal.style.position = "fixed";
    modal.style.top = "50%";
    modal.style.left = "50%";
    modal.style.transform = "translate(-50%, -50%)";
    modal.style.background = "#fff";
    modal.style.padding = "20px 28px";
    modal.style.borderRadius = "14px";
    modal.style.zIndex = "9999";
    modal.style.boxShadow = "0 12px 28px rgba(0,0,0,0.18)";
    modal.style.fontSize = "1rem";
    modal.style.fontWeight = "700";
    modal.style.textAlign = "center";
    document.body.appendChild(modal);
  }

  modal.style.border = `2px solid ${isError ? "#c94242" : "#1b7a49"}`;
  modal.style.color = isError ? "#c94242" : "#1b7a49";
  modal.textContent = message;
  modal.classList.remove("hidden");

  window.setTimeout(() => {
    modal?.classList.add("hidden");
  }, 2200);
}

async function onCourseFileUploadSubmit(event) {
  const form = event.target instanceof Element
    ? event.target.closest(".course-file-upload-form")
    : null;
  if (!form) {
    return;
  }

  event.preventDefault();
  const input = form.querySelector(".course-file-input");
  const course = String(form.getAttribute("data-course") || "").trim();
  if (!input || !(input instanceof HTMLInputElement) || !course) {
    return;
  }

  if (!input.files || !input.files.length) {
    showUploadModal("Please select a file to upload.", true);
    return;
  }

  const uploadBtn = form.querySelector(".course-upload-btn");
  const file = input.files[0];
  const safeName = String(file.name || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
  const folder = slugify(course) || "course";
  const filePath = `${folder}/${Date.now()}_${safeName}`;

  if (uploadBtn instanceof HTMLButtonElement) {
    uploadBtn.disabled = true;
  }

  try {
    const { error: storageError } = await supabase.storage
      .from("course-files")
      .upload(filePath, file, { upsert: false });

    if (storageError) {
      throw storageError;
    }

    const { error: dbError } = await supabase.from("course_files").insert({
      user_id: pageState.sessionUserId,
      course,
      file_name: file.name,
      file_path: filePath,
      uploaded_at: new Date().toISOString(),
    });

    if (dbError) {
      throw dbError;
    }

    input.value = "";
    await loadCourseFiles(course);
    showUploadModal("File uploaded successfully.");
  } catch (error) {
    console.error(error);
    showUploadModal(`Upload failed: ${error?.message || error}`, true);
  } finally {
    if (uploadBtn instanceof HTMLButtonElement) {
      uploadBtn.disabled = false;
    }
  }
}

async function loadCourseFiles(course) {
  if (!el.courseGrid) {
    return;
  }

  const container = Array.from(el.courseGrid.querySelectorAll("[data-course-files]"))
    .find((node) => node.getAttribute("data-course-files") === course);
  if (!container) {
    return;
  }

  const { data, error } = await supabase
    .from("course_files")
    .select("file_name, file_path, uploaded_at")
    .eq("course", course)
    .order("uploaded_at", { ascending: false })
    .limit(6);

  if (error || !Array.isArray(data) || !data.length) {
    container.innerHTML = '<small>No files uploaded yet.</small>';
    return;
  }

  container.innerHTML = data.map((row) => {
    const { data: publicData } = supabase.storage.from("course-files").getPublicUrl(row.file_path);
    const url = publicData?.publicUrl || "#";
    const fileName = escapeHtml(row.file_name || "file");
    const uploadedAt = row.uploaded_at ? new Date(row.uploaded_at).toLocaleString() : "";
    return `<div class="course-file-row"><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${fileName}</a> <span style="font-size:0.78em;color:#6b6b6b;">(${escapeHtml(uploadedAt)})</span></div>`;
  }).join("");
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

  const uploadChapterBtn = event.target.closest("[data-action='upload-chapter']");
  if (uploadChapterBtn) {
    await uploadCurrentChapterContent();
    return;
  }

  const uploadButton = event.target.closest(".course-upload-btn");
  if (uploadButton) {
    const courseName = uploadButton.dataset.uploadCourse || "";
    if (courseName) {
      await uploadCourseToDatabase(courseName, uploadButton);
      return;
    }
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
  setViewerMode(true);
  const meta = getCourseMeta(courseName);
  const uploadsDisabled = isUploadDisabledCourse(courseName);
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
        <div class="course-viewer-actions">
          ${uploadsDisabled ? '<small class="course-note"><i class="fas fa-circle-info"></i> Chapter upload is disabled for this course.</small>' : '<button class="course-upload-btn" type="button" data-action="upload-chapter"><i class="fas fa-file-upload"></i> Upload This Chapter</button>'}
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

  await renderSelectedChapter(1);
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
  }
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
}

async function loadChapterData(courseName, chapterNo) {
  const cacheKey = `${slugify(courseName)}::${chapterNo}`;
  if (chapterCache.has(cacheKey)) {
    return chapterCache.get(cacheKey);
  }

  const uploaded = await loadChapterFromDatabase(courseName, chapterNo);
  if (uploaded) {
    chapterCache.set(cacheKey, uploaded);
    return uploaded;
  }

  const payload = await loadChapterWithSubsections(courseName, chapterNo);
  chapterCache.set(cacheKey, payload);
  return payload;
}

async function loadChapterFromDatabase(courseName, chapterNo) {
  if (!pageState.sessionUserId) {
    return null;
  }

  const { data, error } = await supabase
    .from("course_chapters")
    .select("title, content_html")
    .eq("user_id", pageState.sessionUserId)
    .eq("course", courseName)
    .eq("chapter_no", chapterNo)
    .maybeSingle();

  if (error || !data?.content_html) {
    return null;
  }

  return {
    title: data.title || `Chapter ${chapterNo}`,
    content: data.content_html,
  };
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

async function uploadCourseToDatabase(courseName, buttonEl) {
  const meta = COURSE_META.find((item) => item.name === courseName);
  if (!meta) {
    return;
  }

  if (buttonEl) {
    buttonEl.disabled = true;
    buttonEl.textContent = "Uploading...";
  }

  try {
    const code = slugify(meta.name).replace(/-/g, "_").toUpperCase().slice(0, 20);
    const payload = {
      name: meta.name,
      code,
      description: meta.desc,
      is_active: true,
      total_chapters: meta.total,
    };

    const { error } = await supabase.from("courses").upsert(payload, { onConflict: "name" });
    if (error) {
      throw error;
    }

    pageState.liveMap = await fetchLiveCourseMap();
    renderCourses(pageState.questions, pageState.tasks, pageState.milestones, pageState.liveMap);
  } catch (error) {
    console.error(error);
    if (el.status) {
      el.status.textContent = `Could not upload ${courseName}. Please run courses SQL setup first.`;
    }
    if (buttonEl) {
      buttonEl.disabled = false;
      buttonEl.innerHTML = '<i class="fas fa-upload"></i> Upload Course';
    }
  }
}

async function uploadCurrentChapterContent() {
  if (!pageState.selectedCourse || !el.courseGrid || !pageState.sessionUserId) {
    return;
  }

  const courseName = pageState.selectedCourse.name;
  if (isUploadDisabledCourse(courseName)) {
    if (el.status) {
      el.status.textContent = `Upload is disabled for ${courseName}.`;
    }
    return;
  }
  const chapterNo = Number(el.courseGrid.querySelector("#viewerCurrentChapter")?.textContent || 1);
  const defaultTitle = `Chapter ${chapterNo}`;
  const title = window.prompt("Chapter title", defaultTitle);
  if (title === null) {
    return;
  }

  const html = window.prompt("Paste chapter HTML content", "<p>Chapter content...</p>");
  if (html === null) {
    return;
  }

  const contentHtml = sanitizeChapterHtml(html);
  if (!String(contentHtml || "").trim()) {
    if (el.status) {
      el.status.textContent = "Chapter upload canceled: content is empty.";
    }
    return;
  }

  const { error } = await supabase.from("course_chapters").upsert({
    user_id: pageState.sessionUserId,
    course: courseName,
    chapter_no: chapterNo,
    title: String(title || defaultTitle).trim(),
    content_html: contentHtml,
    updated_at: new Date().toISOString(),
  }, {
    onConflict: "user_id,course,chapter_no",
  });

  if (error) {
    if (el.status) {
      el.status.textContent = `Could not upload chapter content: ${error.message}`;
    }
    return;
  }

  chapterCache.delete(`${slugify(courseName)}::${chapterNo}`);
  await renderSelectedChapter(chapterNo);
  if (el.status) {
    el.status.textContent = `Uploaded chapter ${chapterNo} for ${courseName}.`;
  }
}

function setViewerMode(isViewerMode) {
  if (!el.shell) {
    return;
  }
  el.shell.classList.toggle("viewer-mode", Boolean(isViewerMode));
  if (!isViewerMode) {
    el.shell.classList.remove("chapter-picker-open");
  }
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

function isUploadDisabledCourse(courseName) {
  return UPLOAD_DISABLED_COURSES.has(String(courseName || "").trim().toLowerCase());
}
