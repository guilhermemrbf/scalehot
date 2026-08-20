import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/pagamento/sucesso")({
  component: SuccessPage,
});

function SuccessPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="size-20 bg-success/20 rounded-full flex items-center justify-center mx-auto shadow-glow">
          <CheckCircle2 className="size-10 text-success" />
        </div>
        <h1 className="text-3xl font-display font-bold">Pagamento Aprovado!</h1>
        <p className="text-muted-foreground">Tudo certo com sua compra. Você receberá os detalhes por e-mail em instantes.</p>
        
        <div className="pt-8">
          <Button asChild className="w-full bg-primary h-12">
            <Link to="/">Voltar ao Início <ArrowRight className="ml-2 size-4" /></Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
