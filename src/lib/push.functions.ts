import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const sendTestNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ subscriptionId: z.string().min(1).max(200).optional() }).parse(input ?? {})
  )
  .handler(async ({ context, data }) => {
    const { sendPushToUser } = await import("./push.server");
    return sendPushToUser(context.userId, {
      title: "🎉 ScaleUp Ativado!",
      body: "Suas notificações estão funcionando. Você será avisado a cada nova venda!",
      subscriptionId: data.subscriptionId,
    });
  });

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export const sendMarketingBurst = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        count: z.number().int().min(1).max(200).default(100),
        intervalMs: z.number().int().min(100).max(5000).default(600),
      })
      .parse(input ?? {})
  )
  .handler(async ({ context, data }) => {
    const { sendPushToUser } = await import("./push.server");
    const titles = [
      "💰 Nova venda aprovada!",
      "🤑 PIX caiu na conta",
      "🔥 Mais uma venda!",
      "💎 Venda confirmada",
      "⚡ Conversão aprovada",
      "🚀 Faturamento subindo",
      "🎯 PIX recebido",
      "✨ Cliente pagou agora",
    ];
    const produtos = [
      "Pack Premium",
      "VIP Mensal",
      "Acesso Vitalício",
      "Combo Completo",
      "Plano Trimestral",
      "Upsell Exclusivo",
      "Bump Adicional",
    ];

    let sent = 0;
    const errors: any[] = [];
    for (let i = 0; i < data.count; i++) {
      // valor entre R$ 9,90 e R$ 297,00
      const valor = +(Math.random() * (297 - 9.9) + 9.9).toFixed(2);
      const title = titles[Math.floor(Math.random() * titles.length)];
      const produto = produtos[Math.floor(Math.random() * produtos.length)];
      const res = await sendPushToUser(context.userId, {
        title,
        body: `${brl(valor)} • ${produto}`,
        tag: `marketing-${Date.now()}-${i}`,
      });
      if (res.ok) sent++;
      else errors.push({ i, reason: (res as any).reason });
      if (i < data.count - 1) {
        await new Promise((r) => setTimeout(r, data.intervalMs));
      }
    }
    return { ok: true, sent, total: data.count, errors: errors.slice(0, 5) };
  });

const prefsSchema = z.object({
  daily_summary: z.boolean(),
  milestones: z.boolean(),
  per_sale: z.boolean(),
  bot_offline: z.boolean(),
});

const DEFAULT_PREFS = { daily_summary: true, milestones: true, per_sale: true, bot_offline: true };

const subscriptionSchema = z.object({
  subscriptionId: z.string().min(1).max(255),
  token: z.string().min(1).max(1000).optional(),
});

export const registerPushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => subscriptionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("push_subscriptions" as any).upsert(
      {
        user_id: userId,
        subscription_id: data.subscriptionId,
        token: data.token ?? null,
        active: true,
      },
      { onConflict: "subscription_id" }
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deactivatePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => subscriptionSchema.pick({ subscriptionId: true }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("push_subscriptions" as any)
      .update({ active: false })
      .eq("user_id", userId)
      .eq("subscription_id", data.subscriptionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getNotificationPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("profiles")
      .select("notification_preferences")
      .eq("id", userId)
      .maybeSingle();
    const stored = ((data as any)?.notification_preferences as any) ?? {};
    return { ...DEFAULT_PREFS, ...stored } as {
      daily_summary: boolean;
      milestones: boolean;
      per_sale: boolean;
      bot_offline: boolean;
    };
  });

export const saveNotificationPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => prefsSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ notification_preferences: data } as any)
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
