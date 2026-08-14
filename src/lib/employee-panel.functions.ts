import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type PanelSession = { ownerId?: string; clientId?: string; clientName?: string };

function getSessionConfig() {
  const password = process.env.EMPLOYEE_PANEL_SESSION_SECRET;
  if (!password) throw new Error("EMPLOYEE_PANEL_SESSION_SECRET not configured");
  return {
    password,
    name: "scaleup-employee-panel",
    maxAge: 60 * 60 * 24 * 7,
    cookie: { httpOnly: true, secure: true, sameSite: "none" as const, path: "/", domain: process.env.VITE_DEV_SERVER_DOMAIN || undefined },
  };
}

type ClientRow = { id: string; user_id: string; name: string; slug: string; password: string; active: boolean };

// ============ PUBLIC (senha compartilhada por cliente) ============

export const unlockEmployeePanel = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; slug?: string | null }) =>
    z
      .object({
        password: z.string().min(1).max(200),
        slug: z.string().trim().max(120).nullish(),
      })
      .parse(d)
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let q = supabaseAdmin
      .from("employee_clients" as any)
      .select("id, user_id, name, slug, password, active")
      .eq("password", data.password)
      .eq("active", true);
    if (data.slug) q = q.eq("slug", data.slug);

    const { data: rows, error } = await q.limit(1);
    if (error) throw new Error(error.message);
    const client = (rows ?? [])[0] as unknown as ClientRow | undefined;

    if (client) {
      const session = await useSession<PanelSession>(getSessionConfig());
      await session.update({ ownerId: client.user_id, clientId: client.id, clientName: client.name });
      return { ok: true as const, slug: client.slug, clientName: client.name };
    }

    // Fallback legado: senha única do painel (sem cliente específico)
    if (!data.slug) {
      const { data: legacy, error: e2 } = await supabaseAdmin
        .from("employee_panels" as any)
        .select("user_id")
        .eq("password", data.password)
        .limit(1);
      if (e2) throw new Error(e2.message);
      const match = (legacy ?? [])[0] as unknown as { user_id: string } | undefined;
      if (match) {
        const session = await useSession<PanelSession>(getSessionConfig());
        await session.update({ ownerId: match.user_id, clientId: undefined, clientName: undefined });
        return { ok: true as const, slug: null, clientName: null };
      }
    }

    return { ok: false as const };
  });

export const lockEmployeePanel = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<PanelSession>(getSessionConfig());
  await session.clear();
  return { ok: true as const };
});

export const getEmployeePanelData = createServerFn({ method: "POST" })
  .inputValidator((d: { slug?: string | null } | undefined) =>
    z.object({ slug: z.string().trim().max(120).nullish() }).parse(d ?? {})
  )
  .handler(async ({ data }) => {
    const session = await useSession<PanelSession>(getSessionConfig());
    const ownerId = session.data.ownerId;
    const clientId = session.data.clientId;
    if (!ownerId) return { locked: true as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Se a URL pede um slug específico, a sessão precisa corresponder a esse cliente.
    if (data.slug) {
      const { data: c, error: ce } = await supabaseAdmin
        .from("employee_clients" as any)
        .select("id")
        .eq("slug", data.slug)
        .maybeSingle();
      if (ce) throw new Error(ce.message);
      const wanted = (c as unknown as { id: string } | null)?.id;
      if (!wanted || wanted !== clientId) return { locked: true as const };
    }

    let liveClientName: string | null = null;
    if (clientId) {
      const { data: cn } = await supabaseAdmin
        .from("employee_clients" as any)
        .select("name")
        .eq("id", clientId)
        .maybeSingle();
      liveClientName = (cn as unknown as { name: string } | null)?.name ?? null;
    }

    let txQ = supabaseAdmin
      .from("transactions" as any)
      .select("id, type, amount, liquid_amount, client_name, gateway, created_at, employee_visible, employee_client_id")
      .eq("user_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(500);
    if (clientId) txQ = txQ.eq("employee_client_id", clientId);

    const [{ data: txs, error: e1 }, { data: metricsRows, error: e2 }] = await Promise.all([
      txQ,
      supabaseAdmin.rpc("get_client_panel_metrics", { _owner_id: ownerId, _client_id: clientId ?? undefined }),
    ]);
    if (e1) throw new Error(e1.message);
    if (e2) throw new Error(e2.message);

    const all = (txs ?? []) as unknown as Array<{
      id: string; type: string; amount: number; liquid_amount: number | null;
      client_name: string | null; gateway: string; created_at: string; employee_visible: boolean;
    }>;
    const list = all.filter((t) => t.employee_visible);
    const m = (metricsRows as any[])?.[0] ?? {
      faturamento_liquido: 0,
      lucro: 0,
      total_taxas: 0,
      total_imposto: 0,
      total_reembolsos: 0,
      qtd_vendas: 0,
      qtd_pendentes: 0,
      total_pendente: 0,
      saques_pagos: 0,
      saques_pendentes: 0,
      saldo_disponivel: 0,
      taxa_media_pct: 0,
    };

    const faturamentoLiquido = Number(m.faturamento_liquido);
    const lucro = Number(m.lucro);
    const totalTaxas = Number(m.total_taxas);
    const totalImposto = Number(m.total_imposto);
    const totalReembolsos = Number(m.total_reembolsos);
    const qtd = Number(m.qtd_vendas);
    const qtdPendentes = Number(m.qtd_pendentes);
    const totalPendente = Number(m.total_pendente);
    const saquesPagos = Number(m.saques_pagos);
    const saquesPendentes = Number(m.saques_pendentes);
    const saldoDisponivel = Number(m.saldo_disponivel);
    const taxaMediaPct = Number(m.taxa_media_pct);
    const roi = 0; // gastos com anúncios não expostos no painel

    return {
      locked: false as const,
      clientName: liveClientName ?? session.data.clientName ?? null,
      kpis: {
        faturamentoLiquido,
        lucro,
        roi,
        totalTaxas,
        totalImposto,
        totalReembolsos,
        qtdVendas: qtd,
        taxaMediaPct,
        saldoDisponivel,
        saquesPagos,
        saquesPendentes,
        qtdPendentes,
        totalPendente,
        totalTransacoes: all.length,
      },
      recentes: list.slice(0, 20),
      transacoes: all.slice(0, 100).map((t) => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount || 0),
        liquid_amount: t.liquid_amount == null ? null : Number(t.liquid_amount),
        client_name: t.client_name,
        gateway: t.gateway,
        created_at: t.created_at,
        approved: !!t.employee_visible,
      })),
    };
  });

