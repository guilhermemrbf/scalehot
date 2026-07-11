
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS employee_visible boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_transactions_employee_visible ON public.transactions (user_id, employee_visible) WHERE employee_visible = true;

CREATE TABLE IF NOT EXISTS public.employee_panels (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  password text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_panels TO authenticated;
GRANT ALL ON public.employee_panels TO service_role;
ALTER TABLE public.employee_panels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_employee_panel" ON public.employee_panels
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
