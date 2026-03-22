-- Remove currently unused tables for this app version
-- Current app actively uses:
-- profiles, pair_links, chat_messages, chat_read_state, study_tasks, weekly_targets, questions
-- This script removes likely unused table: study_milestones

begin;

-- 1) Quick visibility check before delete
-- Run these selects if you want to inspect data first:
-- select count(*) as milestones_rows from public.study_milestones;

-- 2) Drop unused tables (safe if they do not exist)
drop table if exists public.study_milestones cascade;

commit;
