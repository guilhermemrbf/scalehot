-- Corrige warnings de segurança: SECURITY INVOKER + revoga acesso anônimo/público

ALTER FUNCTION public.to_brt_date(timestamptz) SECURITY INVOKER;
ALTER FUNCTION public.to_brt_month(timestamptz) SECURITY INVOKER;
ALTER FUNCTION public.period_start_utc(text, timestamptz) SECURITY INVOKER;
ALTER FUNCTION public.get_dashboard_metrics(uuid, text) SECURITY INVOKER;
ALTER FUNCTION public.get_client_panel_metrics(uuid, uuid) SECURITY INVOKER;
ALTER FUNCTION public.get_available_balance(uuid, uuid) SECURITY INVOKER;

REVOKE EXECUTE ON FUNCTION public.to_brt_date(timestamptz) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.to_brt_month(timestamptz) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.period_start_utc(text, timestamptz) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_dashboard_metrics(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_client_panel_metrics(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_available_balance(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_client_panel_metrics(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_available_balance(uuid, uuid) TO authenticated, service_role;
