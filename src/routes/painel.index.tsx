import { createFileRoute } from "@tanstack/react-router";
import { ClientPanelApp } from "@/components/ClientPanelApp";

export const Route = createFileRoute("/painel/")({
  head: () => ({
    meta: [
      { title: "Painel da Equipe — ScaleUp" },
      { name: "description", content: "Acompanhe as vendas aprovadas e solicite seus saques." },
      { property: "og:title", content: "Painel da Equipe — ScaleUp" },
      { property: "og:description", content: "Acompanhe as vendas aprovadas e solicite seus saques." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => <ClientPanelApp />,
});
