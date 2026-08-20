import { createFileRoute, Link } from "@tanstack/react-router";
import { XCircle, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/pagamento/erro")({
  component: ErrorPage,
});

function ErrorPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="size-20 bg-destructive/20 rounded-full flex items-center justify-center mx-auto shadow-glow">
          <XCircle className="size-10 text-destructive" />
        </div>
        <h1 className="text-3xl font-display font-bold">Ops! Algo deu errado.</h1>
        <p className="text-muted-foreground">Não conseguimos processar seu pagamento. Por favor, tente novamente ou use outro método.</p>
        
        <div className="pt-8">
          <Button asChild variant="outline" className="w-full h-12">
            <button onClick={() => window.history.back()}>
              <ChevronLeft className="mr-2 size-4" /> Tentar Novamente
            </button>
          </Button>
        </div>
      </div>
    </div>
  );
}
