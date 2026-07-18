
REVOKE ALL ON FUNCTION public.can_process_sale(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_sale_usage(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_process_sale(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_sale_usage(UUID) TO service_role;
