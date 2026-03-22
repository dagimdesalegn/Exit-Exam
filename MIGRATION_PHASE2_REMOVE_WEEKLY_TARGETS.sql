-- Phase 2 migration: deprecate/remove weekly_targets safely
-- Run in Supabase SQL Editor as an admin role.
-- This script keeps a backup, removes policies/indexes, and drops runtime table usage.

begin;

-- 0) Optional safety backup table (keeps historical records)
create table if not exists public.weekly_targets_archive (like public.weekly_targets including all);

insert into public.weekly_targets_archive
select *
from public.weekly_targets wt
where not exists (
  select 1
  from public.weekly_targets_archive a
  where a.id = wt.id
);

-- 1) Remove RLS policies tied to weekly_targets
-- (safe to run multiple times)
drop policy if exists weekly_targets_select_own_or_partner on public.weekly_targets;
drop policy if exists weekly_targets_insert_own on public.weekly_targets;
drop policy if exists weekly_targets_update_own on public.weekly_targets;
drop policy if exists weekly_targets_delete_own on public.weekly_targets;

-- 2) Remove index specific to weekly_targets
-- (if index naming differs, adjust accordingly)
drop index if exists public.idx_weekly_targets_user_week_start;

-- 3) Remove from realtime publication if present
do $$
begin
  if exists (
    select 1
    from pg_publication p
    join pg_publication_rel pr on pr.prpubid = p.oid
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'weekly_targets'
  ) then
    execute 'alter publication supabase_realtime drop table public.weekly_targets';
  end if;
end
$$;

-- 4) Drop table now that app no longer queries/subscribes to it
drop table if exists public.weekly_targets;

commit;

-- Rollback idea (manual):
-- 1) recreate public.weekly_targets from archive schema/data
-- 2) recreate policies/indexes if needed
