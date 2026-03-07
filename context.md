# Exit Exam Study Website Context

## Goal
Build a fast, attractive, fully functional website for Computer Science exit exam preparation for two students (you and your girlfriend), including:
- Course-wise study planning
- Daily study session tracking
- Missed-session penalty tracking
- Resource management with free learning links
- Local persistence (data saved in browser)

## Students
- Student A: You
- Student B: Girlfriend

## Course List (15 courses, total 49 credit hours)
1. Computer Programming - 3
2. Database Systems - 6
3. Object Oriented Programming - 3
4. Computer Organization and Architecture - 3
5. Data Communication and Computer Networking - 3
6. Data Structures and Algorithms - 3
7. Web Programming - 4
8. Operating System - 3
9. Software Engineering - 3
10. Design and Analysis of Algorithms - 3
11. Introduction to Artificial Intelligence - 3
12. Computer Security - 3
13. Network and System Administration - 3
14. Automata and Complexity Theory - 3
15. Compiler Design - 3

## Functional Requirements
- Display all courses with credit hours and progress.
- Generate weighted weekly plan based on credit hours.
- Log study sessions with:
  - Date
  - Person
  - Course
  - Planned hours
  - Actual hours
  - Status (completed/missed)
- Penalty rules:
  - Configurable penalty amount per missed session
  - Optional extra penalty for less-than-planned completion
  - Auto-calculate owed amount per person
- Dashboard:
  - Total sessions
  - Completion rate
  - Missed sessions
  - Penalty totals
- Resource center:
  - Curated free links per course
  - User-added links/files metadata
- Data persistence via localStorage.

## Design Direction
- Modern, bold, high-contrast visual identity
- Mobile-first responsive layout
- Distinct typography (not default system fonts)
- Subtle gradients and shape accents
- Clear CTAs and card-based information architecture

## Phase 1 Deliverables
- `index.html`
- `styles.css`
- `app.js`
- `context.md`

## Notes
- Website can accept user-selected PDF/PPT files as resources for local usage.
- Browser security does not allow permanent direct file path access after reload unless using backend or IndexedDB. Phase 1 stores metadata and links reliably.
