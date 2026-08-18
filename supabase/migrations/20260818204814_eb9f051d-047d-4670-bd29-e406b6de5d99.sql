DROP FUNCTION IF EXISTS public.get_dashboard_metrics(uuid, text);

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
  total_repasses_aprovados numeric,
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

  -- Repasses aprovados: saques com status 'approved'
  SELECT COALESCE(SUM(w.amount), 0)
    INTO _total_repasses
    FROM public.withdrawal_requests w
   WHERE w.user_id = _user_id
     AND w.status = 'approved'
     AND w.created_at >= _start_utc
     AND w.created_at < _end_utc;

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
    _total_repasses::numeric AS total_repasses_aprovados,
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

GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics(uuid, text) TO authenticated, service_role;
