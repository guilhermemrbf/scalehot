import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getDashboardMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { periodo?: string }) =>
    z.object({ periodo: z.enum(["hoje", "mes", "total"]).default("mes") }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("get_dashboard_metrics", {
      _user_id: context.userId,
      _periodo: data.periodo,
    });
    if (error) throw new Error(error.message);
    const row = (rows as any[])?.[0];
    if (!row) throw new Error("Nenhum dado retornado do cálculo financeiro.");
    return row as {
      total_bruto: number;
      total_liquido: number;
      taxa_gateway: number;
      taxa_bot: number;
      total_taxas: number;
      total_imposto: number;
      total_anuncios: number;
      total_repasses_aprovados: number;
      total_reembolsos: number;
      qtd_vendas: number;
      qtd_reembolsos: number;
      lucro_total: number;
      roi: number;
      taxa_media_pct: number;
    };
  });

export const getClientPanelMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { clientId?: string | null }) =>
    z.object({ clientId: z.string().uuid().nullish() }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("get_client_panel_metrics", {
      _owner_id: context.userId,
      _client_id: data.clientId ?? undefined,
    });
    if (error) throw new Error(error.message);
    const row = (rows as any[])?.[0];
    if (!row) throw new Error("Nenhum dado retornado do painel do cliente.");
    return row as {
      faturamento_liquido: number;
      lucro: number;
      total_taxas: number;
      total_imposto: number;
      total_reembolsos: number;
      qtd_vendas: number;
      qtd_pendentes: number;
      total_pendente: number;
      saques_pagos: number;
      saques_pendentes: number;
      saldo_disponivel: number;
      taxa_media_pct: number;
    };
  });

export const getAvailableBalance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { clientId?: string | null }) =>
    z.object({ clientId: z.string().uuid().nullish() }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { data: balance, error } = await context.supabase.rpc("get_available_balance", {
      _user_id: context.userId,
      _client_id: data.clientId ?? undefined,
    });
    if (error) throw new Error(error.message);
    return Number(balance ?? 0);
  });
