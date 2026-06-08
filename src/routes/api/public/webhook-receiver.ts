import { createFileRoute } from "@tanstack/react-router";

type AnyObj = Record<string, any>;

const num = (v: any): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

type Parsed = {
  gateway: string;
  type: "cashin" | "refund";
  status: string;
  amount: number;
  liquid_amount: number | null;
  transaction_id: string | null;
  client_name: string | null;
  client_email: string | null;
  accepted: boolean;
};

function detect(p: AnyObj): Parsed | null {
  const status = String(p.status ?? p.order_status ?? p.event ?? "").trim();
  const upper = status.toUpperCase();

  // Syncpay refund
  if (upper === "MED") {
    return {
      gateway: "syncpay",
      type: "refund",
      status: "MED",
      amount: num(p.amount) ?? 0,
      liquid_amount: num(p.deposito_liquido) ?? num(p.liquid_amount),
      transaction_id: p.idtransaction ?? p.id ?? null,
      client_name: p.client_name ?? null,
      client_email: p.client_email ?? null,
      accepted: true,
    };
  }

  // Syncpay CashIn
  if ((p.client_name || p.paymentcode) && (upper === "PAID_OUT" || upper === "PAID")) {
    return {
      gateway: "syncpay",
      type: "cashin",
      status: upper,
      amount: num(p.amount) ?? 0,
      liquid_amount: num(p.deposito_liquido) ?? num(p.liquid_amount),
      transaction_id: p.idtransaction ?? p.id ?? null,
      client_name: p.client_name ?? null,
      client_email: p.client_email ?? null,
      accepted: true,
    };
  }

  // Wiinpay
  const evt = String(p.event ?? "").toLowerCase();
  if (evt === "payment.approved") {
    const data = p.data ?? p;
    return {
      gateway: "wiinpay",
      type: "cashin",
      status: "APPROVED",
      amount: num(data.amount) ?? num(p.amount) ?? 0,
      liquid_amount: num(data.net_amount) ?? num(p.net_amount),
      transaction_id: data.id ?? p.id ?? null,
      client_name: data.customer?.name ?? p.customer?.name ?? null,
      client_email: data.customer?.email ?? p.customer?.email ?? null,
      accepted: true,
    };
  }
  if (evt === "payment.refunded" || evt === "payment.chargeback") {
    const data = p.data ?? p;
    return {
      gateway: "wiinpay",
      type: "refund",
      status: evt.toUpperCase(),
      amount: num(data.amount) ?? num(p.amount) ?? 0,
      liquid_amount: null,
      transaction_id: data.id ?? p.id ?? null,
      client_name: data.customer?.name ?? null,
      client_email: data.customer?.email ?? null,
      accepted: true,
    };
  }

  // Hotmart
  if (status === "PURCHASE_APPROVED" || p.event === "PURCHASE_APPROVED") {
    const data = p.data ?? {};
    return {
      gateway: "hotmart",
      type: "cashin",
      status: "PURCHASE_APPROVED",
      amount: num(data.purchase?.price?.value) ?? num(p.amount) ?? 0,
      liquid_amount: num(data.purchase?.commission?.value) ?? null,
      transaction_id: data.purchase?.transaction ?? p.id ?? null,
      client_name: data.buyer?.name ?? null,
      client_email: data.buyer?.email ?? null,
      accepted: true,
    };
  }
  if (status === "PURCHASE_REFUNDED" || status === "PURCHASE_CHARGEBACK") {
    const data = p.data ?? {};
    return {
      gateway: "hotmart",
      type: "refund",
      status,
      amount: num(data.purchase?.price?.value) ?? 0,
      liquid_amount: null,
      transaction_id: data.purchase?.transaction ?? p.id ?? null,
      client_name: data.buyer?.name ?? null,
      client_email: data.buyer?.email ?? null,
      accepted: true,
    };
  }

  // Kiwify
  if (String(p.order_status ?? "").toLowerCase() === "paid") {
    return {
      gateway: "kiwify",
      type: "cashin",
      status: "PAID",
      amount: num(p.Commissions?.charge_amount) ?? num(p.total_price) ?? num(p.amount) ?? 0,
      liquid_amount: num(p.Commissions?.my_commission) ?? num(p.net_amount),
      transaction_id: p.order_id ?? p.id ?? null,
      client_name: p.Customer?.full_name ?? p.customer?.name ?? null,
      client_email: p.Customer?.email ?? p.customer?.email ?? null,
      accepted: true,
    };
  }
  if (String(p.order_status ?? "").toLowerCase() === "refunded") {
    return {
      gateway: "kiwify",
      type: "refund",
      status: "REFUNDED",
      amount: num(p.total_price) ?? 0,
      liquid_amount: null,
      transaction_id: p.order_id ?? p.id ?? null,
      client_name: p.Customer?.full_name ?? null,
      client_email: p.Customer?.email ?? null,
      accepted: true,
    };
  }

  // Monetizze
  const venda = p.venda ?? p;
  const statusMonet = String(venda.status ?? "").toLowerCase();
  if (statusMonet === "finalizada" || statusMonet === "aprovada") {
    return {
      gateway: "monetizze",
      type: "cashin",
      status: "APPROVED",
      amount: num(venda.valor) ?? num(p.amount) ?? 0,
      liquid_amount: num(venda.valor_comissao) ?? null,
      transaction_id: venda.codigo ?? p.id ?? null,
      client_name: p.comprador?.nome ?? null,
      client_email: p.comprador?.email ?? null,
      accepted: true,
    };
  }

  // Pepper / generic custom: look for common keys
  if (num(p.amount) != null && (p.event === "approved" || p.status === "approved" || p.paid === true)) {
    return {
      gateway: "pepper",
      type: "cashin",
      status: "APPROVED",
      amount: num(p.amount) ?? 0,
      liquid_amount: num(p.net_amount) ?? num(p.liquid_amount),
      transaction_id: p.id ?? p.transaction_id ?? null,
      client_name: p.customer?.name ?? p.client_name ?? null,
      client_email: p.customer?.email ?? p.client_email ?? null,
      accepted: true,
    };
  }

  // Custom fallback — if it has amount and looks like a paid event
  if (num(p.amount) != null && p.transaction_id) {
    return {
      gateway: "custom",
      type: "cashin",
      status: upper || "RECEIVED",
      amount: num(p.amount) ?? 0,
      liquid_amount: num(p.liquid_amount),
      transaction_id: p.transaction_id ?? null,
      client_name: p.client_name ?? null,
      client_email: p.client_email ?? null,
      accepted: true,
    };
  }

  return null;
}

