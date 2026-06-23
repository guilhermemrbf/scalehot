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
        minValue: z.number().min(0.1).max(10000).default(5.9),
        maxValue: z.number().min(0.1).max(10000).default(19.9),
        minIntervalMs: z.number().int().min(100).max(60000).default(3000),
        maxIntervalMs: z.number().int().min(100).max(60000).default(7000),
        title: z.string().min(1).max(150).default("venda aprovada!"),
        bodyTemplate: z.string().min(1).max(200).default("{valor}"),
        icon: z.string().url().max(2000).optional(),
        presets: z
          .array(
            z.object({
              title: z.string().min(1).max(150),
              subtitle: z.string().min(1).max(80).optional(),
              bodyTemplate: z.string().min(1).max(200),
              icon: z.string().url().max(2000).optional(),
            })
          )
          .max(10)
          .optional(),
      })
      .parse(input ?? {})
  )
  .handler(async ({ context, data }) => {
    const { sendPushToUser } = await import("./push.server");
    const lo = Math.min(data.minValue, data.maxValue);
    const hi = Math.max(data.minValue, data.maxValue);
    const iLo = Math.min(data.minIntervalMs, data.maxIntervalMs);
    const iHi = Math.max(data.minIntervalMs, data.maxIntervalMs);

    const variants =
      data.presets && data.presets.length > 0
        ? data.presets
        : [{ title: data.title, bodyTemplate: data.bodyTemplate, icon: data.icon }];

    let sent = 0;
    const errors: any[] = [];
    for (let i = 0; i < data.count; i++) {
      const valor = +(Math.random() * (hi - lo) + lo).toFixed(2);
      const v = variants[Math.floor(Math.random() * variants.length)];
      const body = v.bodyTemplate.replace(/\{valor\}/g, brl(valor));
      const res = await sendPushToUser(context.userId, {
        title: v.title,
        subtitle: v.subtitle,
        body,
        tag: `marketing-${Date.now()}-${i}`,
        icon: v.icon,
      });
      if (res.ok) sent++;
      else errors.push({ i, reason: (res as any).reason });
      if (i < data.count - 1) {
        const delay = Math.floor(Math.random() * (iHi - iLo + 1)) + iLo;
        await new Promise((r) => setTimeout(r, delay));
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
