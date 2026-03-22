-- Group mode phase 1 (non-breaking)
-- Adds group-of-3+ schema while keeping existing pair_links flow operational.

create extension if not exists pgcrypto;

create table if not exists public.study_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  max_members int not null default 3 check (max_members between 2 and 10),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.study_group_members (
  group_id uuid not null references public.study_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.study_group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  inviter_id uuid not null references auth.users(id) on delete cascade,
  invitee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'revoked')),
  created_at timestamptz not null default now(),
  responded_at timestamptz null,
  unique (group_id, invitee_id)
);

create index if not exists idx_group_members_user on public.study_group_members (user_id);
create index if not exists idx_group_invites_invitee on public.study_group_invites (invitee_id, status);

alter table public.study_groups enable row level security;
alter table public.study_group_members enable row level security;
alter table public.study_group_invites enable row level security;

-- Groups are visible to members.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'study_groups' and policyname = 'study_groups_member_select'
  ) then
    create policy study_groups_member_select
      on public.study_groups
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.study_group_members m
          where m.group_id = study_groups.id
            and m.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'study_groups' and policyname = 'study_groups_owner_insert'
  ) then
    create policy study_groups_owner_insert
      on public.study_groups
      for insert
      to authenticated
      with check (owner_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'study_groups' and policyname = 'study_groups_owner_update_delete'
  ) then
    create policy study_groups_owner_update_delete
      on public.study_groups
      for all
      to authenticated
      using (owner_id = auth.uid())
      with check (owner_id = auth.uid());
  end if;
end $$;

-- Group members are visible to group members; managed by owner/admin.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'study_group_members' and policyname = 'group_members_member_select'
  ) then
    create policy group_members_member_select
      on public.study_group_members
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.study_group_members m
          where m.group_id = study_group_members.group_id
            and m.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'study_group_members' and policyname = 'group_members_owner_admin_manage'
  ) then
    create policy group_members_owner_admin_manage
      on public.study_group_members
      for all
      to authenticated
      using (
        exists (
          select 1
          from public.study_group_members manager
          where manager.group_id = study_group_members.group_id
            and manager.user_id = auth.uid()
            and manager.role in ('owner', 'admin')
        )
      )
      with check (
        exists (
          select 1
          from public.study_group_members manager
          where manager.group_id = study_group_members.group_id
            and manager.user_id = auth.uid()
            and manager.role in ('owner', 'admin')
        )
      );
  end if;
end $$;

-- Invites are visible to inviter/invitee; creation by group owner/admin only.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'study_group_invites' and policyname = 'group_invites_visible_to_actor'
  ) then
    create policy group_invites_visible_to_actor
      on public.study_group_invites
      for select
      to authenticated
      using (inviter_id = auth.uid() or invitee_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'study_group_invites' and policyname = 'group_invites_owner_admin_insert'
  ) then
    create policy group_invites_owner_admin_insert
      on public.study_group_invites
      for insert
      to authenticated
      with check (
        inviter_id = auth.uid()
        and exists (
          select 1
          from public.study_group_members m
          where m.group_id = study_group_invites.group_id
            and m.user_id = auth.uid()
            and m.role in ('owner', 'admin')
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'study_group_invites' and policyname = 'group_invites_update_actor'
  ) then
    create policy group_invites_update_actor
      on public.study_group_invites
      for update
      to authenticated
      using (inviter_id = auth.uid() or invitee_id = auth.uid())
      with check (inviter_id = auth.uid() or invitee_id = auth.uid());
  end if;
end $$;

-- Phase-1 compatibility view to support gradual app migration.
create or replace view public.v_user_connections as
select
  pl.user_id as user_id,
  pl.partner_id as connected_user_id,
  'pair'::text as connection_type,
  null::uuid as group_id
from public.pair_links pl
union all
select
  gm.user_id,
  gm2.user_id as connected_user_id,
  'group'::text,
  gm.group_id
from public.study_group_members gm
join public.study_group_members gm2
  on gm.group_id = gm2.group_id
 and gm.user_id <> gm2.user_id;
