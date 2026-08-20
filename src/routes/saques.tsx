import { createFileRoute } from "@tanstack/react-router";
import { Sidebar } from "@/components/scaleup-pay/Sidebar";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/saques")({
  component: Saques,
});

function Saques() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-8 lg:p-12">
        <h1 className="font-display text-3xl font-bold mb-8">Gestão de Saques</h1>
        <Card className="p-6">
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Solicite a transferência dos seus ganhos para sua conta bancária.
          </div>
        </Card>
      </main>
    </div>
  );
}
