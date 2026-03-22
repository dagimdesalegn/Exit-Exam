# Exit Exam Guide (2 Users)

A free starter website for two users (you + your girlfriend) with:

- Login and account creation (Supabase Auth)
- Profile page with avatar upload
- Real-time progress tracking for both users
- Structured study planner with full Computer Science course list, milestones, and weekly targets
- Real-time private chat
- AI summary answer generation (DeepSeek via Supabase Edge Function)
- Scheduled summary requests with fully automatic cron processing
- Exam analytics charts for both users (completion rate, consistency, weak topics)

## 1) Supabase Setup

1. Create a free Supabase project.
2. In SQL Editor, run [supabase/schema.sql](supabase/schema.sql).
3. For ready test users, run [supabase/create_two_users.sql](supabase/create_two_users.sql).
	It creates:
	- `ddagim` / `GINBOT24` (male)
	- `enat` / `GINBOT24` (female)
	and stores the new important profile column `target_score`.
4. In Authentication settings:
- Keep Email auth enabled.
- For quick testing, disable email confirmation.
5. In Database > Replication, ensure tables are enabled for Realtime.
6. If profile image upload fails, run [supabase/avatar_storage_setup.sql](supabase/avatar_storage_setup.sql) once.

## 2) Frontend Config

1. Open [config.js](config.js).
2. Set:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Note: The anon key is safe for frontend use with RLS.

## 3) DeepSeek AI Function Setup

Install Supabase CLI (free):

```bash
npm i -g supabase
```

Login and link project:

```bash
supabase login
supabase link --project-ref tzamwbvvgxohwzxxcpoz
```

Deploy function:

```bash
supabase functions deploy ai-summary
```

Set function secrets:

```bash
supabase secrets set DEEPSEEK_API_KEY=sk-1420505bef404377984d02e34eb67620
supabase secrets set SUPABASE_URL=https://tzamwbvvgxohwzxxcpoz.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6YW13YnZ2Z3hvaHd6eHhjcG96Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDE0MDUxMiwiZXhwIjoyMDg5NzE2NTEyfQ.OAdwM-wOv4rYet40XhibfImxUYbRdzNdAimlUuQVmDY
```

## 4) Automatic AI Schedule (Hands-Off)

Run [supabase/cron.sql](supabase/cron.sql) in Supabase SQL Editor.

This creates a cron job that calls the edge function every 5 minutes and processes all due scheduled questions.

## 5) Local Run

Use any static server (free):

```bash
npx serve .
```

Open the shown URL.

## 6) Free Deployment Options

- Netlify (drag-and-drop or Git deploy)
- Vercel (static deploy)
- Cloudflare Pages
- GitHub Pages

Deploy all files as static site.

## 7) First-Time Use Flow

1. Create users with [supabase/create_two_users.sql](supabase/create_two_users.sql).
2. Login with username only (no email field):
	- `ddagim` / `GINBOT24`
	- `enat` / `GINBOT24`
3. In Profile tab, each user sets a username.
4. One user enters the partner username and connects.
5. Start adding milestones, weekly targets, and progress tasks.
6. Use Analytics tab for completion, consistency, and weak-topic tracking.
7. Ask AI questions and use scheduled time for automatic summary generation.

## Security Note

- Keep DeepSeek key only in Supabase function secrets.
- Do not put DeepSeek key in frontend JavaScript.
- If any key was shared in chat/screenshots, rotate it immediately in Supabase and DeepSeek dashboards.
