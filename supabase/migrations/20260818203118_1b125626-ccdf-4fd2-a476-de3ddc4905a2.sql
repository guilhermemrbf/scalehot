-- Corrigir cálculo de lucro no get_dashboard_metrics
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(
  _user_id uuid,
  _start_date date DEFAULT NULL,
  _end_date date DEFAULT NULL
)
RETURNS TABLE (
  faturamento_bruto numeric,
  faturamento_liquido numeric,
  lucro numeric,
  total_taxas numeric,
  total_imposto numeric,
  roi numeric,
  qtd_vendas bigint,
  qtd_reembolsos bigint,
  qtd_pendentes bigint,
  total_pendente numeric,
  saldo_disponivel numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _imposto_mensal numeric;
  _taxa_bot_por_venda numeric;
  _bruto numeric := 0;
  _liquido numeric := 0;
  _taxa_gateway numeric := 0;
  _qtd bigint := 0;
  _refunds bigint := 0;
  _pendentes bigint := 0;
  _pendente_val numeric := 0;
  _anuncios numeric := 0;
  _meses bigint;
  _saldo numeric;
BEGIN
  SELECT COALESCE(c.imposto_fixo, 0), COALESCE(c.taxa_bot_fixa, 0)
    INTO _imposto_mensal, _taxa_bot_por_venda
    FROM public.configuracoes c
   WHERE c.user_id = _user_id
   LIMIT 1;

  SELECT
    COALESCE(SUM(t.amount), 0),
    COALESCE(SUM(COALESCE(t.liquid_amount, t.amount)), 0),
    COUNT(*) FILTER (WHERE t.type = 'cashin' AND t.status IN ('PAID_OUT', 'PAID', 'COMPLETED', 'RECEIVED', 'APPROVED', 'SUCCESS', 'CONFIRMED')),
    COUNT(*) FILTER (WHERE t.type = 'refund')
    INTO _bruto, _liquido, _qtd, _refunds
    FROM public.transactions t
   WHERE t.user_id = _user_id
     AND (t.employee_visible = true OR t.employee_client_id IS NULL)
     AND (_start_date IS NULL OR t.created_at >= _start_date::timestamptz)
     AND (_end_date IS NULL OR t.created_at <= (_end_date + interval '1 day')::timestamptz);

  _taxa_gateway := _bruto - _liquido;

  SELECT COUNT(*), COALESCE(SUM(COALESCE(t.liquid_amount, t.amount)), 0)
    INTO _pendentes, _pendente_val
    FROM public.transactions t
   WHERE t.user_id = _user_id
     AND t.type = 'cashin' AND t.status = 'PENDING'
     AND (_start_date IS NULL OR t.created_at >= _start_date::timestamptz)
     AND (_end_date IS NULL OR t.created_at <= (_end_date + interval '1 day')::timestamptz);

  -- Usar gastos_anuncios se existir f.valor não existe em faturamentos
  SELECT COALESCE(SUM(g.valor), 0)
    INTO _anuncios
    FROM public.gastos_anuncios g
   WHERE g.user_id = _user_id
     AND (_start_date IS NULL OR g.data >= _start_date)
     AND (_end_date IS NULL OR g.data <= _end_date);

  SELECT COUNT(DISTINCT public.to_brt_month(t.created_at))
    INTO _meses
    FROM public.transactions t
   WHERE t.user_id = _user_id
     AND t.type = 'cashin' AND t.status IN ('PAID_OUT', 'PAID', 'COMPLETED', 'RECEIVED', 'APPROVED', 'SUCCESS', 'CONFIRMED')
     AND (_start_date IS NULL OR t.created_at >= _start_date::timestamptz)
     AND (_end_date IS NULL OR t.created_at <= (_end_date + interval '1 day')::timestamptz);

  _saldo := public.get_available_balance(_user_id);

  RETURN QUERY
  SELECT
    _bruto::numeric AS faturamento_bruto,
    _liquido::numeric AS faturamento_liquido,
    (CASE WHEN _qtd > 0 THEN (_liquido - _anuncios - (_qtd * _taxa_bot_por_venda) - (_meses * _imposto_mensal)) ELSE 0 END)::numeric AS lucro,
    (_taxa_gateway + (_qtd * _taxa_bot_por_venda))::numeric AS total_taxas,
    (_meses * _imposto_mensal)::numeric AS total_imposto,
    CASE WHEN (_anuncios + (_qtd * _taxa_bot_por_venda) + (_meses * _imposto_mensal)) > 0 
         THEN (_liquido / (_anuncios + (_qtd * _taxa_bot_por_venda) + (_meses * _imposto_mensal)))
         ELSE 0 END::numeric AS roi,
    _qtd AS qtd_vendas,
    _refunds AS qtd_reembolsos,
    _pendentes AS qtd_pendentes,
    _pendente_val::numeric AS total_pendente,
    _saldo::numeric AS saldo_disponivel;
END;
$$;

-- Corrigir get_client_panel_metrics
CREATE OR REPLACE FUNCTION public.get_client_panel_metrics(
  _owner_id uuid,
  _client_id uuid DEFAULT NULL
)
RETURNS TABLE (
  faturamento_liquido numeric,
  lucro numeric,
  total_taxas numeric,
  total_imposto numeric,
  total_reembolsos bigint,
  qtd_vendas bigint,
  qtd_pendentes bigint,
  total_pendente numeric,
  saques_pagos numeric,
  saques_pendentes numeric,
  saldo_disponivel numeric,
  taxa_media_pct numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _imposto_mensal numeric;
  _taxa_bot_por_venda numeric;
  _bruto numeric := 0;
  _liquido numeric := 0;
  _taxa_gateway numeric := 0;
  _qtd bigint := 0;
  _refunds bigint := 0;
  _pendentes bigint := 0;
  _pendente_val numeric := 0;
  _saques_pagos numeric := 0;
  _saques_pendentes numeric := 0;
  _meses bigint;
BEGIN
  SELECT COALESCE(c.imposto_fixo, 0), COALESCE(c.taxa_bot_fixa, 0)
    INTO _imposto_mensal, _taxa_bot_por_venda
    FROM public.configuracoes c
   WHERE c.user_id = _owner_id
   LIMIT 1;

  SELECT
    COALESCE(SUM(t.amount), 0),
    COALESCE(SUM(COALESCE(t.liquid_amount, t.amount)), 0),
    COUNT(*) FILTER (WHERE t.type = 'cashin' AND t.status IN ('PAID_OUT', 'PAID', 'COMPLETED', 'RECEIVED', 'APPROVED', 'SUCCESS', 'CONFIRMED')),
    COUNT(*) FILTER (WHERE t.type = 'refund')
    INTO _bruto, _liquido, _qtd, _refunds
    FROM public.transactions t
   WHERE t.user_id = _owner_id
     AND t.employee_visible = true
     AND (_client_id IS NULL OR t.employee_client_id = _client_id);

  _taxa_gateway := _bruto - _liquido;

  SELECT COUNT(*), COALESCE(SUM(COALESCE(t.liquid_amount, t.amount)), 0)
    INTO _pendentes, _pendente_val
    FROM public.transactions t
   WHERE t.user_id = _owner_id
     AND t.type = 'cashin' AND t.status = 'PENDING'
     AND t.employee_visible = false
     AND (_client_id IS NULL OR t.employee_client_id = _client_id);

  SELECT
    COALESCE(SUM(amount) FILTER (WHERE status = 'approved'), 0),
    COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0)
    INTO _saques_pagos, _saques_pendentes
    FROM public.withdrawal_requests w
   WHERE w.user_id = _owner_id
     AND (_client_id IS NULL OR w.employee_client_id = _client_id);

  SELECT COUNT(DISTINCT public.to_brt_month(t.created_at))
    INTO _meses
    FROM public.transactions t
   WHERE t.user_id = _owner_id
     AND t.employee_visible = true
     AND t.type = 'cashin' AND t.status IN ('PAID_OUT', 'PAID', 'COMPLETED', 'RECEIVED', 'APPROVED', 'SUCCESS', 'CONFIRMED')
     AND (_client_id IS NULL OR t.employee_client_id = _client_id);

  RETURN QUERY
  SELECT
    _liquido::numeric AS faturamento_liquido,
    (CASE WHEN _qtd > 0 THEN _liquido ELSE 0 END)::numeric AS lucro,
    (_taxa_gateway + (_qtd * _taxa_bot_por_venda))::numeric AS total_taxas,
    (_meses * _imposto_mensal)::numeric AS total_imposto,
    _refunds AS total_reembolsos,
    _qtd AS qtd_vendas,
    _pendentes AS qtd_pendentes,
    _pendente_val::numeric AS total_pendente,
    _saques_pagos::numeric AS saques_pagos,
    _saques_pendentes::numeric AS saques_pendentes,
    GREATEST(_liquido - _saques_pagos, 0)::numeric AS saldo_disponivel,
    CASE WHEN _bruto > 0 THEN ((_taxa_gateway + (_qtd * _taxa_bot_por_venda)) / _bruto) * 100 ELSE 0 END::numeric AS taxa_media_pct;
END;
$$;