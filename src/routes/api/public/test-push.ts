import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/test-push")({
  server: {
    handlers: {
      GET: async () => {
        const apiKey = process.env.ONESIGNAL_REST_API_KEY;
        if (!apiKey) {
          return Response.json({ ok: false, reason: "ONESIGNAL_REST_API_KEY not set" }, { status: 500 });
        }
        const res = await fetch("https://onesignal.com/api/v1/notifications", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${apiKey}`,
          },
          body: JSON.stringify({
            app_id: "d3c273de-eca7-4b06-84db-4a3d41272b6b",
            headings: { en: "🎉 ScaleUp Ativado!", pt: "🎉 ScaleUp Ativado!" },
            contents: {
              en: "Suas notificações estão funcionando. Você será avisado a cada nova venda!",
              pt: "Suas notificações estão funcionando. Você será avisado a cada nova venda!",
            },
            included_segments: ["Subscribed Users"],
            target_channel: "push",
          }),
        });
        const data = await res.json().catch(() => ({}));
        return Response.json({ status: res.status, data });
      },
    },
  },
});
