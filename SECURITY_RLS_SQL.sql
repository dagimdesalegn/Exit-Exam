-- Exit-Exam baseline security hardening (Supabase/Postgres)
-- Run this in Supabase SQL Editor as a privileged role.

begin;

-- 1) Helper function to verify partner linkage.
create or replace function public.is_my_partner(other_user uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.pair_links pl
    where (pl.user_id = auth.uid() and pl.partner_id = other_user)
       or (pl.partner_id = auth.uid() and pl.user_id = other_user)
  );
$$;

-- 2) Enable RLS everywhere used by the app.
alter table if exists public.profiles enable row level security;
alter table if exists public.pair_links enable row level security;
alter table if exists public.study_tasks enable row level security;
alter table if exists public.weekly_targets enable row level security;
alter table if exists public.questions enable row level security;
alter table if exists public.question_attempts enable row level security;
alter table if exists public.chat_messages enable row level security;
alter table if exists public.courses enable row level security;

-- 3) Profiles
-- Read: own profile + partner profile.
drop policy if exists profiles_select_own_or_partner on public.profiles;
create policy profiles_select_own_or_partner
on public.profiles
for select
using (
  id = auth.uid() or public.is_my_partner(id)
);

-- Write: only own profile.
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles
for insert
with check (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_delete_own
on public.profiles
for delete
using (id = auth.uid());

-- 4) Pair links
-- Read/write only links where current user participates.
drop policy if exists pair_links_select_participant on public.pair_links;
create policy pair_links_select_participant
on public.pair_links
for select
using (user_id = auth.uid() or partner_id = auth.uid());

drop policy if exists pair_links_insert_owner on public.pair_links;
create policy pair_links_insert_owner
on public.pair_links
for insert
with check (user_id = auth.uid());

drop policy if exists pair_links_update_participant on public.pair_links;
create policy pair_links_update_participant
on public.pair_links
for update
using (user_id = auth.uid() or partner_id = auth.uid())
with check (user_id = auth.uid() or partner_id = auth.uid());

drop policy if exists pair_links_delete_owner on public.pair_links;
create policy pair_links_delete_owner
on public.pair_links
for delete
using (user_id = auth.uid());

-- 5) Study tasks
-- Read own + partner tasks.
drop policy if exists study_tasks_select_own_or_partner on public.study_tasks;
create policy study_tasks_select_own_or_partner
on public.study_tasks
for select
using (user_id = auth.uid() or public.is_my_partner(user_id));

-- Write only own tasks.
drop policy if exists study_tasks_insert_own on public.study_tasks;
create policy study_tasks_insert_own
on public.study_tasks
for insert
with check (user_id = auth.uid());

drop policy if exists study_tasks_update_own on public.study_tasks;
create policy study_tasks_update_own
on public.study_tasks
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists study_tasks_delete_own on public.study_tasks;
create policy study_tasks_delete_own
on public.study_tasks
for delete
using (user_id = auth.uid());

-- 6) Weekly targets
-- Read own + partner targets.
drop policy if exists weekly_targets_select_own_or_partner on public.weekly_targets;
create policy weekly_targets_select_own_or_partner
on public.weekly_targets
for select
using (user_id = auth.uid() or public.is_my_partner(user_id));

-- Write only own targets.
drop policy if exists weekly_targets_insert_own on public.weekly_targets;
create policy weekly_targets_insert_own
on public.weekly_targets
for insert
with check (user_id = auth.uid());

drop policy if exists weekly_targets_update_own on public.weekly_targets;
create policy weekly_targets_update_own
on public.weekly_targets
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists weekly_targets_delete_own on public.weekly_targets;
create policy weekly_targets_delete_own
on public.weekly_targets
for delete
using (user_id = auth.uid());

-- 7) Questions
-- Keep private to owner by default.
drop policy if exists questions_select_own on public.questions;
create policy questions_select_own
on public.questions
for select
using (user_id = auth.uid());

drop policy if exists questions_insert_own on public.questions;
create policy questions_insert_own
on public.questions
for insert
with check (user_id = auth.uid());

