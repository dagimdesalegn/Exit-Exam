-- Run this in Supabase SQL Editor
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (char_length(username) >= 3),
  full_name text,
  avatar_url text,
  sex text check (sex in ('male', 'female', 'other')),
  target_score int not null default 70 check (target_score >= 0 and target_score <= 100),
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists sex text;
alter table public.profiles add column if not exists target_score int not null default 70;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_sex_check'
  ) then
    alter table public.profiles
      add constraint profiles_sex_check
      check (sex in ('male', 'female', 'other'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_target_score_check'
  ) then
    alter table public.profiles
      add constraint profiles_target_score_check
      check (target_score >= 0 and target_score <= 100);
  end if;
end $$;

create table if not exists public.pair_links (
  user_id uuid not null references auth.users(id) on delete cascade,
  partner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, partner_id),
  check (user_id <> partner_id)
);

create table if not exists public.study_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course text not null,
  title text not null,
  target_date date,
  progress int not null default 0 check (progress >= 0 and progress <= 100),
  created_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course text not null,
  question text not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'processing', 'completed', 'error')),
  ai_summary text,
  scheduled_for timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.study_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course text not null,
  title text not null,
  target_date date,
  progress int not null default 0 check (progress >= 0 and progress <= 100),
  status text not null default 'planned' check (status in ('planned', 'in_progress', 'done')),
  created_at timestamptz not null default now()
);

create table if not exists public.weekly_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course text not null,
  week_start date not null,
  target_hours int not null default 4 check (target_hours > 0),
  target_items int not null default 10 check (target_items > 0),
  completion int not null default 0 check (completion >= 0 and completion <= 100),
  created_at timestamptz not null default now(),
  unique (user_id, course, week_start)
);

create index if not exists idx_tasks_user_id on public.study_tasks(user_id);
create index if not exists idx_chat_sender_receiver on public.chat_messages(sender_id, receiver_id);
create index if not exists idx_questions_user_status on public.questions(user_id, status);
create index if not exists idx_milestones_user_date on public.study_milestones(user_id, target_date);
create index if not exists idx_weekly_targets_user_week on public.weekly_targets(user_id, week_start);

alter table public.profiles enable row level security;
alter table public.pair_links enable row level security;
alter table public.study_tasks enable row level security;
alter table public.chat_messages enable row level security;
alter table public.questions enable row level security;
alter table public.study_milestones enable row level security;
alter table public.weekly_targets enable row level security;

-- profiles policies

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- pair links policies

drop policy if exists "pair_links_select_own" on public.pair_links;
create policy "pair_links_select_own"
  on public.pair_links for select
  to authenticated
  using (auth.uid() = user_id or auth.uid() = partner_id);

drop policy if exists "pair_links_insert_participant" on public.pair_links;
create policy "pair_links_insert_participant"
  on public.pair_links for insert
  to authenticated
  with check (auth.uid() = user_id or auth.uid() = partner_id);

drop policy if exists "pair_links_delete_owner" on public.pair_links;
create policy "pair_links_delete_owner"
  on public.pair_links for delete
  to authenticated
  using (auth.uid() = user_id);

-- study tasks policies

drop policy if exists "study_tasks_select_self_or_partner" on public.study_tasks;
create policy "study_tasks_select_self_or_partner"
  on public.study_tasks for select
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.pair_links pl
      where pl.user_id = auth.uid()
        and pl.partner_id = study_tasks.user_id
    )
  );

drop policy if exists "study_tasks_insert_self" on public.study_tasks;
create policy "study_tasks_insert_self"
  on public.study_tasks for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "study_tasks_update_self" on public.study_tasks;
create policy "study_tasks_update_self"
  on public.study_tasks for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "study_tasks_delete_self" on public.study_tasks;
create policy "study_tasks_delete_self"
  on public.study_tasks for delete
  to authenticated
  using (auth.uid() = user_id);

-- chat policies

drop policy if exists "chat_select_participants" on public.chat_messages;
create policy "chat_select_participants"
  on public.chat_messages for select
  to authenticated
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists "chat_insert_sender" on public.chat_messages;
create policy "chat_insert_sender"
  on public.chat_messages for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.pair_links pl
      where pl.user_id = sender_id and pl.partner_id = receiver_id
    )
  );

-- questions policies

drop policy if exists "questions_select_self" on public.questions;
create policy "questions_select_self"
  on public.questions for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "questions_insert_self" on public.questions;
create policy "questions_insert_self"
  on public.questions for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "questions_update_self" on public.questions;
create policy "questions_update_self"
  on public.questions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- milestone policies

drop policy if exists "milestones_select_self_or_partner" on public.study_milestones;
create policy "milestones_select_self_or_partner"
  on public.study_milestones for select
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.pair_links pl
      where pl.user_id = auth.uid()
        and pl.partner_id = study_milestones.user_id
    )
  );

drop policy if exists "milestones_insert_self" on public.study_milestones;
create policy "milestones_insert_self"
  on public.study_milestones for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "milestones_update_self" on public.study_milestones;
create policy "milestones_update_self"
  on public.study_milestones for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "milestones_delete_self" on public.study_milestones;
create policy "milestones_delete_self"
  on public.study_milestones for delete
  to authenticated
  using (auth.uid() = user_id);

-- weekly target policies

drop policy if exists "weekly_targets_select_self_or_partner" on public.weekly_targets;
create policy "weekly_targets_select_self_or_partner"
  on public.weekly_targets for select
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.pair_links pl
      where pl.user_id = auth.uid()
        and pl.partner_id = weekly_targets.user_id
    )
  );

drop policy if exists "weekly_targets_insert_self" on public.weekly_targets;
create policy "weekly_targets_insert_self"
  on public.weekly_targets for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "weekly_targets_update_self" on public.weekly_targets;
create policy "weekly_targets_update_self"
  on public.weekly_targets for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "weekly_targets_delete_self" on public.weekly_targets;
create policy "weekly_targets_delete_self"
  on public.weekly_targets for delete
  to authenticated
  using (auth.uid() = user_id);

-- Realtime publication (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'study_tasks'
  ) then
    alter publication supabase_realtime add table public.study_tasks;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'questions'
  ) then
    alter publication supabase_realtime add table public.questions;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'study_milestones'
  ) then
    alter publication supabase_realtime add table public.study_milestones;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'weekly_targets'
  ) then
    alter publication supabase_realtime add table public.weekly_targets;
  end if;
end $$;

-- Avatar bucket setup
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Storage policies for avatars bucket

drop policy if exists "Avatar upload own folder" on storage.objects;
create policy "Avatar upload own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Avatar update own folder" on storage.objects;
create policy "Avatar update own folder"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Avatar read public" on storage.objects;
create policy "Avatar read public"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');
