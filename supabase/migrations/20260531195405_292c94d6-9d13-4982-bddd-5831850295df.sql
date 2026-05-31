
CREATE TABLE public.gastos_anuncios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  data DATE NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  descricao TEXT,
  plataforma TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gastos_anuncios TO authenticated;
GRANT ALL ON public.gastos_anuncios TO service_role;

ALTER TABLE public.gastos_anuncios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_gastos_anuncios"
ON public.gastos_anuncios
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_gastos_anuncios_user_data ON public.gastos_anuncios(user_id, data DESC);
