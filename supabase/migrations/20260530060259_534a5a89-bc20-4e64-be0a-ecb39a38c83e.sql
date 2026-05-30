
-- Faturamentos diários
CREATE TABLE public.faturamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL,
  faturamento_bruto NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_faturamentos_data ON public.faturamentos(data);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.faturamentos TO anon, authenticated;
GRANT ALL ON public.faturamentos TO service_role;
ALTER TABLE public.faturamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all_faturamentos" ON public.faturamentos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Fechamentos
CREATE TABLE public.fechamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  faturamento_bruto NUMERIC(12,2) NOT NULL,
  faturamento_liquido NUMERIC(12,2) NOT NULL,
  taxa_valor NUMERIC(12,2) NOT NULL,
  taxa_percentual NUMERIC(6,2) NOT NULL,
  imposto NUMERIC(12,2) NOT NULL,
  lucro_real NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fechamentos TO anon, authenticated;
GRANT ALL ON public.fechamentos TO service_role;
ALTER TABLE public.fechamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all_fechamentos" ON public.fechamentos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Metas (linha única)
CREATE TABLE public.metas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_diaria NUMERIC(12,2) NOT NULL DEFAULT 0,
  meta_semanal NUMERIC(12,2) NOT NULL DEFAULT 0,
  meta_mensal NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.metas TO anon, authenticated;
GRANT ALL ON public.metas TO service_role;
ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all_metas" ON public.metas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

INSERT INTO public.metas (meta_diaria, meta_semanal, meta_mensal) VALUES (0, 0, 0);

-- Configurações (linha única)
CREATE TABLE public.configuracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imposto_fixo NUMERIC(12,2) NOT NULL DEFAULT 8.50,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracoes TO anon, authenticated;
GRANT ALL ON public.configuracoes TO service_role;
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all_configuracoes" ON public.configuracoes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

INSERT INTO public.configuracoes (imposto_fixo) VALUES (8.50);
