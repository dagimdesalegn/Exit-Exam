-- Phase 5: Reset progress to zero for exactly two users
-- Run in Supabase SQL Editor.
-- IMPORTANT: Replace USER_A_UUID and USER_B_UUID before running.

begin;

with target_users as (
  select unnest(array[
    'USER_A_UUID'::uuid,
    'USER_B_UUID'::uuid
  ]) as uid
)
-- Remove exam attempts (attempt average + activity contribution).
delete from public.question_attempts qa
using target_users tu
where qa.user_id = tu.uid;

with target_users as (
  select unnest(array[
    'USER_A_UUID'::uuid,
    'USER_B_UUID'::uuid
  ]) as uid
)
-- Remove study tasks (task average + activity contribution).
delete from public.study_tasks st
using target_users tu
where st.user_id = tu.uid;

with target_users as (
  select unnest(array[
    'USER_A_UUID'::uuid,
    'USER_B_UUID'::uuid
  ]) as uid
)
-- Remove milestones (milestone average + activity contribution).
delete from public.study_milestones sm
using target_users tu
where sm.user_id = tu.uid;

with target_users as (
  select unnest(array[
    'USER_A_UUID'::uuid,
    'USER_B_UUID'::uuid
  ]) as uid
)
-- Optional: reset question status/summary so both users start fresh.
update public.questions q
set
  status = 'scheduled',
  ai_summary = null,
  scheduled_for = null
from target_users tu
where q.user_id = tu.uid;

commit;

-- Verification query (run after commit):
-- with target_users as (
--   select unnest(array[
--     'USER_A_UUID'::uuid,
--     'USER_B_UUID'::uuid
--   ]) as uid
-- )
-- select
--   tu.uid,
--   coalesce((select count(*) from public.study_tasks st where st.user_id = tu.uid), 0) as tasks,
--   coalesce((select count(*) from public.study_milestones sm where sm.user_id = tu.uid), 0) as milestones,
--   coalesce((select count(*) from public.question_attempts qa where qa.user_id = tu.uid), 0) as attempts
-- from target_users tu;
