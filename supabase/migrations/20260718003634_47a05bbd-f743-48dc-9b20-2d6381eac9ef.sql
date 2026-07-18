
-- 1) Add founder flag to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_founder BOOLEAN NOT NULL DEFAULT false;

-- Mark all existing users as founders (only the owner exists today)
UPDATE public.profiles SET is_founder = true WHERE is_founder = false;

-- 2) Plans catalog
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  sales_limit INTEGER NOT NULL CHECK (sales_limit > 0),
  duration_days INTEGER NOT NULL DEFAULT 30 CHECK (duration_days > 0),
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.plans TO anon, authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plans are viewable by anyone"
  ON public.plans FOR SELECT
  USING (is_active = true);

CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Subscriptions
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled','pending')),
  sales_used INTEGER NOT NULL DEFAULT 0 CHECK (sales_used >= 0),
  sales_limit_snapshot INTEGER NOT NULL CHECK (sales_limit_snapshot > 0),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_payment_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX subscriptions_user_id_idx ON public.subscriptions(user_id);
CREATE INDEX subscriptions_status_idx ON public.subscriptions(status);
-- Only one active subscription per user
CREATE UNIQUE INDEX subscriptions_one_active_per_user
  ON public.subscriptions(user_id) WHERE status = 'active';

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) can_process_sale: founder always yes, otherwise active + saldo + não expirada
CREATE OR REPLACE FUNCTION public.can_process_sale(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_founder BOOLEAN;
  _ok BOOLEAN;
BEGIN
  SELECT COALESCE(is_founder, false) INTO _is_founder
  FROM public.profiles WHERE id = _user_id;

  IF _is_founder THEN
    RETURN true;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id
      AND status = 'active'
      AND expires_at > now()
      AND sales_used < sales_limit_snapshot
  ) INTO _ok;

  RETURN _ok;
END;
$$;

-- 5) increment_sale_usage: no-op for founder, senão soma 1 e expira se estourou
CREATE OR REPLACE FUNCTION public.increment_sale_usage(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_founder BOOLEAN;
BEGIN
  SELECT COALESCE(is_founder, false) INTO _is_founder
  FROM public.profiles WHERE id = _user_id;

  IF _is_founder THEN
    RETURN;
  END IF;

  UPDATE public.subscriptions
     SET sales_used = sales_used + 1,
         status = CASE
           WHEN sales_used + 1 >= sales_limit_snapshot THEN 'expired'
           ELSE status
         END
   WHERE user_id = _user_id AND status = 'active';
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_process_sale(UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.increment_sale_usage(UUID) TO service_role;

-- 6) Seed initial plans
INSERT INTO public.plans (slug, name, description, price_cents, sales_limit, duration_days, features, sort_order) VALUES
  ('starter', 'Starter', 'Ideal para começar', 4700, 500, 30,
   '["Até 500 vendas aprovadas/mês","Webhooks universais","Notificações push","Painel da equipe"]'::jsonb, 1),
  ('pro', 'Pro', 'Para quem já está escalando', 9700, 2000, 30,
   '["Até 2.000 vendas aprovadas/mês","Todos os recursos do Starter","Gerador de notificações","Suporte prioritário"]'::jsonb, 2),
  ('scale', 'Scale', 'Para operações grandes', 19700, 10000, 30,
   '["Até 10.000 vendas aprovadas/mês","Todos os recursos do Pro","Múltiplos gateways","Suporte VIP"]'::jsonb, 3);