// ============ ADMIN (dono, autenticado) ============

function slugify(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export type EmployeeClient = {
  id: string;
  name: string;
  slug: string;
  password: string;
  active: boolean;
  created_at: string;
};

export const listEmployeeClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("employee_clients" as any)
      .select("id, name, slug, password, active, created_at")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as EmployeeClient[];
  });

export const createEmployeeClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string; password: string }) =>
    z.object({ name: z.string().trim().min(1).max(120), password: z.string().min(4).max(200) }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const base = slugify(data.name) || "cliente";
    const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const { data: row, error } = await context.supabase
      .from("employee_clients" as any)
      .insert({ user_id: context.userId, name: data.name, slug, password: data.password, active: true })
      .select("id, name, slug, password, active, created_at")
      .single();
    if (error) throw new Error(error.message);
    return row as unknown as EmployeeClient;
  });

export const updateEmployeeClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; name?: string; password?: string; active?: boolean }) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().trim().min(1).max(120).optional(),
        password: z.string().min(4).max(200).optional(),
        active: z.boolean().optional(),
      })
      .parse(d)
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.name !== undefined) patch.name = data.name;
    if (data.password !== undefined) patch.password = data.password;
    if (data.active !== undefined) patch.active = data.active;
    const { error } = await context.supabase
      .from("employee_clients" as any)
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteEmployeeClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("employee_clients" as any)
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const listAdminTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("transactions" as any)
      .select("id, type, amount, liquid_amount, client_name, gateway, created_at, employee_visible, employee_client_id")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Array<{
      id: string; type: string; amount: number; liquid_amount: number | null;
      client_name: string | null; gateway: string; created_at: string;
      employee_visible: boolean; employee_client_id: string | null;
    }>;
  });

export const setTransactionVisibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; visible: boolean; clientId?: string | null }) =>
    z
      .object({
        id: z.string().uuid(),
        visible: z.boolean(),
        clientId: z.string().uuid().nullish(),
      })
      .parse(d)
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = { employee_visible: data.visible };
    if (data.visible) {
      if (!data.clientId) throw new Error("Selecione o cliente antes de aprovar a venda.");
      patch.employee_client_id = data.clientId;
    } else {
      patch.employee_client_id = null;
    }
    const { error } = await context.supabase
      .from("transactions" as any)
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const bulkSetVisibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { visible: boolean; clientId?: string | null }) =>
    z.object({ visible: z.boolean(), clientId: z.string().uuid().nullish() }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = { employee_visible: data.visible };
    if (data.visible) {
      if (!data.clientId) throw new Error("Selecione o cliente antes de aprovar as vendas.");
      patch.employee_client_id = data.clientId;
    } else {
      patch.employee_client_id = null;
    }
    let q = context.supabase.from("transactions" as any).update(patch).eq("user_id", context.userId);
    if (!data.visible && data.clientId) q = q.eq("employee_client_id", data.clientId);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
