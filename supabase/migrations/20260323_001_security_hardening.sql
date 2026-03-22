-- Security hardening baseline
-- Applies idempotent RLS and policy rules for core app tables.

create extension if not exists pgcrypto;

-- Rate-limit request log used by edge functions.
create table if not exists public.ai_request_logs (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null,
  user_id uuid null references auth.users(id) on delete set null,
  ip_address text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_request_logs_endpoint_created_at
  on public.ai_request_logs (endpoint, created_at desc);

create index if not exists idx_ai_request_logs_user_created_at
  on public.ai_request_logs (user_id, created_at desc)
  where user_id is not null;

create index if not exists idx_ai_request_logs_ip_created_at
  on public.ai_request_logs (ip_address, created_at desc)
  where ip_address is not null;

alter table public.ai_request_logs enable row level security;

-- Service-role only table: keep denied for anon/authenticated.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_request_logs'
      and policyname = 'ai_request_logs_no_client_access'
  ) then
    create policy ai_request_logs_no_client_access
      on public.ai_request_logs
      for all
      to authenticated, anon
      using (false)
      with check (false);
  end if;
end $$;

-- Profiles
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    EXECUTE 'alter table public.profiles enable row level security';

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_select_authenticated'
    ) THEN
      EXECUTE 'create policy profiles_select_authenticated on public.profiles for select to authenticated using (true)';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_modify_own'
    ) THEN
      EXECUTE 'create policy profiles_modify_own on public.profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid())';
    END IF;
  END IF;
END $$;

-- Pair links
DO $$
BEGIN
  IF to_regclass('public.pair_links') IS NOT NULL THEN
    EXECUTE 'alter table public.pair_links enable row level security';

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'pair_links' AND policyname = 'pair_links_visible_to_members'
    ) THEN
      EXECUTE 'create policy pair_links_visible_to_members on public.pair_links for select to authenticated using (user_id = auth.uid() OR partner_id = auth.uid())';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'pair_links' AND policyname = 'pair_links_insert_own'
    ) THEN
      EXECUTE 'create policy pair_links_insert_own on public.pair_links for insert to authenticated with check (user_id = auth.uid() OR partner_id = auth.uid())';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'pair_links' AND policyname = 'pair_links_update_member'
    ) THEN
      EXECUTE 'create policy pair_links_update_member on public.pair_links for update to authenticated using (user_id = auth.uid() OR partner_id = auth.uid()) with check (user_id = auth.uid() OR partner_id = auth.uid())';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'pair_links' AND policyname = 'pair_links_delete_member'
    ) THEN
      EXECUTE 'create policy pair_links_delete_member on public.pair_links for delete to authenticated using (user_id = auth.uid() OR partner_id = auth.uid())';
    END IF;
  END IF;
END $$;

-- Questions
DO $$
BEGIN
  IF to_regclass('public.questions') IS NOT NULL THEN
    EXECUTE 'alter table public.questions enable row level security';

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'questions' AND policyname = 'questions_select_owner_or_pair_member'
    ) THEN
      EXECUTE $policy$
        create policy questions_select_owner_or_pair_member
          on public.questions
          for select
          to authenticated
          using (
            user_id = auth.uid()
            OR exists (
              select 1
              from public.pair_links pl
              where (
                (pl.user_id = auth.uid() and pl.partner_id = questions.user_id)
                OR
                (pl.partner_id = auth.uid() and pl.user_id = questions.user_id)
              )
            )
          )
      $policy$;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'questions' AND policyname = 'questions_insert_owner_only'
    ) THEN
      EXECUTE 'create policy questions_insert_owner_only on public.questions for insert to authenticated with check (user_id = auth.uid())';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'questions' AND policyname = 'questions_update_owner_only'
    ) THEN
      EXECUTE 'create policy questions_update_owner_only on public.questions for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'questions' AND policyname = 'questions_delete_owner_only'
    ) THEN
      EXECUTE 'create policy questions_delete_owner_only on public.questions for delete to authenticated using (user_id = auth.uid())';
    END IF;
  END IF;
END $$;

-- Question attempts
DO $$
BEGIN
  IF to_regclass('public.question_attempts') IS NOT NULL THEN
    EXECUTE 'alter table public.question_attempts enable row level security';

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'question_attempts' AND policyname = 'question_attempts_owner_only'
    ) THEN
      EXECUTE 'create policy question_attempts_owner_only on public.question_attempts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())';
    END IF;
  END IF;
END $$;

-- Chat messages
DO $$
BEGIN
  IF to_regclass('public.chat_messages') IS NOT NULL THEN
    EXECUTE 'alter table public.chat_messages enable row level security';

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'chat_messages' AND policyname = 'chat_messages_visible_to_sender_or_receiver'
    ) THEN
      EXECUTE 'create policy chat_messages_visible_to_sender_or_receiver on public.chat_messages for select to authenticated using (sender_id = auth.uid() OR receiver_id = auth.uid())';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'chat_messages' AND policyname = 'chat_messages_insert_sender_only'
    ) THEN
      EXECUTE 'create policy chat_messages_insert_sender_only on public.chat_messages for insert to authenticated with check (sender_id = auth.uid())';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'chat_messages' AND policyname = 'chat_messages_update_receiver_or_sender'
    ) THEN
      EXECUTE 'create policy chat_messages_update_receiver_or_sender on public.chat_messages for update to authenticated using (sender_id = auth.uid() OR receiver_id = auth.uid()) with check (sender_id = auth.uid() OR receiver_id = auth.uid())';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'chat_messages' AND policyname = 'chat_messages_delete_sender_only'
    ) THEN
      EXECUTE 'create policy chat_messages_delete_sender_only on public.chat_messages for delete to authenticated using (sender_id = auth.uid())';
    END IF;
  END IF;
END $$;

-- Chat read state
DO $$
BEGIN
  IF to_regclass('public.chat_read_state') IS NOT NULL THEN
    EXECUTE 'alter table public.chat_read_state enable row level security';

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'chat_read_state' AND policyname = 'chat_read_state_member_only'
    ) THEN
      EXECUTE 'create policy chat_read_state_member_only on public.chat_read_state for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())';
    END IF;
  END IF;
END $$;

-- Study tasks and milestones
DO $$
BEGIN
  IF to_regclass('public.study_tasks') IS NOT NULL THEN
    EXECUTE 'alter table public.study_tasks enable row level security';

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'study_tasks' AND policyname = 'study_tasks_owner_only'
    ) THEN
      EXECUTE 'create policy study_tasks_owner_only on public.study_tasks for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())';
    END IF;
  END IF;

  IF to_regclass('public.study_milestones') IS NOT NULL THEN
    EXECUTE 'alter table public.study_milestones enable row level security';

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'study_milestones' AND policyname = 'study_milestones_owner_only'
    ) THEN
      EXECUTE 'create policy study_milestones_owner_only on public.study_milestones for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())';
    END IF;
  END IF;
END $$;

-- Optional public read for active courses.
DO $$
BEGIN
  IF to_regclass('public.courses') IS NOT NULL THEN
    EXECUTE 'alter table public.courses enable row level security';

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'courses' AND policyname = 'courses_read_active'
    ) THEN
      EXECUTE 'create policy courses_read_active on public.courses for select to authenticated using (coalesce(is_active, true) = true)';
    END IF;
  END IF;
END $$;
