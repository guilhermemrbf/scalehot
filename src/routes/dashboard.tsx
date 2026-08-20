import { createFileRoute } from "@tanstack/react-router";
import { Sidebar } from "@/components/scaleup-pay/Sidebar";
import { KpiCard } from "@/components/scaleup-pay/KpiCard";
import { LayoutDashboard, Receipt, Wallet, TrendingUp, Users } from "lucide-react";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-8 lg:p-12">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold">Olá, Lojista!</h1>
          <p className="text-muted-foreground">Bem-vindo ao seu Gateway ScaleUp Pay.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <KpiCard title="Saldo Disponível" value="R$ 14.520,00" variation="+12.5% vs ontem" trend="up" icon={Wallet} />
          <KpiCard title="A Receber" value="R$ 3.200,50" variation="Em 30 dias" trend="neutral" icon={Receipt} />
          <KpiCard title="Vendas Hoje" value="84" variation="+5 vendas" trend="up" icon={TrendingUp} />
          <KpiCard title="Taxa de Aprovação" value="92.4%" variation="-0.8%" trend="down" icon={Users} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6 bg-gradient-card">
            <h3 className="font-display font-semibold mb-6">Gráfico de Faturamento</h3>
            <div className="h-64 bg-muted/20 rounded-xl border border-dashed border-border flex items-center justify-center text-muted-foreground">
              [Placeholder para Gráfico]
            </div>
          </Card>
          <Card className="p-6 bg-gradient-card">
            <h3 className="font-display font-semibold mb-6">Últimas Transações</h3>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Cliente {i}</p>
                    <p className="text-xs text-muted-foreground">PIX</p>
                  </div>
                  <p className="font-semibold text-sm">R$ {i * 150},00</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
