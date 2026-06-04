ALTER TABLE public.faturamentos ADD COLUMN IF NOT EXISTS reembolsos_count INTEGER DEFAULT 0;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faturamentos TO authenticated;
GRANT ALL ON public.faturamentos TO service_role;