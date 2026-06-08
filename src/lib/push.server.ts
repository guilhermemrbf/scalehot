// OneSignal REST API push sender. Same signature as before so callers don't change.
export const ONESIGNAL_APP_ID = "d3c273de-eca7-4b06-84db-4a3d41272b6b";

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string; tag?: string }
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

    const res = await fetch("https://api.onesignal.com/notifications?c=push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authorization,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        headings: { en: payload.title, pt: payload.title },
        contents: { en: payload.body, pt: payload.body },
        include_aliases: { external_id: [userId] },
        target_channel: "push",
        url: payload.url,
        web_push_topic: payload.tag,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.errors) {
      console.error("[push] OneSignal error:", res.status, data);
      return { ok: false, reason: JSON.stringify(data) };
    }
    return { ok: true, id: data.id };
  } catch (err: any) {
    console.error("[push] send failed:", err?.message);
    return { ok: false, reason: err?.message ?? "unknown" };
  }
}
