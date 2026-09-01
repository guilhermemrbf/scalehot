import { createFileRoute } from "@tanstack/react-router";
import { ClientPanelApp } from "@/components/ClientPanelApp";

export const Route = createFileRoute("/painel/$slug")({
  head: () => ({
    meta: [
      { title: "ScaleUp Pay — Sua conta de pagamentos" },
      { name: "description", content: "Acompanhe vendas aprovadas, taxas, saldo disponível e saques na sua conta ScaleUp Pay." },
      { property: "og:title", content: "ScaleUp Pay — Sua conta de pagamentos" },
      { property: "og:description", content: "Acompanhe vendas aprovadas, taxas, saldo disponível e saques na sua conta ScaleUp Pay." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PanelBySlug,
});

function PanelBySlug() {
  const { slug } = Route.useParams();
  return <ClientPanelApp slug={slug} />;
}