export const Route = createFileRoute("/api/public/webhook-receiver")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const userId = url.searchParams.get("user_id");
        if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) {
          return json({ error: "Missing or invalid user_id" }, 400);
        }

        let payload: AnyObj;
        try {
          payload = await request.json();
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }

        const parsed = detect(payload);
        if (!parsed) {
          // Acknowledge so gateways don't retry forever
          return json({ status: "success", note: "Unrecognized payload" }, 200);
        }

        const row = {
          user_id: userId,
          gateway: parsed.gateway,
          transaction_id: parsed.transaction_id,
          type: parsed.type,
          status: parsed.status,
          amount: parsed.amount,
          liquid_amount: parsed.liquid_amount,
          client_name: parsed.client_name,
          client_email: parsed.client_email,
          raw_payload: payload,
        };

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (row.transaction_id) {
          const { error } = await supabaseAdmin
            .from("transactions")
            .upsert(row, { onConflict: "user_id,gateway,transaction_id" });
          if (error) {
            console.error("[webhook-receiver] upsert error:", error);
            return json({ status: "success", warn: error.message }, 200);
          }
        } else {
          const { error } = await supabaseAdmin.from("transactions").insert(row);
          if (error) {
            console.error("[webhook-receiver] insert error:", error);
            return json({ status: "success", warn: error.message }, 200);
          }
        }

        if (parsed.type === "cashin") {
          try {
            const { sendPushToUser } = await import("@/lib/push.server");
            const valor = parsed.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

            // Buscar preferências
            const { data: subRow } = await supabaseAdmin
              .from("push_subscriptions")
              .select("preferences")
              .eq("user_id", userId)
              .maybeSingle();
            const prefs = ((subRow?.preferences as any) ?? {
              per_sale: true,
              milestones: true,
            }) as { per_sale?: boolean; milestones?: boolean };

            // === Marcos especiais ===
            let milestoneSent = false;
            if (prefs.milestones !== false) {
              // Totais do usuário
              const { count: totalCount } = await supabaseAdmin
                .from("transactions")
                .select("*", { count: "exact", head: true })
                .eq("user_id", userId)
                .eq("type", "cashin");

              // Datas (Brasília)
              const now = new Date();
              const sp = new Date(now.getTime() - 3 * 60 * 60 * 1000);
              const y = sp.getUTCFullYear();
              const m = String(sp.getUTCMonth() + 1).padStart(2, "0");
              const d = String(sp.getUTCDate()).padStart(2, "0");
              const dayStart = new Date(`${y}-${m}-${d}T00:00:00-03:00`).toISOString();
              const monthStart = new Date(`${y}-${m}-01T00:00:00-03:00`).toISOString();

              const { data: dayTx } = await supabaseAdmin
                .from("transactions")
                .select("amount, liquid_amount")
                .eq("user_id", userId)
                .eq("type", "cashin")
                .gte("created_at", dayStart);

              const dayTotal = (dayTx ?? []).reduce((s, t) => s + Number(t.amount || 0), 0);
              const dayCount = (dayTx ?? []).length;

              const { data: monthTx } = await supabaseAdmin
                .from("transactions")
                .select("liquid_amount, amount")
                .eq("user_id", userId)
                .eq("type", "cashin")
                .gte("created_at", monthStart);
              const monthLiquid = (monthTx ?? []).reduce(
                (s, t) => s + Number(t.liquid_amount ?? t.amount ?? 0),
                0
              );
              const prevMonthLiquid = monthLiquid - Number(parsed.liquid_amount ?? parsed.amount ?? 0);

              // 1ª venda da vida
              if (totalCount === 1) {
                await sendPushToUser(userId, {
                  title: "🎉 SUA PRIMEIRA VENDA!",
                  body: `${valor} — Esse é só o começo!\nBem-vindo ao clube dos que fazem acontecer 🏆`,
                  tag: "milestone-first-sale",
                });
                milestoneSent = true;
              }
              // Meta mensal cruzou R$ 1.650
              else if (prevMonthLiquid < 1650 && monthLiquid >= 1650) {
                await sendPushToUser(userId, {
                  title: "🏆 META BATIDA!",
                  body: `Você atingiu R$ 1.650 de lucro esse mês!\nScaleUp te viu crescer 💎`,
                  tag: `milestone-month-${y}${m}`,
                });
                milestoneSent = true;
              }
              // 10ª venda do dia
              else if (dayCount === 10) {
                await sendPushToUser(userId, {
                  title: "⚡ 10 VENDAS HOJE!",
                  body: `Sua operação está em chamas 🔥\nFaturamento do dia: ${dayTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
                  tag: `milestone-10-${y}${m}${d}`,
                });
                milestoneSent = true;
              }
              // Cruzou R$ 1.000 no dia
              else if (dayTotal >= 1000 && dayTotal - Number(parsed.amount || 0) < 1000) {
                await sendPushToUser(userId, {
                  title: "💰 R$ 1.000 em um único dia!",
                  body: `Você cruzou a barreira dos 4 dígitos\nIsso merece comemoração 🚀`,
                  tag: `milestone-1k-${y}${m}${d}`,
                });
                milestoneSent = true;
              }
            }

            // Notificação padrão "Venda Aprovada"
            if (!milestoneSent && prefs.per_sale !== false) {
              await sendPushToUser(userId, {
                title: "💰 Venda Aprovada!",
                body: valor,
                tag: parsed.transaction_id ?? undefined,
              });
            }
          } catch (e) {
            console.error("[webhook-receiver] push failed:", e);
          }
        }

        return json({ status: "success" }, 200);

      },
    },
  },
});
