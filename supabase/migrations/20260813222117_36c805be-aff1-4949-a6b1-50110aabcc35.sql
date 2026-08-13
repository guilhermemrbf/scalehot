-- Move os cálculos financeiros do frontend para o banco de dados.
-- As funções abaixo centralizam: dashboard do dono, painel do cliente e saldo disponível.

-- Helper: converte timestamptz para data em UTC-3 (BRT)
CREATE OR REPLACE FUNCTION public.to_brt_date(_ts timestamptz)
RETURNS date
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT ((_ts AT TIME ZONE 'UTC') - interval '3 hours')::date;
$$;

-- Helper: converte timestamptz para ano-mês em UTC-3 (BRT), formato YYYY-MM
CREATE OR REPLACE FUNCTION public.to_brt_month(_ts timestamptz)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT to_char(((_ts AT TIME ZONE 'UTC') - interval '3 hours'), 'YYYY-MM');
$$;

-- Helper: data de início do período solicitado em UTC
CREATE OR REPLACE FUNCTION public.period_start_utc(_periodo text, _ref timestamptz DEFAULT now())
RETURNS timestamptz
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT CASE _periodo
    WHEN 'hoje' THEN
      ((date_trunc('day', ((_ref AT TIME ZONE 'UTC') - interval '3 hours')::timestamp) + interval '3 hours') AT TIME ZONE 'UTC')
    WHEN 'mes' THEN
      ((date_trunc('month', ((_ref AT TIME ZONE 'UTC') - interval '3 hours')::timestamp) + interval '3 hours') AT TIME ZONE 'UTC')
    ELSE '1970-01-01'::timestamptz
  END;
$$;

