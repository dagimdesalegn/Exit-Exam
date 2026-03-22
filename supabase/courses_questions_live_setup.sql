-- Courses + Questions live setup
-- Run this file in Supabase SQL Editor

begin;

-- =========================
-- 1) Courses table (keep this table)
-- =========================
create table if not exists public.courses (
  id bigserial primary key,
  code text unique,
  name text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================
-- 2) Questions table
-- =========================
create table if not exists public.questions (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  course text not null,
  question text not null,
  status text not null default 'scheduled',
  ai_summary text,
  scheduled_for timestamptz,
  created_at timestamptz not null default now()
);

-- =========================
-- 3) Indexes
-- =========================
create index if not exists idx_courses_name on public.courses(name);
create index if not exists idx_questions_user_id on public.questions(user_id);
create index if not exists idx_questions_course on public.questions(course);
create index if not exists idx_questions_status on public.questions(status);
create index if not exists idx_questions_created_at on public.questions(created_at desc);

-- =========================
-- 4) RLS + policies
-- =========================
alter table public.courses enable row level security;
alter table public.questions enable row level security;

drop policy if exists courses_read_authenticated on public.courses;
create policy courses_read_authenticated
on public.courses
for select
to authenticated
using (true);

drop policy if exists questions_select_own on public.questions;
create policy questions_select_own
on public.questions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists questions_insert_own on public.questions;
create policy questions_insert_own
on public.questions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists questions_update_own on public.questions;
create policy questions_update_own
on public.questions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists questions_delete_own on public.questions;
create policy questions_delete_own
on public.questions
for delete
to authenticated
using (auth.uid() = user_id);

commit;

-- =========================
-- Optional seed for all courses
-- =========================
insert into public.courses (code, name, description, is_active) values
('CP', 'Computer Programming', 'Programming fundamentals and C++ basics', true),
('FDBS', 'Fundamentals of Database Systems', 'Data models, SQL, normalization, transactions', true),
('ADBS', 'Advanced Database Systems', 'Optimization, indexing, distributed and advanced DB topics', true),
('OOP', 'Object Oriented Programming', 'Classes, inheritance, polymorphism, encapsulation', true),
('COA', 'Computer Organization and Architecture', 'CPU, memory hierarchy, assembly, architecture', true),
('DCN', 'Data Communication and Computer Networking', 'OSI/TCP-IP, routing, switching, protocols', true),
('DSA', 'Data Structures and Algorithms', 'Core data structures and algorithm design', true),
('WEB', 'Web Programming', 'HTML, CSS, JS and web architecture', true),
('OS', 'Operating System', 'Processes, memory, scheduling, file systems', true),
('SE', 'Software Engineering', 'Lifecycle, testing, requirements, design', true),
('DAA', 'Design and Analysis of Algorithms', 'Complexity, paradigms, optimization', true),
('AI', 'Introduction to Artificial Intelligence', 'Search, ML, NLP, expert systems', true),
('SEC', 'Computer Security', 'Auth, encryption, secure systems and networks', true),
('NSA', 'Network and System Administration', 'Ops, deployment, monitoring, maintenance', true),
('ACT', 'Automata and Complexity Theory', 'Formal languages, automata, complexity classes', true),
('CD', 'Compiler Design', 'Lexing, parsing, semantic analysis, code generation', true)
on conflict (name) do update set
  code = excluded.code,
  description = excluded.description,
  is_active = excluded.is_active,
  updated_at = now();
