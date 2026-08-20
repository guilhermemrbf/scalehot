import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/pagamento/pendente")({
  component: PendingPage,
});

function PendingPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="size-20 bg-warning/20 rounded-full flex items-center justify-center mx-auto shadow-glow">
          <Clock className="size-10 text-warning" />
        </div>
        <h1 className="text-3xl font-display font-bold">Aguardando Pagamento</h1>
        <p className="text-muted-foreground">Estamos aguardando a confirmação do seu pagamento. Isso pode levar alguns minutos.</p>
        
        <div className="pt-8">
          <Button variant="outline" className="w-full h-12">
            <RefreshCcw className="mr-2 size-4" /> Atualizar Status
          </Button>
        </div>
      </div>
    </div>
  );
}
