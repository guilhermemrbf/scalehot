import { createFileRoute } from "@tanstack/react-router";
import { ClientPanelApp } from "@/components/ClientPanelApp";

export const Route = createFileRoute("/painel/$slug")({
  head: () => ({
    meta: [
      { title: "Painel do Cliente — ScaleUp" },
      { name: "description", content: "Painel privado com vendas aprovadas, saldo e saques." },
      { property: "og:title", content: "Painel do Cliente — ScaleUp" },
      { property: "og:description", content: "Painel privado com vendas aprovadas, saldo e saques." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PanelBySlug,
});

function PanelBySlug() {
  const { slug } = Route.useParams();
  return <ClientPanelApp slug={slug} />;
}
