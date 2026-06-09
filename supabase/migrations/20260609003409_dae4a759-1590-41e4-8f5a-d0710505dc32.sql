DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'transactions_pkey'
      AND conrelid = 'public.transactions'::regclass
  ) THEN
    ALTER TABLE public.transactions ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS transactions_user_gateway_transaction_id_key
  ON public.transactions (user_id, gateway, transaction_id)
  WHERE transaction_id IS NOT NULL;

GRANT SELECT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;