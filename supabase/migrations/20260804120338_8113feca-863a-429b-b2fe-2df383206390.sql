CREATE TABLE public.employee_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  password text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_clients TO authenticated;
GRANT ALL ON public.employee_clients TO service_role;

ALTER TABLE public.employee_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_employee_clients" ON public.employee_clients
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_employee_clients_updated_at
  BEFORE UPDATE ON public.employee_clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_employee_clients_user ON public.employee_clients(user_id);

ALTER TABLE public.transactions
  ADD COLUMN employee_client_id uuid REFERENCES public.employee_clients(id) ON DELETE SET NULL;
CREATE INDEX idx_transactions_employee_client ON public.transactions(employee_client_id);

ALTER TABLE public.withdrawal_requests
  ADD COLUMN employee_client_id uuid REFERENCES public.employee_clients(id) ON DELETE SET NULL;
CREATE INDEX idx_withdrawals_employee_client ON public.withdrawal_requests(employee_client_id);

-- Migra painéis existentes para o novo modelo
INSERT INTO public.employee_clients (user_id, name, slug, password)
SELECT ep.user_id, 'Cliente 1', 'cliente-1-' || substr(ep.user_id::text, 1, 8), ep.password
FROM public.employee_panels ep;

UPDATE public.transactions t
SET employee_client_id = ec.id
FROM public.employee_clients ec
WHERE ec.user_id = t.user_id AND t.employee_visible = true AND t.employee_client_id IS NULL;

UPDATE public.withdrawal_requests w
SET employee_client_id = ec.id
FROM public.employee_clients ec
WHERE ec.user_id = w.user_id AND w.employee_client_id IS NULL;