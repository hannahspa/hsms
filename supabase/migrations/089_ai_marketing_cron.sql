-- Migration 089: AI Marketing scheduled automation
-- Chay Edge Function theo lich bang pg_cron + pg_net.
-- Can tao secret trong Supabase Vault truoc khi cron gui request:
--   select vault.create_secret('https://aqyemkfbjqxpegingoil.supabase.co', 'HSMS_SUPABASE_PROJECT_URL');
--   select vault.create_secret('SUPABASE_SERVICE_ROLE_KEY', 'HSMS_SUPABASE_SERVICE_ROLE_KEY');

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

DO $$
BEGIN
  PERFORM cron.unschedule('hsms-marketing-meta-page-sync');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('hsms-marketing-ai-analyze-hourly');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('hsms-marketing-ai-content-daily');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('hsms-marketing-ai-draft-content');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('hsms-marketing-ai-run-approved');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'hsms-marketing-meta-page-sync',
  '*/30 * * * *',
  $$
  WITH cfg AS (
    SELECT
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'HSMS_SUPABASE_PROJECT_URL' LIMIT 1) AS project_url,
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'HSMS_SUPABASE_SERVICE_ROLE_KEY' LIMIT 1) AS service_role_key
  )
  SELECT net.http_post(
    url := project_url || '/functions/v1/marketing-meta-page-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := jsonb_build_object('source', 'cron')
  ) AS request_id
  FROM cfg
  WHERE project_url IS NOT NULL AND service_role_key IS NOT NULL;
  $$
);

SELECT cron.schedule(
  'hsms-marketing-ai-analyze-hourly',
  '15 * * * *',
  $$
  WITH cfg AS (
    SELECT
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'HSMS_SUPABASE_PROJECT_URL' LIMIT 1) AS project_url,
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'HSMS_SUPABASE_SERVICE_ROLE_KEY' LIMIT 1) AS service_role_key
  )
  SELECT net.http_post(
    url := project_url || '/functions/v1/marketing-ai',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := jsonb_build_object('mode', 'analyze', 'source', 'cron')
  ) AS request_id
  FROM cfg
  WHERE project_url IS NOT NULL AND service_role_key IS NOT NULL;
  $$
);

SELECT cron.schedule(
  'hsms-marketing-ai-content-daily',
  '30 2 * * *',
  $$
  WITH cfg AS (
    SELECT
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'HSMS_SUPABASE_PROJECT_URL' LIMIT 1) AS project_url,
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'HSMS_SUPABASE_SERVICE_ROLE_KEY' LIMIT 1) AS service_role_key
  )
  SELECT net.http_post(
    url := project_url || '/functions/v1/marketing-ai',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := jsonb_build_object('mode', 'content_plan', 'source', 'cron')
  ) AS request_id
  FROM cfg
  WHERE project_url IS NOT NULL AND service_role_key IS NOT NULL;
  $$
);

SELECT cron.schedule(
  'hsms-marketing-ai-draft-content',
  '*/30 * * * *',
  $$
  WITH cfg AS (
    SELECT
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'HSMS_SUPABASE_PROJECT_URL' LIMIT 1) AS project_url,
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'HSMS_SUPABASE_SERVICE_ROLE_KEY' LIMIT 1) AS service_role_key
  )
  SELECT net.http_post(
    url := project_url || '/functions/v1/marketing-ai',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := jsonb_build_object('mode', 'draft_content', 'source', 'cron')
  ) AS request_id
  FROM cfg
  WHERE project_url IS NOT NULL AND service_role_key IS NOT NULL;
  $$
);

SELECT cron.schedule(
  'hsms-marketing-ai-run-approved',
  '*/10 * * * *',
  $$
  WITH cfg AS (
    SELECT
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'HSMS_SUPABASE_PROJECT_URL' LIMIT 1) AS project_url,
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'HSMS_SUPABASE_SERVICE_ROLE_KEY' LIMIT 1) AS service_role_key
  )
  SELECT net.http_post(
    url := project_url || '/functions/v1/marketing-ai',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := jsonb_build_object('mode', 'run_approved', 'source', 'cron')
  ) AS request_id
  FROM cfg
  WHERE project_url IS NOT NULL AND service_role_key IS NOT NULL;
  $$
);
