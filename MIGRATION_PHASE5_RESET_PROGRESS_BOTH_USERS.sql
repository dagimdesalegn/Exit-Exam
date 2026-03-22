-- Phase 5: Reset progress to zero for exactly two users
-- Run in Supabase SQL Editor.
-- IMPORTANT: Replace USER_A_UUID and USER_B_UUID before running.

begin;

with target_users as (
  select unnest(array[
    '4975cbfe-b119-4cd5-b5a0-b538ad2a55a5',
    'bba6d139-3fc2-48dc-b3cb-9650a7d3261f'
  ]) as uid
)
-- Remove exam attempts (attempt average + activity contribution).
delete from public.question_attempts qa
using target_users tu
where qa.user_id::text = tu.uid;

with target_users as (
  select unnest(array[
    'USER_A_UUID',
    'USER_B_UUID'
  ]) as uid
)
-- Remove study tasks (task average + activity contribution).
delete from public.study_tasks st
using target_users tu
where st.user_id::text = tu.uid;

with target_users as (
  select unnest(array[
    'USER_A_UUID',
    'USER_B_UUID'
  ]) as uid
)
-- Remove milestones (milestone average + activity contribution).
delete from public.study_milestones sm
using target_users tu
where sm.user_id::text = tu.uid;

with target_users as (
  select unnest(array[
    'USER_A_UUID',
    'USER_B_UUID'
  ]) as uid
)
-- Optional: reset question status/summary so both users start fresh.
update public.questions q
set
  status = 'scheduled',
  ai_summary = null,
  scheduled_for = null
from target_users tu
where q.user_id::text = tu.uid;

commit;

-- Verification query (run after commit):
-- with target_users as (
--   select unnest(array[
--     'USER_A_UUID',
--     'USER_B_UUID'
--   ]) as uid
-- )
-- select
--   tu.uid,
--   coalesce((select count(*) from public.study_tasks st where st.user_id::text = tu.uid), 0) as tasks,
--   coalesce((select count(*) from public.study_milestones sm where sm.user_id::text = tu.uid), 0) as milestones,
--   coalesce((select count(*) from public.question_attempts qa where qa.user_id::text = tu.uid), 0) as attempts
-- from target_users tu;
