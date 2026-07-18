import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { NotificationsCard } from "@/components/NotificationsCard";

export const Route = createFileRoute("/notificacoes")({
  head: () => ({
    meta: [
      { title: "Notificações — ScaleUp" },
      {
        name: "description",
        content:
          "Ative e personalize as notificações de venda do ScaleUp no seu dispositivo.",
      },
    ],
  }),
  component: NotificacoesPage,
});

function NotificacoesPage() {
  return (
    <AppLayout>
      <PageHeader
        title="Notificações"
        subtitle="Ative os alertas de venda e personalize como você quer ser avisado"
      />

      <div className="grid grid-cols-1 gap-6 max-w-3xl">
        <NotificationsCard />
      </div>
    </AppLayout>
  );
}
