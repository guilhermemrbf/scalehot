import { createFileRoute } from "@tanstack/react-router";
import { Sidebar } from "@/components/scaleup-pay/Sidebar";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/api-keys")({
  component: ApiKeys,
});

function ApiKeys() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-8 lg:p-12">
        <h1 className="font-display text-3xl font-bold mb-8">Integrações (API)</h1>
        <Card className="p-6">
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Configure suas chaves de API e URLs de Webhook.
          </div>
        </Card>
      </main>
    </div>
  );
}
