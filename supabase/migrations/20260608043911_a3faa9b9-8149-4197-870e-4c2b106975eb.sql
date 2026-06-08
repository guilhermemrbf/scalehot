
CREATE TABLE public.syncpay_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id text UNIQUE NOT NULL,
  external_reference text,
  type text NOT NULL,
  status text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  liquid_amount numeric,
  taxa_deposito numeric,
  taxa_adquirente numeric,
  client_name text,
  client_email text,
  client_document text,
  beneficiary_name text,
  pix_key text,
  data_registro timestamptz,
  user_id uuid,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.syncpay_transactions TO authenticated;
GRANT ALL ON public.syncpay_transactions TO service_role;

ALTER TABLE public.syncpay_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own syncpay transactions"
  ON public.syncpay_transactions
  FOR SELECT
  TO authenticated
  USING (user_id IS NULL OR auth.uid() = user_id);

CREATE INDEX idx_syncpay_transactions_created_at ON public.syncpay_transactions (created_at DESC);
CREATE INDEX idx_syncpay_transactions_type_status ON public.syncpay_transactions (type, status);

ALTER PUBLICATION supabase_realtime ADD TABLE public.syncpay_transactions;
ALTER TABLE public.syncpay_transactions REPLICA IDENTITY FULL;
