import { createFileRoute } from "@tanstack/react-router";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function pickTemplate(stats: {
  total_vendas: number;
  faturamento_bruto: number;
  lucro_liquido: number;
  roi: number;
  meta_batida: boolean;
  meta_valor: number;
}) {
  const { total_vendas, faturamento_bruto, lucro_liquido, roi, meta_batida, meta_valor } = stats;

  if (meta_batida) {
    return {
      title: "🏆 Meta batida!",
      body: `${brl(meta_valor)} atingidos esse mês\nVocê está entre os top performers do ScaleUp 💎`,
    };
  }
  if (total_vendas === 1) {
    return {
      title: "💎 Primeira venda do dia!",
      body: `${brl(faturamento_bruto)}\nO dia começou bem. Não para! 🎯`,
    };
  }
  if (roi >= 3) {
    return {
      title: "📈 Suas campanhas bombando!",
      body: `${total_vendas} vendas hoje • ${brl(lucro_liquido)} líquido\nROAS ${roi.toFixed(1)}x — Escala agora! ⚡`,
    };
  }
  return {
    title: "🌙 Fechamento do dia",
    body: `Faturamento: ${brl(faturamento_bruto)} bruto\nLucro líquido: ${brl(lucro_liquido)} — ROI ${roi.toFixed(1)}x\nAmanhã vai ser ainda melhor 🚀`,
  };
}

export const Route = createFileRoute("/api/public/send-daily-summary")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sendPushToUser } = await import("@/lib/push.server");

        // Get all profiles with notification preferences
        const { data: profilesRaw, error: subsErr } = await supabaseAdmin
          .from("profiles")
          .select("id, notification_preferences");
        if (subsErr) return json({ error: subsErr.message }, 500);
        const subs = (profilesRaw ?? []).map((p: any) => ({
          user_id: p.id as string,
          preferences: p.notification_preferences ?? {},
        }));
        if (!subs.length) return json({ ok: true, sent: 0, note: "no users" });

        // Brazilian "today" — convert UTC now to São Paulo (UTC-3)
        const now = new Date();
        const sp = new Date(now.getTime() - 3 * 60 * 60 * 1000);
        const y = sp.getUTCFullYear();
        const m = String(sp.getUTCMonth() + 1).padStart(2, "0");
        const d = String(sp.getUTCDate()).padStart(2, "0");
        const dayStart = new Date(`${y}-${m}-${d}T00:00:00-03:00`).toISOString();
        const dayEnd = new Date(`${y}-${m}-${d}T23:59:59.999-03:00`).toISOString();
        const monthStart = new Date(`${y}-${m}-01T00:00:00-03:00`).toISOString();

        let sent = 0;
        const errors: any[] = [];

        for (const sub of subs) {
          try {
            const prefs = (sub.preferences as any) ?? {};
            if (prefs.daily_summary === false) continue;

            // Day transactions
            const { data: dayTx } = await supabaseAdmin
              .from("transactions")
              .select("amount, liquid_amount, type")
              .eq("user_id", sub.user_id)
              .eq("type", "cashin")
              .gte("created_at", dayStart)
              .lte("created_at", dayEnd);

            const txs = dayTx ?? [];
            if (txs.length === 0) continue; // só envia se teve venda

            const faturamento_bruto = txs.reduce((s, t) => s + Number(t.amount || 0), 0);
            const lucro_liquido = txs.reduce(
              (s, t) => s + Number(t.liquid_amount ?? t.amount ?? 0),
              0
            );
            const total_vendas = txs.length;
            const custos = faturamento_bruto - lucro_liquido;
            const roi = custos > 0 ? faturamento_bruto / custos : faturamento_bruto > 0 ? total_vendas : 0;

            // Month liquid
            const { data: monthTx } = await supabaseAdmin
              .from("transactions")
              .select("liquid_amount, amount")
              .eq("user_id", sub.user_id)
              .eq("type", "cashin")
              .gte("created_at", monthStart);
            const meta_valor = (monthTx ?? []).reduce(
              (s, t) => s + Number(t.liquid_amount ?? t.amount ?? 0),
              0
            );
            const meta_batida = meta_valor >= 1650;

            const tpl = pickTemplate({
              total_vendas,
              faturamento_bruto,
              lucro_liquido,
              roi,
              meta_batida,
              meta_valor,
            });

            const res = await sendPushToUser(sub.user_id, {
              title: tpl.title,
              body: tpl.body,
              tag: `daily-${y}${m}${d}`,
            });
            if (res.ok) sent++;
            else errors.push({ user_id: sub.user_id, reason: res.reason });
          } catch (e: any) {
            errors.push({ user_id: sub.user_id, error: e?.message });
          }
        }

        return json({ ok: true, sent, total: subs.length, errors });
      },
      GET: async () => json({ ok: true, hint: "POST to trigger" }),
    },
  },
});
