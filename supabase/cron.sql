-- Run this after deploying edge function `ai-summary`
-- This enables fully automatic processing of scheduled AI summaries.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Store secure values in Vault (run once)
-- Replace placeholders before running.
select vault.create_secret('https://tzamwbvvgxohwzxxcpoz.supabase.co', 'project_url');
select vault.create_secret('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6YW13YnZ2Z3hvaHd6eHhjcG96Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDE0MDUxMiwiZXhwIjoyMDg5NzE2NTEyfQ.OAdwM-wOv4rYet40XhibfImxUYbRdzNdAimlUuQVmDY', 'service_role_key');

-- Remove old job if already created
select cron.unschedule('ai_summary_every_5m');

-- Schedule: every 5 minutes process due questions
select
  cron.schedule(
    'ai_summary_every_5m',
    '*/5 * * * *',
    $$
    select
      net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/ai-summary',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
        ),
        body := '{}'::jsonb
      );
    $$
  );

-- Verify job exists
select jobid, jobname, schedule, command from cron.job where jobname = 'ai_summary_every_5m';
