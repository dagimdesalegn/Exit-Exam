create table if not exists public.chat_read_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  partner_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, partner_id),
  check (user_id <> partner_id)
);

create index if not exists idx_chat_read_state_user_partner on public.chat_read_state(user_id, partner_id);

alter table public.chat_read_state enable row level security;

drop policy if exists "chat_read_state_select_self" on public.chat_read_state;
create policy "chat_read_state_select_self"
  on public.chat_read_state for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "chat_read_state_insert_self" on public.chat_read_state;
create policy "chat_read_state_insert_self"
  on public.chat_read_state for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "chat_read_state_update_self" on public.chat_read_state;
create policy "chat_read_state_update_self"
  on public.chat_read_state for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "chat_read_state_delete_self" on public.chat_read_state;
create policy "chat_read_state_delete_self"
  on public.chat_read_state for delete
  to authenticated
  using (auth.uid() = user_id);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_read_state'
  ) then
    alter publication supabase_realtime add table public.chat_read_state;
  end if;
end $$;
