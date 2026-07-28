import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type PanelSession = { ownerId?: string };

function getSessionConfig() {
  const password = process.env.EMPLOYEE_PANEL_SESSION_SECRET;
  if (!password) throw new Error("EMPLOYEE_PANEL_SESSION_SECRET not configured");
  return {
    password,
    name: "scaleup-employee-panel",
    maxAge: 60 * 60 * 24 * 7,
    cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
  };
}

// ============ PUBLIC (senha compartilhada) ============

export const unlockEmployeePanel = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string }) => z.object({ password: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("employee_panels" as any)
      .select("user_id, password")
      .eq("password", data.password)
      .limit(1);
    if (error) throw new Error(error.message);
    const match = (rows ?? [])[0] as unknown as { user_id: string; password: string } | undefined;
    if (!match) return { ok: false as const };
    const session = await useSession<PanelSession>(getSessionConfig());
    await session.update({ ownerId: match.user_id });
    return { ok: true as const };
  });

export const lockEmployeePanel = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<PanelSession>(getSessionConfig());
  await session.clear();
  return { ok: true as const };
});

export const getEmployeePanelData = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<PanelSession>(getSessionConfig());
  const ownerId = session.data.ownerId;
  if (!ownerId) return { locked: true as const };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [{ data: txs, error: e1 }, { data: cfg, error: e2 }, { data: wds, error: e3 }] = await Promise.all([
    supabaseAdmin
      .from("transactions" as any)
      .select("id, type, amount, liquid_amount, client_name, gateway, created_at")
      .eq("user_id", ownerId)
      .eq("employee_visible", true)
      .order("created_at", { ascending: false })
      .limit(500),
    supabaseAdmin
      .from("configuracoes" as any)
      .select("imposto_fixo, taxa_bot_fixa")
      .eq("user_id", ownerId)
      .maybeSingle(),
    supabaseAdmin
      .from("withdrawal_requests" as any)
      .select("amount, status")
      .eq("user_id", ownerId)
      .in("status", ["pending", "approved"]),
  ]);
  if (e1) throw new Error(e1.message);
  if (e2) throw new Error(e2.message);
  if (e3) throw new Error(e3.message);


  const list = (txs ?? []) as unknown as Array<{
    id: string; type: string; amount: number; liquid_amount: number | null;
    client_name: string | null; gateway: string; created_at: string;
  }>;
  const imposto = Number((cfg as any)?.imposto_fixo ?? 0);
  const taxaBotPorVenda = Number((cfg as any)?.taxa_bot_fixa ?? 0);

  const cashins = list.filter((t) => t.type === "cashin");
  const refunds = list.filter((t) => t.type === "refund");

  const bruto = cashins.reduce((s, t) => s + Number(t.amount || 0), 0);
  const liquidoGateway = cashins.reduce((s, t) => s + Number(t.liquid_amount ?? t.amount ?? 0), 0);
  const taxaGateway = bruto - liquidoGateway;
  const qtd = cashins.length;
  const taxaBot = qtd * taxaBotPorVenda;
  const totalTaxas = taxaGateway + taxaBot;

  const meses = new Set<string>();
  cashins.forEach((t) => {
    if (!t.created_at) return;
    const sp = new Date(new Date(t.created_at).getTime() - 3 * 60 * 60 * 1000);
    meses.add(`${sp.getUTCFullYear()}-${String(sp.getUTCMonth() + 1).padStart(2, "0")}`);
  });
  const totalImposto = meses.size * imposto;

  const faturamentoLiquido = liquidoGateway;
  // No painel do cliente, lucro nunca é negativo — reflete apenas o valor recebido líquido do gateway.
  const lucro = Math.max(0, faturamentoLiquido);
  const roi = 0; // gastos com anúncios não expostos no painel

  const saques = (wds ?? []) as unknown as Array<{ amount: number; status: string }>;
  const saquesPagos = saques
    .filter((w) => w.status === "approved")
    .reduce((s, w) => s + Number(w.amount || 0), 0);
  const saquesPendentes = saques
    .filter((w) => w.status === "pending")
    .reduce((s, w) => s + Number(w.amount || 0), 0);
  const saldoDisponivel = Math.max(0, lucro - saquesPagos - saquesPendentes);

  return {
    locked: false as const,
    kpis: {
      faturamentoLiquido,
      lucro,
      roi,
      totalTaxas,
      totalImposto,
      totalReembolsos: refunds.length,
      qtdVendas: qtd,
      taxaMediaPct: bruto > 0 ? (totalTaxas / bruto) * 100 : 0,
      saldoDisponivel,
      saquesPagos,
      saquesPendentes,
    },

    recentes: list.slice(0, 20),
  };
});

// ============ ADMIN (dono, autenticado) ============

export const getEmployeePanelPassword = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("employee_panels" as any)
      .select("password, updated_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as { password: string; updated_at: string } | null) ?? null;
  });

export const setEmployeePanelPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { password: string }) => z.object({ password: z.string().min(4).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("employee_panels" as any)
      .upsert(
        { user_id: context.userId, password: data.password, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const listAdminTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("transactions" as any)
      .select("id, type, amount, liquid_amount, client_name, gateway, created_at, employee_visible")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Array<{
      id: string; type: string; amount: number; liquid_amount: number | null;
      client_name: string | null; gateway: string; created_at: string; employee_visible: boolean;
    }>;
  });

export const setTransactionVisibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; visible: boolean }) =>
    z.object({ id: z.string().uuid(), visible: z.boolean() }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("transactions" as any)
      .update({ employee_visible: data.visible })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const bulkSetVisibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { visible: boolean }) => z.object({ visible: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("transactions" as any)
      .update({ employee_visible: data.visible })
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
