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

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ============ PÚBLICO (painel do cliente, sessão via senha compartilhada) ============

export const requestWithdrawal = createServerFn({ method: "POST" })
  .inputValidator((d: { amount: number; requesterName: string; pixKey: string; note?: string }) =>
    z
      .object({
        amount: z.number().positive().max(10_000_000),
        requesterName: z.string().trim().min(1).max(120),
        pixKey: z.string().trim().min(3).max(200),
        note: z.string().trim().max(500).optional(),
      })
      .parse(d)
  )
  .handler(async ({ data }) => {
    const session = await useSession<PanelSession>(getSessionConfig());
    const ownerId = session.data.ownerId;
    if (!ownerId) return { ok: false as const, reason: "locked" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("withdrawal_requests" as any)
      .insert({
        user_id: ownerId,
        amount: data.amount,
        requester_name: data.requesterName,
        pix_key: data.pixKey,
        note: data.note ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    // Notifica o dono
    try {
      const { sendPushToUser } = await import("./push.server");
      await sendPushToUser(ownerId, {
        title: "💸 Novo pedido de saque",
        body: `${data.requesterName} solicitou ${brl(data.amount)}`,
        tag: `withdrawal-${(row as any)?.id ?? Date.now()}`,
      });
    } catch (e) {
      // não falha o pedido se o push falhar
      console.error("[requestWithdrawal] push error", e);
    }

    return { ok: true as const };
  });

export const listMyWithdrawals = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<PanelSession>(getSessionConfig());
  const ownerId = session.data.ownerId;
  if (!ownerId) return { locked: true as const };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("withdrawal_requests" as any)
    .select("id, amount, requester_name, pix_key, note, status, owner_note, decided_at, created_at")
    .eq("user_id", ownerId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return {
    locked: false as const,
    items: (data ?? []) as unknown as Array<{
      id: string;
      amount: number;
      requester_name: string;
      pix_key: string;
      note: string | null;
      status: "pending" | "approved" | "rejected";
      owner_note: string | null;
      decided_at: string | null;
      created_at: string;
    }>,
  };
});

// ============ ADMIN (dono autenticado) ============

export const listWithdrawalRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("withdrawal_requests" as any)
      .select("id, amount, requester_name, pix_key, note, status, owner_note, decided_at, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Array<{
      id: string;
      amount: number;
      requester_name: string;
      pix_key: string;
      note: string | null;
      status: "pending" | "approved" | "rejected";
      owner_note: string | null;
      decided_at: string | null;
      created_at: string;
    }>;
  });

export const decideWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: "approved" | "rejected"; ownerNote?: string }) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["approved", "rejected"]),
        ownerNote: z.string().trim().max(500).optional(),
      })
      .parse(d)
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("withdrawal_requests" as any)
      .update({
        status: data.status,
        owner_note: data.ownerNote ?? null,
        decided_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
