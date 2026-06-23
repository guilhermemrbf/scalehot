// OneSignal REST API push sender. Same signature as before so callers don't change.
export const ONESIGNAL_APP_ID = "d3c273de-eca7-4b06-84db-4a3d41272b6b";

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; subtitle?: string; url?: string; tag?: string; subscriptionId?: string; icon?: string }
) {
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!apiKey) {
    console.error("[push] ONESIGNAL_REST_API_KEY not configured");
    return { ok: false, reason: "not-configured" };
  }
  try {
    const normalizedApiKey = apiKey.trim();
    const authorization = normalizedApiKey.startsWith("Key ")
      ? normalizedApiKey
      : normalizedApiKey.startsWith("Basic ")
        ? normalizedApiKey.replace(/^Basic\s+/, "Key ")
        : `Key ${normalizedApiKey}`;

    let savedSubscriptionIds: string[] = [];
    if (!payload.subscriptionId) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data, error } = await supabaseAdmin
        .from("push_subscriptions" as any)
        .select("subscription_id")
        .eq("user_id", userId)
        .eq("active", true)
        .order("updated_at", { ascending: false })
        .limit(10);
      if (error) console.error("[push] failed to load saved subscriptions:", error.message);
      savedSubscriptionIds = ((data ?? []) as any[]).map((row) => row.subscription_id).filter(Boolean);
      console.log("[push] saved subscription targets:", savedSubscriptionIds.length);
    }

    const targets = payload.subscriptionId
      ? [
          { kind: "subscription", body: { include_subscription_ids: [payload.subscriptionId] } },
          { kind: "external_id", body: { include_aliases: { external_id: [userId] } } },
        ]
      : [
          ...(savedSubscriptionIds.length
            ? [{ kind: "saved_subscriptions", body: { include_subscription_ids: savedSubscriptionIds } }]
            : []),
          { kind: "external_id", body: { include_aliases: { external_id: [userId] } } },
        ];

    let lastError: { status: number; data: unknown; target: string } | null = null;
    for (const target of targets) {
      const res = await fetch("https://api.onesignal.com/notifications?c=push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authorization,
        },
        body: JSON.stringify({
          app_id: ONESIGNAL_APP_ID,
          headings: { en: payload.title, pt: payload.title },
          ...(payload.subtitle ? { subtitles: { en: payload.subtitle, pt: payload.subtitle } } : {}),
          contents: { en: payload.body, pt: payload.body },
          ...target.body,
          target_channel: "push",
          url: payload.url,
          web_push_topic: payload.tag,
          ...(payload.icon
            ? {
                chrome_web_icon: payload.icon,
                chrome_web_image: payload.icon,
                chrome_big_picture: payload.icon,
                firefox_icon: payload.icon,
                large_icon: payload.icon,
                big_picture: payload.icon,
                small_icon: payload.icon,
                huawei_large_icon: payload.icon,
                huawei_big_picture: payload.icon,
                adm_large_icon: payload.icon,
                adm_big_picture: payload.icon,
                ios_attachments: { id1: payload.icon },
              }
            : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && !data.errors) return { ok: true, id: data.id, target: target.kind };

      lastError = { status: res.status, data, target: target.kind };
      console.error("[push] OneSignal error:", res.status, target.kind, data);
    }

    return { ok: false, reason: JSON.stringify(lastError?.data ?? {}), status: lastError?.status, target: lastError?.target };
  } catch (err: any) {
    console.error("[push] send failed:", err?.message);
    return { ok: false, reason: err?.message ?? "unknown" };
  }
}
