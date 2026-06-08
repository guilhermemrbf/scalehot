import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getVapidPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  return { publicKey: process.env.VAPID_PUBLIC_KEY ?? "" };
});

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { subscription: unknown }) => ({
    subscription: subscriptionSchema.parse(input.subscription),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        { user_id: userId, subscription: data.subscription, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("push_subscriptions").delete().eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendTestNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { sendPushToUser } = await import("./push.server");
    const res = await sendPushToUser(context.userId, {
      title: "🎉 ScaleUp Ativado!",
      body: "Suas notificações estão funcionando. Você será avisado a cada nova venda!",
    });
    return res;
  });

const prefsSchema = z.object({
  daily_summary: z.boolean(),
  milestones: z.boolean(),
  per_sale: z.boolean(),
  bot_offline: z.boolean(),
});

const DEFAULT_PREFS = { daily_summary: true, milestones: true, per_sale: true, bot_offline: true };

export const getNotificationPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("push_subscriptions")
      .select("preferences")
      .eq("user_id", userId)
      .maybeSingle();
    const stored = (data?.preferences as any) ?? {};
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
      .from("push_subscriptions")
      .update({ preferences: data, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

