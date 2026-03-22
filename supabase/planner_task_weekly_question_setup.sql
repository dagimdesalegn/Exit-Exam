-- Exit Exam planner/task/weekly/question setup
-- Run this entire file in Supabase SQL Editor

begin;

-- Optional cleanup for simplified planner (Task + Weekly only)
-- Safe because current UI no longer depends on study_milestones.
drop table if exists public.study_milestones cascade;

-- =========================
-- 0) Courses (required)
-- =========================
create table if not exists public.courses (
  id bigserial primary key,
  code text unique,
  name text not null unique,
  description text,
  total_chapters int not null default 1 check (total_chapters >= 1 and total_chapters <= 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.courses add column if not exists total_chapters int;
alter table public.courses alter column total_chapters set default 1;
update public.courses set total_chapters = 1 where total_chapters is null or total_chapters < 1;
alter table public.courses alter column total_chapters set not null;
alter table public.courses drop constraint if exists courses_total_chapters_check;
alter table public.courses
  add constraint courses_total_chapters_check
  check (total_chapters >= 1 and total_chapters <= 100);

-- =========================
-- 1) Study tasks
-- =========================
create table if not exists public.study_tasks (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  course text not null,
  title text not null,
  target_date date,
  progress int not null default 0 check (progress >= 0 and progress <= 100),
  created_at timestamptz not null default now()
);

-- =========================
-- 2) Weekly targets
-- =========================
create table if not exists public.weekly_targets (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  course text not null,
  week_start date not null,
  target_hours int not null default 6 check (target_hours >= 1 and target_hours <= 60),
  target_items int not null default 20 check (target_items >= 1 and target_items <= 200),
  completion int not null default 0 check (completion >= 0 and completion <= 100),
  created_at timestamptz not null default now()
);

-- =========================
-- 3) Questions
-- =========================
create table if not exists public.questions (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  course text not null,
  question text not null,
  options jsonb,
  answer int,
  explanation text,
  code text,
  source_type text,
  source_year int,
  source_month text,
  status text not null default 'scheduled',
  ai_summary text,
  scheduled_for timestamptz,
  created_at timestamptz not null default now()
);

-- =========================
-- 4) Uploaded chapter content
-- =========================
create table if not exists public.course_chapters (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  course text not null,
  chapter_no int not null check (chapter_no >= 1 and chapter_no <= 100),
  title text,
  content_html text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, course, chapter_no)
);

alter table public.questions add column if not exists options jsonb;
alter table public.questions add column if not exists answer int;
alter table public.questions add column if not exists explanation text;
alter table public.questions add column if not exists code text;
alter table public.questions add column if not exists source_type text;
alter table public.questions add column if not exists source_year int;
alter table public.questions add column if not exists source_month text;

-- =========================
-- 5) Indexes
-- =========================
create index if not exists idx_study_tasks_user_id on public.study_tasks(user_id);
create index if not exists idx_study_tasks_course on public.study_tasks(course);
create index if not exists idx_study_tasks_created_at on public.study_tasks(created_at desc);

create index if not exists idx_weekly_targets_user_id on public.weekly_targets(user_id);
create index if not exists idx_weekly_targets_course on public.weekly_targets(course);
create index if not exists idx_weekly_targets_week_start on public.weekly_targets(week_start desc);

create index if not exists idx_questions_user_id on public.questions(user_id);
create index if not exists idx_questions_course on public.questions(course);
create index if not exists idx_questions_status on public.questions(status);
create index if not exists idx_questions_created_at on public.questions(created_at desc);
create index if not exists idx_questions_source_type on public.questions(source_type);
create index if not exists idx_questions_source_year_month on public.questions(source_year, source_month);
create index if not exists idx_course_chapters_user_course on public.course_chapters(user_id, course);
create index if not exists idx_course_chapters_course_chapter on public.course_chapters(course, chapter_no);
create index if not exists idx_courses_name on public.courses(name);

-- =========================
-- 6) RLS
-- =========================
alter table public.study_tasks enable row level security;
alter table public.weekly_targets enable row level security;
alter table public.questions enable row level security;
alter table public.course_chapters enable row level security;
alter table public.courses enable row level security;

-- courses policies: all authenticated users can read/add/update
drop policy if exists courses_read_authenticated on public.courses;
create policy courses_read_authenticated
on public.courses
for select
to authenticated
using (true);

drop policy if exists courses_insert_authenticated on public.courses;
create policy courses_insert_authenticated
on public.courses
for insert
to authenticated
with check (true);

drop policy if exists courses_update_authenticated on public.courses;
create policy courses_update_authenticated
on public.courses
for update
to authenticated
using (true)
with check (true);

