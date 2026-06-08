
-- 1) Preferences column on push_subscriptions
ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS preferences jsonb NOT NULL DEFAULT
    '{"daily_summary": true, "milestones": true, "per_sale": true}'::jsonb;

-- 2) Schedule daily summary at 23:00 UTC (20:00 America/Sao_Paulo)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Unschedule if exists, then schedule fresh
DO $$
BEGIN
  PERFORM cron.unschedule('daily-summary-notification');
EXCEPTION WHEN OTHERS THEN
  -- ignore if not scheduled yet
  NULL;
END $$;

SELECT cron.schedule(
  'daily-summary-notification',
  '0 23 * * *',
  $$
  SELECT net.http_post(
    url := 'https://scalehot.lovable.app/api/public/send-daily-summary',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'sb_publishable_gcYya-wmgtO9-WjpSope4g_CVX6uf98'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
