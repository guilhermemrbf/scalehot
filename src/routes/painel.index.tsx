import { createFileRoute } from "@tanstack/react-router";
import { ClientPanelApp } from "@/components/ClientPanelApp";

export const Route = createFileRoute("/painel/")({
  head: () => ({
    meta: [
      { title: "ScaleUp Pay — Acesse sua conta" },
      { name: "description", content: "Entre na sua conta ScaleUp Pay para ver vendas, taxas, saldo e saques." },
      { property: "og:title", content: "ScaleUp Pay — Acesse sua conta" },
      { property: "og:description", content: "Entre na sua conta ScaleUp Pay para ver vendas, taxas, saldo e saques." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => <ClientPanelApp />,
});
