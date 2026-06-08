import webpush from "web-push";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

let configured = false;
function configure() {
  if (configured) return;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subj = process.env.VAPID_SUBJECT || "mailto:admin@scalehot.app";
  if (!pub || !priv) throw new Error("VAPID keys not configured");
  webpush.setVapidDetails(subj, pub, priv);
  configured = true;
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string; tag?: string }
) {
  try {
    configure();
    const { data: row, error } = await supabaseAdmin
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !row?.subscription) return { ok: false, reason: "no-subscription" };

    await webpush.sendNotification(row.subscription as any, JSON.stringify(payload));
    return { ok: true };
  } catch (err: any) {
    // Limpa subscriptions inválidas
    if (err?.statusCode === 404 || err?.statusCode === 410) {
      await supabaseAdmin.from("push_subscriptions").delete().eq("user_id", userId);
    }
    console.error("[push] send failed:", err?.statusCode, err?.message);
    return { ok: false, reason: err?.message ?? "unknown" };
  }
}
