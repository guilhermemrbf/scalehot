
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_preferences jsonb NOT NULL DEFAULT '{"per_sale": true, "milestones": true, "daily_summary": true, "bot_offline": true}'::jsonb;

DROP TABLE IF EXISTS public.push_subscriptions CASCADE;