-- study_tasks ownership policies
DROP POLICY IF EXISTS study_tasks_select_own ON public.study_tasks;
create policy study_tasks_select_own
on public.study_tasks
for select
to authenticated
using (auth.uid() = user_id);

DROP POLICY IF EXISTS study_tasks_insert_own ON public.study_tasks;
create policy study_tasks_insert_own
on public.study_tasks
for insert
to authenticated
with check (auth.uid() = user_id);

DROP POLICY IF EXISTS study_tasks_update_own ON public.study_tasks;
create policy study_tasks_update_own
on public.study_tasks
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

DROP POLICY IF EXISTS study_tasks_delete_own ON public.study_tasks;
create policy study_tasks_delete_own
on public.study_tasks
for delete
to authenticated
using (auth.uid() = user_id);

-- weekly_targets ownership policies
DROP POLICY IF EXISTS weekly_targets_select_own ON public.weekly_targets;
create policy weekly_targets_select_own
on public.weekly_targets
for select
to authenticated
using (auth.uid() = user_id);

DROP POLICY IF EXISTS weekly_targets_insert_own ON public.weekly_targets;
create policy weekly_targets_insert_own
on public.weekly_targets
for insert
to authenticated
with check (auth.uid() = user_id);

DROP POLICY IF EXISTS weekly_targets_update_own ON public.weekly_targets;
create policy weekly_targets_update_own
on public.weekly_targets
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

DROP POLICY IF EXISTS weekly_targets_delete_own ON public.weekly_targets;
create policy weekly_targets_delete_own
on public.weekly_targets
for delete
to authenticated
using (auth.uid() = user_id);

-- questions ownership policies
DROP POLICY IF EXISTS questions_select_own ON public.questions;
create policy questions_select_own
on public.questions
for select
to authenticated
using (auth.uid() = user_id);

DROP POLICY IF EXISTS questions_insert_own ON public.questions;
create policy questions_insert_own
on public.questions
for insert
to authenticated
with check (auth.uid() = user_id);

DROP POLICY IF EXISTS questions_update_own ON public.questions;
create policy questions_update_own
on public.questions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

DROP POLICY IF EXISTS questions_delete_own ON public.questions;
create policy questions_delete_own
on public.questions
for delete
to authenticated
using (auth.uid() = user_id);

-- course_chapters ownership policies
DROP POLICY IF EXISTS course_chapters_select_own ON public.course_chapters;
create policy course_chapters_select_own
on public.course_chapters
for select
to authenticated
using (auth.uid() = user_id);

DROP POLICY IF EXISTS course_chapters_insert_own ON public.course_chapters;
create policy course_chapters_insert_own
on public.course_chapters
for insert
to authenticated
with check (auth.uid() = user_id);

DROP POLICY IF EXISTS course_chapters_update_own ON public.course_chapters;
create policy course_chapters_update_own
on public.course_chapters
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

DROP POLICY IF EXISTS course_chapters_delete_own ON public.course_chapters;
create policy course_chapters_delete_own
on public.course_chapters
for delete
to authenticated
using (auth.uid() = user_id);

commit;

-- =========================
-- Optional seed (edit as needed)
-- =========================
insert into public.courses (code, name, description, total_chapters, is_active) values
('CP', 'Computer Programming', 'Core programming fundamentals', 8, true),
('FDBS', 'Fundamentals of Database Systems', 'Database basics, SQL, normalization', 10, true),
('ADBS', 'Advanced Database Systems', 'Advanced database design and optimization', 8, true),
('OOP', 'Object Oriented Programming', 'Classes, inheritance, polymorphism', 7, true),
('COA', 'Computer Organization and Architecture', 'Computer hardware and architecture', 9, true),
('DCN', 'Data Communication and Computer Networking', 'Networking concepts and protocols', 8, true),
('DSA', 'Data Structures and Algorithms', 'Data structures and algorithm analysis', 10, true),
('WEB', 'Web Programming', 'HTML, CSS, JavaScript and web systems', 8, true),
('OS', 'Operating System', 'OS process, memory and file management', 9, true),
('SE', 'Software Engineering', 'Software lifecycle and engineering methods', 8, true),
('DAA', 'Design and Analysis of Algorithms', 'Algorithm design and complexity', 7, true),
('AI', 'Introduction to Artificial Intelligence', 'Foundations of artificial intelligence', 8, true),
('SEC', 'Computer Security', 'Security, cryptography and hardening', 7, true),
('NSA', 'Network and System Administration', 'Practical administration and operations', 6, true),
('ACT', 'Automata and Complexity Theory', 'Formal languages and complexity', 7, true),
('CD', 'Compiler Design', 'Compiler phases and code generation', 7, true)
on conflict (name) do update
set
  code = excluded.code,
  description = excluded.description,
  total_chapters = excluded.total_chapters,
  is_active = excluded.is_active,
  updated_at = now();
