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
