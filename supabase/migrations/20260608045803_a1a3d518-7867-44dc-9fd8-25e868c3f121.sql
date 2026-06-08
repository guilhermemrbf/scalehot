
CREATE TABLE public.user_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gateway text NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  webhook_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, gateway, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_integrations TO authenticated;
GRANT ALL ON public.user_integrations TO service_role;

ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own integrations"
  ON public.user_integrations FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gateway text NOT NULL,
  transaction_id text,
  type text NOT NULL,
  status text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  liquid_amount numeric,
  client_name text,
  client_email text,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, gateway, transaction_id)
);

GRANT SELECT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own transactions"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_transactions_user_created ON public.transactions (user_id, created_at DESC);
CREATE INDEX idx_transactions_user_type ON public.transactions (user_id, type);

ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_integrations;
ALTER TABLE public.transactions REPLICA IDENTITY FULL;
ALTER TABLE public.user_integrations REPLICA IDENTITY FULL;
