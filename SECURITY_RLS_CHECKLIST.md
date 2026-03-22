# Exit-Exam Security + RLS Checklist

This checklist is tailored to your current app tables and edge function usage.

## 1. Immediate Security Baseline

- Enable RLS on every user-data table:
  - `profiles`
  - `pair_links`
  - `study_tasks`
  - `study_milestones`
  - `weekly_targets`
  - `questions`
  - `question_attempts`
  - `chat_messages`
  - `chat_read_state`
  - `course_chapters`
- Keep `courses` read-only to authenticated users.
- Never expose service-role keys to client code.
- Use short-lived JWTs and keep `persistSession` only on trusted clients.

## 2. Recommended Policy Model (per table)

## `profiles`
- Select: own profile + linked partner profile.
- Insert: own profile only.
- Update: own profile only.
- Delete: disallow.

## `pair_links`
- Select: rows where `auth.uid()` is either `user_id` or `partner_id`.
- Insert/Update/Delete: only by owner-side workflow or admin function.

## `study_tasks`, `study_milestones`, `weekly_targets`, `questions`, `question_attempts`, `course_chapters`
- Select: owner rows + linked partner rows.
- Insert: `user_id = auth.uid()` only.
- Update/Delete: only `user_id = auth.uid()`.

## `chat_messages`
- Select: only where `(sender_id = auth.uid() OR receiver_id = auth.uid())`.
- Insert: only if `sender_id = auth.uid()` and receiver is linked partner.
- Update: only controlled fields (like `seen_at`) by receiver.
- Delete: generally disallow in production.

## `chat_read_state`
- Select/Upsert: only own `user_id = auth.uid()` rows.

## `courses`
- Select: authenticated users only.
- Insert/Update/Delete: admin/service-role only.

## 3. Edge Function Hardening (ai-summary)

Already improved in code:
- Restricted CORS via `ALLOWED_ORIGINS`.
- Auth-required for single-question invocation.
- Ownership check (`question.user_id` must match caller for `questionId` calls).
- Scheduler path gated by `x-cron-secret` and `SCHEDULER_SECRET`.
- Reduced provider error leakage in stored `ai_summary`.

Set these secrets in Supabase project:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DEEPSEEK_API_KEY`
- `ALLOWED_ORIGINS` (comma-separated, e.g. `http://localhost:8000,https://your-app.vercel.app`)
- `SCHEDULER_SECRET`

## 4. SQL Snippets (starter templates)

```sql
-- Example: study_tasks
alter table public.study_tasks enable row level security;

create policy "study_tasks_select_owner_or_partner"
on public.study_tasks
for select
using (
  user_id = auth.uid()
  or user_id in (
    select case
      when pl.user_id = auth.uid() then pl.partner_id
      else pl.user_id
    end
    from public.pair_links pl
    where pl.user_id = auth.uid() or pl.partner_id = auth.uid()
  )
);

create policy "study_tasks_insert_owner"
on public.study_tasks
for insert
with check (user_id = auth.uid());

create policy "study_tasks_update_owner"
on public.study_tasks
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "study_tasks_delete_owner"
on public.study_tasks
for delete
using (user_id = auth.uid());
```

```sql
-- Example: courses read-only for authenticated users
alter table public.courses enable row level security;

create policy "courses_select_authenticated"
on public.courses
for select
to authenticated
using (true);
```

## 5. Verification Steps

- In SQL editor, test as two different users:
  - User A can read/write own rows.
  - User A can read partner rows where intended.
  - User A cannot update/delete partner rows.
  - User A cannot read unrelated user rows.
- Test `ai-summary` function:
  - Authenticated owner request with own `questionId` succeeds.
  - Authenticated non-owner request fails with forbidden.
  - No-auth request fails with unauthorized.
  - Scheduler request without `x-cron-secret` fails.

## 6. Ongoing Hardening

- Add DB constraints:
  - `progress`, `completion`, `score_percent` in `0..100`.
  - non-null + length checks on critical text columns.
- Add function rate limits (API gateway/WAF where available).
- Add audit fields and logs for AI-triggered actions.
- Review storage bucket policies (`avatars`) to ensure write access only for own path.
