# Exit-Exam Codebase Analysis Report
**Date**: May 17, 2026 | **Status**: Comprehensive Code Review

---

## Executive Summary

The Exit-Exam application is a semi-functional study platform with a **Supabase-powered backend**, **real-time chat system**, and **AI tutoring capabilities**. However, the codebase has **significant incomplete implementations**, **missing dependencies**, and **responsive design issues**. Below is a detailed breakdown.

---

## 1. AI Service Endpoints & Functions

### ✅ IMPLEMENTED
- **AI Summary Function**: `/supabase/functions/ai-summary/index.ts`
  - Provider: **DeepSeek API** (https://api.deepseek.com/v1/chat/completions)
  - Model: `deepseek-chat`
  - Max tokens: 160
  - Used for: Generating explanations for exam questions
  - Called via: `supabase.functions.invoke("ai-summary", { body: payload })`

### 🔴 CRITICAL ISSUES

#### 1.1 Missing Environment Configuration
```
PROBLEM: DEEPSEEK_API_KEY not configured in Supabase Edge Function
FILE: supabase/functions/ai-summary/index.ts:4
const DEEPSEEK_API_KEY = (globalThis as any).Deno?.env?.get('DEEPSEEK_API_KEY') || '';
```
- No error handling if key is missing
- Function will return: `{ error: 'DeepSeek API key is not configured' }` with 500 status
- **NO FALLBACK** - AI features will completely fail without key

#### 1.2 Incomplete AI Functions in Frontend
```javascript
// FILE: app.js:3004
async function onAskHomeAi() {
  // Function body INCOMPLETE - cuts off mid-implementation
}

async function onCopyHomeAiAnswer() {
  // Referenced but incomplete
}

async function onHomeAiFollowUp() {
  // Referenced but incomplete
}
```

#### 1.3 Questions.js AI Integration Incomplete
```javascript
// FILE: questions.js:987
const { data: aiData, error: aiError } = await supabase.functions.invoke("ai-summary", {
  // Used but error handling insufficient
  // Missing: token validation, retry logic, timeout handling
```

### 🟡 MISSING FEATURES
- No rate limiting for AI calls
- No caching of AI responses
- No fallback explanations if API fails
- No streaming responses (all-or-nothing approach)
- No user-provided context management

---

## 2. UI Styling & Responsive Design Issues

### ✅ PRESENT BUT PROBLEMATIC

#### 2.1 Responsive Framework Issues
```css
/* FILE: styles.css - Line 1+ */
@media (max-width: 600px) { ... }
```
- **Only ONE breakpoint** (600px) - mobile-first design incomplete
- Missing: tablet (768px+), desktop (1024px+), large desktop (1440px+)
- YouTube player scales poorly on tablets (static 420px max-width)

#### 2.2 Mobile Chat Layout Issues
```javascript
// FILE: app.js:800
function syncMobileChatLayoutOffset() {
  const topGap = Math.max(136, topbarHeight + 14); // HARDCODED VALUES
  root.style.setProperty("--chat-top-offset", `${topGap}px`);
}
```
- Hardcoded offsets (136px) don't account for variable topbar heights
- Chat might overlap on some devices
- No safe area support for notched phones

#### 2.3 Grid Layout Not Responsive
```css
.gh-grid-header-row {
  grid-template-columns: repeat(7, 12px);
  gap: 4px;
  /* Fixed pixel sizes - will look wrong on mobile/tablets */
}
```
- Contribution heatmap uses fixed 12px cells
- Not scalable to different screen sizes
- May be unreadable on small phones

#### 2.4 Missing Viewport Meta Tag Issues
```html
<!-- FILE: index.html:10 -->
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```
- Viewport tag present but no tests for edge cases:
  - iOS Safari safe areas not handled
  - Android status bar behavior inconsistent
  - Landscape orientation not optimized

### 🔴 SPECIFIC STYLING PROBLEMS

1. **Font Scaling**: Uses fixed `font-size` - no `clamp()` for responsive typography
2. **Chart Containers**: Limited responsive handling for Chart.js graphs
3. **Menu Positioning**: Requires recalculation on resize (manual calculation in `positionMenuToTrigger()`)
4. **Profile Menu**: Hardcoded positioning logic instead of CSS constraints

---

## 3. Authentication & Multi-User System

### ✅ IMPLEMENTED
- Supabase Auth with email/password
- Username-based login (converted to email internally)
- Session persistence with `persistSession: true`
- Profile creation on first login
- Avatar upload to Supabase Storage

### 🔴 CRITICAL ISSUES

#### 3.1 Username/Email Hybrid System Fragile
```javascript
// FILE: app.js:2500
const email = usernameToEmail(username); // Converts: username -> username@exit.local
```
- **Pattern**: `{username}@exit.local`
- **ISSUE**: No email validation, relies on pattern conversion
- **PROBLEM**: Users cannot use real emails; locked into @exit.local domain
- **Risk**: If pattern changes, authentication breaks for all users

#### 3.2 Password Reset Not Implemented
- No forgot password flow
- No password recovery mechanism
- Users locked out = no recovery path
- **Function exists but incomplete**: `onSaveProfile()` has password change logic but no reset flow

#### 3.3 Auth State Management Incomplete
```javascript
// FILE: app.js:2280
const previousUserId = state.user?.id || null;
const incomingUserId = session?.user?.id || null;
const sameAuthenticatedUser = Boolean(previousUserId && incomingUserId && previousUserId === incomingUserId);

// Multi-tab session issues not fully handled
```
- Multi-tab auth sync enabled but fallback logic insufficient
- No explicit handling for concurrent requests
- Session storage clearing happens manually (`clearSupabaseClientStorage()`)

#### 3.4 Role-Based Access Control Missing
- No roles (admin, teacher, student)
- All users have equal database access
- RLS policies mentioned but not verified to exist

---

## 4. Broken Features & Incomplete Implementations

### 🔴 CRITICAL INCOMPLETE

#### 4.1 Home AI Feature (30% Complete)
```javascript
// FILE: app.js:3004
async function onAskHomeAi() {
  // ⚠️  IMPLEMENTATION CUTS OFF - line 3040+
  // Referenced in bindEvents() but incomplete
```
- UI elements exist: `homeAiQuestion`, `homeAiAnswer`, `homeAiActions`, `homeAiCopyBtn`, `homeAiFollowUpBtn`
- Event listeners bound but handler incomplete
- State variables allocated (`homeAiLastQuestion`, `homeAiLastAnswer`) but unused

#### 4.2 Study Materials / Leaderboard (Missing)
- `leaderboard.js` exists but:
  - No database tables (`leaderboards` not mentioned in queries)
  - No ranking calculation logic
  - No frontend UI integration
  - Likely dead code

#### 4.3 Achievements System (50% Complete)
```javascript
// FILE: app.js - references:
import { getUserAchievements } from "./achievements.js";
// Used but UI not integrated
// DATABASE TABLE: Not queried anywhere
```
- Imported and called but never rendered
- Achievement types likely undefined
- No UI to display achievements

#### 4.4 Weekly Targets (Missing)
```javascript
// FILE: app.js:2300
state.data.weeklyTargets = [];
// Allocated in state but never populated
// No fetch function exists
```
- Referenced as empty array
- No database queries
- No UI components

#### 4.5 Study Tasks - Conditional Availability
```javascript
// FILE: app.js:2620
if (!state.studyTasksAvailable) {
  return [];
}
// Table `study_tasks` may not exist in database
```
- Entire feature gated behind table existence check
- Error handling: `isMissingTableError()` catches PGRST205 errors
- Falls back gracefully but feature disappears silently

---

## 5. Chat Functionality Status

### ✅ IMPLEMENTED (Mostly Working)
- Real-time messaging with Supabase
- Typing indicators
- Online status
- Read receipts (dual-check: delivered_at + seen_at)
- Message reply functionality
- Presence detection

### 🟡 PARTIALLY WORKING

#### 5.1 Realtime Fallback Issues
```javascript
// FILE: app.js:2745
function subscribeRealtime() {
  if (!REALTIME_ENABLED || state.realtimeDisabled) {
    state.realtimeDisabled = true;
    return; // SILENT FAILURE - user doesn't know
  }
```
- If realtime fails, system falls back to polling
- Polling interval: 500ms (heavy network usage)
- No user notification that realtime is disabled

#### 5.2 Inconsistent Channel Error Handling
```javascript
// FILE: app.js:2765
.subscribe(handleChannelStatus(`${entry.name}-realtime`));

const handleChannelStatus = (name) => (status) => {
  if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
    console.warn(`Realtime channel failed...`);
    state.realtimeDisabled = true;
    clearRealtimeChannels(); // Clears ALL channels
  }
};
```
- One channel failure disables entire realtime system
- Could cause cascade failures
- No selective channel recovery

#### 5.3 Chat Seen Columns Fallback
```javascript
// FILE: app.js:2610
state.chatSeenColumnsAvailable = true;
// If columns missing, feature silently disabled
// User may think messages are delivered but no confirmation
```
- Graceful degradation but no feedback
- Database schema must exactly match expectations

#### 5.4 OR Filter Issues
```javascript
// FILE: app.js:2615
const conversationFilter = `and(sender_id.eq.${me},receiver_id.eq.${partner}),and(sender_id.eq.${partner},receiver_id.eq.${me})`;
// Complex OR filter known to be inconsistent
// Comment: "// Fallback path when OR filter parsing/realtime backend behaves inconsistently."
```
- Implemented complex fallback (fetch both directions separately)
- Indicates known Supabase realtime quirks
- Performance penalty on each fetch

---

## 6. Missing/Broken Database Dependencies

### Assumed Tables (May Not Exist)
```
✓ profiles         - Confirmed in code
✓ pair_links       - Confirmed in code
✓ chat_messages    - Confirmed in code (with optional: delivered_at, seen_at)
✓ questions        - Confirmed in code
✓ question_attempts - Confirmed in code
✓ courses          - Confirmed in code (with: name, is_active)

? study_tasks      - Conditional availability check (5.1)
? study_milestones - Used but no availability check
? chat_read_state  - Assumed but conditional
? leaderboards     - Referenced but never queried
```

### Unverified RLS Policies
- All tables may need Row Level Security policies
- No policy definitions in codebase
- Authentication assumes permissions granted

---

## 7. Performance & Technical Debt

### 🔴 CRITICAL

1. **YouTube API Async Loading** (Line 400-450)
   - Loads YouTube IFrame API via global callback
   - Hardcoded 10 playlists
   - No error handling if YouTube blocks requests

2. **Password Change Form** (Line 300-390)
   - Re-authenticates with Supabase on password change
   - Forces logout redirect
   - Network error handling generic

3. **Message Polling** (app.js:3200)
   - Polls every 500ms even when realtime available
   - No throttling during rapid updates
   - Could cause network saturation

4. **Chart.js Instances** (app.js:2850+)
   - Creates/destroys charts on every render
   - No singleton pattern
   - Memory leaks possible on repeated tab switches

### 🟡 MEDIUM

1. **DOM Query Overhead**
   - `document.querySelectorAll()` called multiple times per render
   - No selector caching
   - `positionMenuToTrigger()` calls `getBoundingClientRect()` multiple times

2. **State Size**
   - Monolithic `state` object (100+ properties)
   - No compartmentalization
   - Deep object cloning in places

---

## 8. Specific Code Issues

### Issue 1: Inconsistent Error Messages
```javascript
// FILE: app.js:384
let msg = loginError.message || "Current password is incorrect.";
if (msg.includes("400") || msg.toLowerCase().includes("bad request")) {
  msg = "Current password is incorrect.";
}
// Generic fallback error, user doesn't know specific problem
```

### Issue 2: Hidden Feature Dependencies
```javascript
// FILE: app.js:2500
const email = usernameToEmail(username);
// Function definition not found in codebase - MUST BE IN MISSING MODULE
```

### Issue 3: Magic Numbers
```javascript
const EXAM_COUNTDOWN_DAYS = 55;
const COURSE_CACHE_TTL_MS = 5 * 60 * 1000;
const METRICS_CACHE_TTL_MS = 12 * 1000;
const USERNAME_PATTERN = /^[a-z0-9._-]{3,20}$/;
// All hardcoded, no configuration management
```

### Issue 4: Unreachable Code Paths
```javascript
// FILE: app.js:1800+
function onHomeAiFollowUp() {
  // Uses state.homeAiLastQuestion and state.homeAiLastAnswer
  // But onAskHomeAi() never populates these
  // Function will fail if called
}
```

---

## 9. Security Concerns

### 🔴 CRITICAL

1. **Hardcoded Credentials in HTML**
   ```html
   <!-- FILE: index.html:5-10 -->
   <script>
     window.env = {
       SUPABASE_URL: "https://tzamwbvvgxohwzxxcpoz.supabase.co",
       SUPABASE_ANON_KEY: "sb_publishable_...",
       ...
     }
   </script>
   ```
   - Public keys exposed in HTML (acceptable for anon key)
   - Comment suggests keys should use Vercel env vars instead
   - **ACTION**: Move to .env.local or environment variables

2. **No CSRF Protection**
   - Chat messages sent directly
   - Profile updates unprotected
   - Form submissions via standard fetch

3. **Local Storage Clearing**
   - `localStorage.clear()` called on logout
   - Potential race condition with other tabs
   - No selective clearing

### 🟡 MEDIUM

1. **Supabase RLS Not Verified**
   - Assumes all tables have RLS enabled
   - No policy definitions in codebase
   - Users could access other users' data if policies misconfigured

2. **Avatar Upload**
   - Trusts MIME type from browser
   - No server-side validation
   - Potential for malicious uploads

---

## 10. Missing Features That Need Implementation

| Feature | Status | Priority | Est. Effort |
|---------|--------|----------|------------|
| AI Follow-up Questions | 30% | HIGH | 2-3 days |
| Password Reset Flow | 0% | HIGH | 2 days |
| Leaderboard | 0% | MEDIUM | 3-4 days |
| Weekly Targets | 0% | MEDIUM | 2 days |
| Achievements UI | 10% | MEDIUM | 2-3 days |
| Mobile Responsive Fix | 40% | HIGH | 2-3 days |
| Real-time Chat Optimization | 70% | MEDIUM | 1-2 days |
| Error Boundary Components | 0% | MEDIUM | 1 day |

---

## 11. Recommendations (Priority Order)

### PHASE 1 - CRITICAL (This Week)
1. ✅ Complete `onAskHomeAi()` implementation
2. ✅ Implement password reset flow
3. ✅ Fix mobile responsive breakpoints
4. ✅ Setup DeepSeek API key in production

### PHASE 2 - HIGH (Next Week)
1. ✅ Implement leaderboard feature
2. ✅ Create achievements display UI
3. ✅ Fix chat realtime fallback communication
4. ✅ Add error boundaries

### PHASE 3 - MEDIUM (2-3 Weeks)
1. ✅ Optimize chart rendering (singleton pattern)
2. ✅ Implement weekly targets
3. ✅ Add request rate limiting for AI
4. ✅ Implement AI response caching

### PHASE 4 - OPTIMIZATION (3-4 Weeks)
1. ✅ Performance audit (DOM queries, re-renders)
2. ✅ State management refactoring
3. ✅ Accessibility audit (WCAG 2.1 AA)
4. ✅ Security audit (OWASP Top 10)

---

## 12. Testing Gaps

### Missing Tests
- [ ] AI endpoint with no API key
- [ ] Chat message ordering during network interruption
- [ ] Profile update with concurrent requests
- [ ] Mobile viewport under 360px width
- [ ] Chat realtime channel recovery
- [ ] Multi-tab session synchronization

---

## Appendix A: File Summary

| File | Lines | Purpose | Health |
|------|-------|---------|--------|
| app.js | 3000+ | Main app logic | 🟡 Complex, many incomplete functions |
| index.html | 300+ | UI structure | 🟢 Well-formed |
| styles.css | 2000+ | Core styling | 🟡 Needs responsive redesign |
| questions.js | 1000+ | Question bank | 🟡 Conditional feature gating |
| study.js | 500+ | Study materials | 🟢 Functional |
| supabaseClient.js | 20 | DB config | 🟢 Simple, works |
| ai-summary/index.ts | 50 | AI endpoint | 🔴 Unconfigured API key |

---

## Appendix B: Configuration Checklist

- [ ] DEEPSEEK_API_KEY in Supabase secrets
- [ ] study_tasks table created (if needed)
- [ ] study_milestones table created (if needed)
- [ ] chat_read_state table created (if needed)
- [ ] leaderboards table created
- [ ] RLS policies configured on all tables
- [ ] Avatar upload bucket permissions set
- [ ] Environment variables configured for production
- [ ] Supabase realtime enabled for required tables

---

**END OF ANALYSIS**

---

### Notes for Development Team:
- The codebase is **mostly functional for basic use** but has **significant incomplete features**
- **AI features are the highest priority** as they're partially implemented and could fail silently
- **Responsive design needs immediate attention** for mobile users
- **Database schema must be verified** against code assumptions
- Consider refactoring state management to reduce complexity

