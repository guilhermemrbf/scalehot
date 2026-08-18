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
  const nested = p.data && typeof p.data === "object" && !Array.isArray(p.data) ? (p.data as AnyObj) : null;
  const source = nested ?? p;
  const status = String(source.status ?? p.status ?? p.order_status ?? p.event ?? p.transaction_status ?? source.transaction_status ?? "").trim();
  const upper = status.toUpperCase();

  const looksLikeSyncpay = Boolean(
    p.externalreference ||
      source.externalreference ||
      p.idtransaction ||
      source.idtransaction ||
      source.pix_code ||
      source.end_to_end ||
      source.final_amount != null ||
      source.payment_method === "PIX" ||
      source.client ||
      source.debtor_account ||
      source.adquirente_ref
  );

  // ===== SAQUE / CASH-OUT: nunca é venda =====
  // Payloads de saque (Syncpay e afins) vêm com seller/beneficiary/pix_key/pix_type,
  // ou com tipo/transaction_type explícito de cash-out, e NÃO possuem "client".
  const typeHint = String(
    source.transaction_type ?? source.type ?? p.transaction_type ?? p.type ?? source.operation ?? ""
  ).toLowerCase();
  const isCashOutHint = /cash[_\-\s]?out|withdraw|saque|payout|transfer/.test(typeHint);
  const hasPayoutShape = Boolean(
    source.seller ||
      p.seller ||
      source.beneficiary_name ||
      source.beneficiary ||
      source.pix_key ||
      p.pix_key ||
      source.pix_type ||
      p.pix_type
  );
  if (isCashOutHint || (hasPayoutShape && !source.client && !p.client)) {
    return {
      gateway: "syncpay",
      type: "cashin",
      status: upper || "CASHOUT",
      amount: num(source.amount) ?? num(p.amount) ?? 0,
      liquid_amount: null,
      transaction_id: null,
      client_name: null,
      client_email: null,
      accepted: false,
    };
  }

  // Syncpay refund / MED
  if (looksLikeSyncpay && (upper === "MED" || upper === "REFUNDED" || upper === "REFUND" || upper === "CHARGEBACK" || upper === "DEVOLVIDO" || upper === "REEMBOLSADO")) {
    return {
      gateway: "syncpay",
      type: "refund",
      status: upper,
      amount: num(source.amount) ?? num(p.amount) ?? 0,
      liquid_amount: num(source.deposito_liquido) ?? num(source.liquid_amount) ?? num(source.final_amount),
      transaction_id: source.idtransaction ?? source.id ?? p.idtransaction ?? p.id ?? source.externalreference ?? null,
      client_name: source.client_name ?? source.client?.name ?? p.client_name ?? null,
      client_email: source.client_email ?? source.client?.email ?? p.client_email ?? null,
      accepted: true,
    };
  }

  // Syncpay CashIn — pode vir no topo ou dentro de data, com status PAID_OUT/PAID/COMPLETED/completed.
  if (looksLikeSyncpay && ["PAID_OUT", "PAID", "COMPLETED", "APPROVED", "RECEIVED", "SUCCESS", "CONFIRMED"].includes(upper)) {
    const txId =
      source.idtransaction ??
      source.transaction_id ??
      source.transactionId ??
      source.id ??
      p.idtransaction ??
      p.id ??
      source.externalreference ??
      p.externalreference ??
      source.end_to_end ??
      null;
    return {
      gateway: "syncpay",
      type: "cashin",
      status: upper,
      amount: num(source.amount) ?? num(p.amount) ?? 0,
      liquid_amount:
        num(source.deposito_liquido) ??
        num(source.liquid_amount) ??
        num(source.final_amount) ??
        num(source.net_amount) ??
        num(source.amount) ??
        num(p.amount),
      transaction_id: txId != null ? String(txId) : null,
      client_name: source.client_name ?? source.client?.name ?? p.client_name ?? null,
      client_email: source.client_email ?? source.client?.email ?? p.client_email ?? null,
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
        console.log("WEBHOOK VERSION 2026-06-08-A");
        const url = new URL(request.url);
        const userId = url.searchParams.get("user_id");
        console.log("[webhook-receiver] incoming. supabase user_id:", userId);
        if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) {
          console.warn("[webhook-receiver] missing/invalid user_id");
          return json({ error: "Missing or invalid user_id" }, 400);
        }

        let payload: AnyObj;
        try {
          payload = await request.json();
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }
        console.log("[webhook-receiver] payload:", JSON.stringify(payload));

        const parsed = detect(payload);
        console.log("[webhook-receiver] parsed:", JSON.stringify(parsed));
        if (!parsed) {
          console.warn("[webhook-receiver] stop=unrecognized_payload keys:", Object.keys(payload));
          return json({ status: "success", note: "Unrecognized payload" }, 200);
        }
        if (!parsed.accepted) {
          console.log("[webhook-receiver] stop=non_final_status", parsed.status);
          return json({ status: "ignored", reason: `status=${parsed.status}` }, 200);
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

        // SaaS gate: founder passa direto; outros precisam de assinatura ativa com saldo.
        // Só aplica em vendas aprovadas (cashin accepted). Refunds e status intermediários passam sem consumir.
        if (parsed.type === "cashin" && parsed.accepted) {
          const { data: canProcess, error: gateErr } = await supabaseAdmin.rpc("can_process_sale", {
            _user_id: userId,
          });
          if (gateErr) {
            console.error("[webhook-receiver] can_process_sale rpc error:", gateErr);
          }
          if (canProcess === false) {
            console.warn("[webhook-receiver] stop=plan_limit user_id:", userId);
            return json(
              { status: "ignored", reason: "plan_limit_or_no_subscription" },
              200
            );
          }
        }



        if (row.transaction_id) {
          console.log("[webhook-receiver] db=upsert row:", JSON.stringify(row));
          const { error } = await supabaseAdmin
            .from("transactions")
            .upsert(row, { onConflict: "user_id,gateway,transaction_id" });
          if (error) {
            console.error("[webhook-receiver] upsert error:", error);
            return json({ status: "success", warn: error.message }, 200);
          }
          console.log("[webhook-receiver] db=upsert ok transaction_id:", row.transaction_id);
        } else {
          console.log("[webhook-receiver] db=insert row:", JSON.stringify(row));
          const { error } = await supabaseAdmin.from("transactions").insert(row);
          if (error) {
            console.error("[webhook-receiver] insert error:", error);
            return json({ status: "success", warn: error.message }, 200);
          }
          console.log("[webhook-receiver] db=insert ok");
        }

        // Incrementa uso do plano após venda aprovada. No-op para fundadores.
        if (parsed.type === "cashin" && parsed.accepted) {
          const { error: incErr } = await supabaseAdmin.rpc("increment_sale_usage", {
            _user_id: userId,
          });
          if (incErr) console.error("[webhook-receiver] increment_sale_usage error:", incErr);
        }

        // Notificações Push para Vendas e Reembolsos
        if (parsed.type === "cashin" || parsed.type === "refund") {

          try {
            const { sendPushToUser } = await import("@/lib/push.server");
            const valor = (parsed.type === "refund" ? "- " : "") + parsed.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

            // Buscar preferências (profiles.notification_preferences)
            const { data: subRow } = await supabaseAdmin
              .from("profiles")
              .select("notification_preferences")
              .eq("id", userId)
              .maybeSingle();
            const prefs = (((subRow as any)?.notification_preferences as any) ?? {
              per_sale: true,
              milestones: true,
            }) as { per_sale?: boolean; milestones?: boolean };
            console.log("[webhook-receiver] prefs:", JSON.stringify(prefs));

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
                console.log("[webhook-receiver] push=milestone-first-sale requested");
                milestoneSent = true;
              }
              // Meta mensal cruzou R$ 1.650
              else if (prevMonthLiquid < 1650 && monthLiquid >= 1650) {
                await sendPushToUser(userId, {
                  title: "🏆 META BATIDA!",
                  body: `Você atingiu R$ 1.650 de lucro esse mês!\nScaleUp te viu crescer 💎`,
                  tag: `milestone-month-${y}${m}`,
                });
                console.log("[webhook-receiver] push=milestone-month requested");
                milestoneSent = true;
              }
              // 10ª venda do dia
              else if (dayCount === 10) {
                await sendPushToUser(userId, {
                  title: "⚡ 10 VENDAS HOJE!",
                  body: `Sua operação está em chamas 🔥\nFaturamento do dia: ${dayTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
                  tag: `milestone-10-${y}${m}${d}`,
                });
                console.log("[webhook-receiver] push=milestone-10 requested");
                milestoneSent = true;
              }
              // Cruzou R$ 1.000 no dia
              else if (dayTotal >= 1000 && dayTotal - Number(parsed.amount || 0) < 1000) {
                await sendPushToUser(userId, {
                  title: "💰 R$ 1.000 em um único dia!",
                  body: `Você cruzou a barreira dos 4 dígitos\nIsso merece comemoração 🚀`,
                  tag: `milestone-1k-${y}${m}${d}`,
                });
                console.log("[webhook-receiver] push=milestone-1k requested");
                milestoneSent = true;
              }
            }

            // Notificação padrão "Venda Aprovada"
            if (!milestoneSent && prefs.per_sale !== false) {
              const isRefund = parsed.type === "refund";
              const pushResult = await sendPushToUser(userId, {
                title: isRefund ? "🔄 Reembolso Efetuado" : "💰 Venda Aprovada!",
                body: valor,
                tag: parsed.transaction_id ?? undefined,
              });
              console.log(`[webhook-receiver] push=${parsed.type} result:`, JSON.stringify(pushResult));
            } else if (!milestoneSent) {
              console.log("[webhook-receiver] push skipped: per_sale disabled");
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
