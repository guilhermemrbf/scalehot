import { createFileRoute } from "@tanstack/react-router";
import { Sidebar } from "@/components/scaleup-pay/Sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/links-pagamento")({
  component: LinksPagamento,
});

function LinksPagamento() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-8 lg:p-12">
        <h1 className="font-display text-3xl font-bold mb-8">Links de Pagamento</h1>
        <Card className="p-6">
          <div className="h-64 flex items-center justify-center text-muted-foreground text-center">
            Gerencie seus links de cobrança direta. <br/> Botão "Criar Novo" aqui.
          </div>
        </Card>
      </main>
    </div>
  );
}
