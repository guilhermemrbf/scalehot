-- Clear existing demo data (pre-auth)
DELETE FROM public.faturamentos;
DELETE FROM public.fechamentos;
DELETE FROM public.metas;
DELETE FROM public.configuracoes;

-- Add user_id columns
ALTER TABLE public.faturamentos ADD COLUMN user_id UUID NOT NULL;
ALTER TABLE public.fechamentos ADD COLUMN user_id UUID NOT NULL;
ALTER TABLE public.metas ADD COLUMN user_id UUID NOT NULL UNIQUE;
ALTER TABLE public.configuracoes ADD COLUMN user_id UUID NOT NULL UNIQUE;

CREATE INDEX idx_faturamentos_user ON public.faturamentos(user_id, data);
CREATE INDEX idx_fechamentos_user ON public.fechamentos(user_id, data_inicio);

-- Replace permissive policies with per-user RLS
DROP POLICY IF EXISTS public_all_faturamentos ON public.faturamentos;
DROP POLICY IF EXISTS public_all_fechamentos ON public.fechamentos;
DROP POLICY IF EXISTS public_all_metas ON public.metas;
DROP POLICY IF EXISTS public_all_configuracoes ON public.configuracoes;

-- Revoke anon access
REVOKE ALL ON public.faturamentos FROM anon;
REVOKE ALL ON public.fechamentos FROM anon;
REVOKE ALL ON public.metas FROM anon;
REVOKE ALL ON public.configuracoes FROM anon;

CREATE POLICY "own_faturamentos" ON public.faturamentos FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_fechamentos" ON public.fechamentos FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_metas" ON public.metas FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_configuracoes" ON public.configuracoes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Auto-seed metas + configuracoes on new user signup
CREATE OR REPLACE FUNCTION public.seed_user_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.configuracoes (user_id, imposto_fixo) VALUES (NEW.id, 8.50);
  INSERT INTO public.metas (user_id, meta_diaria, meta_semanal, meta_mensal) VALUES (NEW.id, 0, 0, 0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_seed ON auth.users;
CREATE TRIGGER on_auth_user_created_seed
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.seed_user_defaults();