-- Dashboard do dono: retorna todas as métricas financeiras para um período
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(
  _user_id uuid,
  _periodo text DEFAULT 'mes'
)
RETURNS TABLE (
  total_bruto numeric,
  total_liquido numeric,
  taxa_gateway numeric,
  taxa_bot numeric,
  total_taxas numeric,
  total_imposto numeric,
  total_anuncios numeric,
  total_reembolsos numeric,
  qtd_vendas bigint,
  qtd_reembolsos bigint,
  lucro_total numeric,
  roi numeric,
  taxa_media_pct numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _start_utc timestamptz;
  _end_utc timestamptz;
  _imposto_mensal numeric;
  _taxa_bot_por_venda numeric;
  _bruto_webhooks numeric := 0;
  _liquido_webhooks numeric := 0;
  _bruto_legacy numeric := 0;
  _bruto_refunds numeric := 0;
  _qtd_vendas bigint := 0;
  _qtd_refunds bigint := 0;
  _gastos_manuais numeric := 0;
  _reembolsos_legacy numeric := 0;
  _total_repasses numeric := 0;
  _meses_vendas bigint;
BEGIN
  _start_utc := public.period_start_utc(_periodo);
  _end_utc := CASE _periodo
    WHEN 'hoje' THEN _start_utc + interval '1 day'
    ELSE now()
  END;

  SELECT COALESCE(c.imposto_fixo, 0), COALESCE(c.taxa_bot_fixa, 0)
    INTO _imposto_mensal, _taxa_bot_por_venda
    FROM public.configuracoes c
   WHERE c.user_id = _user_id
   LIMIT 1;

  SELECT
    COALESCE(SUM(CASE WHEN t.type = 'cashin' THEN t.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN t.type = 'cashin' THEN COALESCE(t.liquid_amount, t.amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN t.type = 'refund' THEN t.amount ELSE 0 END), 0),
    COUNT(*) FILTER (WHERE t.type = 'cashin'),
    COUNT(*) FILTER (WHERE t.type = 'refund')
    INTO _bruto_webhooks, _liquido_webhooks, _bruto_refunds, _qtd_vendas, _qtd_refunds
    FROM public.transactions t
   WHERE t.user_id = _user_id
     AND t.created_at >= _start_utc
     AND t.created_at < _end_utc;

  SELECT COALESCE(SUM(f.faturamento_bruto), 0), COALESCE(SUM(f.reembolsos_count), 0)
    INTO _bruto_legacy, _reembolsos_legacy
    FROM public.faturamentos f
   WHERE f.user_id = _user_id
     AND f.data >= public.to_brt_date(_start_utc)
     AND f.data < public.to_brt_date(_end_utc);

  SELECT COALESCE(SUM(g.valor), 0)
    INTO _gastos_manuais
    FROM public.gastos_anuncios g
   WHERE g.user_id = _user_id
     AND g.data >= public.to_brt_date(_start_utc)
     AND g.data < public.to_brt_date(_end_utc);

  SELECT COALESCE(SUM(COALESCE(t.liquid_amount, t.amount)), 0)
    INTO _total_repasses
    FROM public.transactions t
   WHERE t.user_id = _user_id
     AND t.type = 'cashin'
     AND t.employee_visible = true
     AND t.created_at >= _start_utc
     AND t.created_at < _end_utc;

  SELECT COUNT(DISTINCT public.to_brt_month(t.created_at))
    INTO _meses_vendas
    FROM public.transactions t
   WHERE t.user_id = _user_id
     AND t.type = 'cashin'
     AND t.created_at >= _start_utc
     AND t.created_at < _end_utc;

  RETURN QUERY
  SELECT
    (_bruto_webhooks + _bruto_legacy - _bruto_refunds)::numeric AS total_bruto,
    (_liquido_webhooks + _bruto_legacy)::numeric AS total_liquido,
    ((_bruto_webhooks + _bruto_legacy - _bruto_refunds) - (_liquido_webhooks + _bruto_legacy))::numeric AS taxa_gateway,
    (_qtd_vendas * _taxa_bot_por_venda)::numeric AS taxa_bot,
    (((_bruto_webhooks + _bruto_legacy - _bruto_refunds) - (_liquido_webhooks + _bruto_legacy)) + (_qtd_vendas * _taxa_bot_por_venda))::numeric AS total_taxas,
    (_meses_vendas * _imposto_mensal)::numeric AS total_imposto,
    (_gastos_manuais + _total_repasses)::numeric AS total_anuncios,
    (_qtd_refunds + _reembolsos_legacy)::numeric AS total_reembolsos,
    _qtd_vendas AS qtd_vendas,
    _qtd_refunds AS qtd_reembolsos,
    ((_liquido_webhooks + _bruto_legacy - _bruto_refunds) - (_qtd_vendas * _taxa_bot_por_venda) - (_meses_vendas * _imposto_mensal) - (_gastos_manuais + _total_repasses))::numeric AS lucro_total,
    CASE WHEN (_gastos_manuais + _total_repasses) > 0
      THEN ((_liquido_webhooks + _bruto_legacy - _bruto_refunds) - (_qtd_vendas * _taxa_bot_por_venda) - (_meses_vendas * _imposto_mensal) - (_gastos_manuais + _total_repasses)) / (_gastos_manuais + _total_repasses)
      ELSE 0
    END::numeric AS roi,
    CASE WHEN (_bruto_webhooks + _bruto_legacy - _bruto_refunds) > 0
      THEN ((((_bruto_webhooks + _bruto_legacy - _bruto_refunds) - (_liquido_webhooks + _bruto_legacy)) + (_qtd_vendas * _taxa_bot_por_venda)) / (_bruto_webhooks + _bruto_legacy - _bruto_refunds)) * 100
      ELSE 0
    END::numeric AS taxa_media_pct;
END;
$$;

-- Painel do cliente: retorna KPIs financeiros de um cliente específico
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
    COUNT(*) FILTER (WHERE t.type = 'cashin'),
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
     AND t.type = 'cashin'
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
     AND t.type = 'cashin'
     AND (_client_id IS NULL OR t.employee_client_id = _client_id);

  RETURN QUERY
  SELECT
    _liquido::numeric AS faturamento_liquido,
    GREATEST(_liquido, 0)::numeric AS lucro,
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

-- Saldo disponível: lucro acumulado menos saques já pagos
CREATE OR REPLACE FUNCTION public.get_available_balance(
  _user_id uuid,
  _client_id uuid DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _lucro numeric;
  _saques_pagos numeric;
BEGIN
  SELECT COALESCE(SUM(COALESCE(t.liquid_amount, t.amount)), 0)
    INTO _lucro
    FROM public.transactions t
   WHERE t.user_id = _user_id
     AND t.type = 'cashin'
     AND t.employee_visible = true
     AND (_client_id IS NULL OR t.employee_client_id = _client_id);

  SELECT COALESCE(SUM(amount), 0)
    INTO _saques_pagos
    FROM public.withdrawal_requests w
   WHERE w.user_id = _user_id
     AND w.status = 'approved'
     AND (_client_id IS NULL OR w.employee_client_id = _client_id);

  RETURN GREATEST(_lucro - _saques_pagos, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_client_panel_metrics(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_available_balance(uuid, uuid) TO authenticated, service_role;