drop policy if exists questions_update_own on public.questions;
create policy questions_update_own
on public.questions
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists questions_delete_own on public.questions;
create policy questions_delete_own
on public.questions
for delete
using (user_id = auth.uid());

-- 8) Question attempts
-- Read own + partner attempts, write own only.
drop policy if exists question_attempts_select_own_or_partner on public.question_attempts;
create policy question_attempts_select_own_or_partner
on public.question_attempts
for select
using (user_id = auth.uid() or public.is_my_partner(user_id));

drop policy if exists question_attempts_insert_own on public.question_attempts;
create policy question_attempts_insert_own
on public.question_attempts
for insert
with check (user_id = auth.uid());

drop policy if exists question_attempts_update_own on public.question_attempts;
create policy question_attempts_update_own
on public.question_attempts
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists question_attempts_delete_own on public.question_attempts;
create policy question_attempts_delete_own
on public.question_attempts
for delete
using (user_id = auth.uid());

-- 9) Chat messages
-- Read messages where user is sender or receiver.
drop policy if exists chat_messages_select_participant on public.chat_messages;
create policy chat_messages_select_participant
on public.chat_messages
for select
using (sender_id = auth.uid() or receiver_id = auth.uid());

-- Insert only by sender and only to linked partner.
drop policy if exists chat_messages_insert_sender_only on public.chat_messages;
create policy chat_messages_insert_sender_only
on public.chat_messages
for insert
with check (
  sender_id = auth.uid()
  and public.is_my_partner(receiver_id)
);

-- Optional updates for delivery/seen tracking by participants.
drop policy if exists chat_messages_update_participant on public.chat_messages;
create policy chat_messages_update_participant
on public.chat_messages
for update
using (sender_id = auth.uid() or receiver_id = auth.uid())
with check (sender_id = auth.uid() or receiver_id = auth.uid());

-- Delete only own sent messages (optional, stricter).
drop policy if exists chat_messages_delete_sender on public.chat_messages;
create policy chat_messages_delete_sender
on public.chat_messages
for delete
using (sender_id = auth.uid());

-- 10) Courses
-- Public read of active courses only.
drop policy if exists courses_select_active on public.courses;
create policy courses_select_active
on public.courses
for select
using (coalesce(is_active, false) = true);

-- No client-side insert/update/delete policies for courses.

-- 11) Helpful indexes for policy and app query speed.
create index if not exists idx_pair_links_user_partner on public.pair_links(user_id, partner_id);
create index if not exists idx_pair_links_partner_user on public.pair_links(partner_id, user_id);
create index if not exists idx_study_tasks_user_created on public.study_tasks(user_id, created_at desc);
create index if not exists idx_weekly_targets_user_week_start on public.weekly_targets(user_id, week_start desc);
create index if not exists idx_questions_user_created on public.questions(user_id, created_at desc);
create index if not exists idx_question_attempts_user_created on public.question_attempts(user_id, created_at desc);
create index if not exists idx_chat_messages_sender_receiver_created on public.chat_messages(sender_id, receiver_id, created_at);

commit;

-- Storage policy examples for avatars bucket (run only if you use storage.objects policies)
-- alter table storage.objects enable row level security;
-- drop policy if exists avatar_read_public on storage.objects;
-- create policy avatar_read_public on storage.objects
-- for select using (bucket_id = 'avatars');
--
-- drop policy if exists avatar_write_own_folder on storage.objects;
-- create policy avatar_write_own_folder on storage.objects
-- for insert with check (
--   bucket_id = 'avatars'
--   and split_part(name, '/', 1) = auth.uid()::text
-- );
--
-- drop policy if exists avatar_update_own_folder on storage.objects;
-- create policy avatar_update_own_folder on storage.objects
-- for update using (
--   bucket_id = 'avatars'
--   and split_part(name, '/', 1) = auth.uid()::text
-- ) with check (
--   bucket_id = 'avatars'
--   and split_part(name, '/', 1) = auth.uid()::text
-- );
--
-- drop policy if exists avatar_delete_own_folder on storage.objects;
-- create policy avatar_delete_own_folder on storage.objects
-- for delete using (
--   bucket_id = 'avatars'
--   and split_part(name, '/', 1) = auth.uid()::text
-- );
