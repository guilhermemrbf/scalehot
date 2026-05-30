import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/card";
import { brl, pct, startOfMonthISO, todayISO } from "@/lib/format";
import { TrendingUp, Wallet, Percent, Landmark, CheckCircle2, BarChart3 } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar, Legend } from "recharts";
import { motion } from "framer-motion";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — FinanceFlow" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: fats = [] } = useQuery({
    queryKey: ["faturamentos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("faturamentos").select("*").order("data");
      if (error) throw error;
      return data;
    },
  });
  const { data: fechs = [] } = useQuery({
    queryKey: ["fechamentos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fechamentos").select("*").order("data_inicio");
      if (error) throw error;
      return data;
    },
  });

  const totalBruto = fechs.reduce((s, f) => s + Number(f.faturamento_bruto), 0);
  const totalLiquido = fechs.reduce((s, f) => s + Number(f.faturamento_liquido), 0);
  const totalTaxas = fechs.reduce((s, f) => s + Number(f.taxa_valor), 0);
  const totalImposto = fechs.reduce((s, f) => s + Number(f.imposto), 0);
  const lucroTotal = fechs.reduce((s, f) => s + Number(f.lucro_real), 0);
  const taxaMedia = totalBruto > 0 ? (totalTaxas / totalBruto) * 100 : 0;

  // Faturamento bruto (não fechado) do mês
  const inicioMes = startOfMonthISO();
  const hoje = todayISO();
  const brutoMes = fats.filter((f) => f.data >= inicioMes && f.data <= hoje)
    .reduce((s, f) => s + Number(f.faturamento_bruto), 0);

  // Daily chart - last 30 days
  const dailyMap = new Map<string, number>();
  fats.forEach((f) => dailyMap.set(f.data, (dailyMap.get(f.data) || 0) + Number(f.faturamento_bruto)));
  const dailyData = Array.from(dailyMap.entries())
    .slice(-30)
    .map(([data, bruto]) => ({ data: data.slice(5).replace("-", "/"), bruto }));

  // Monthly aggregation
  const monthMap = new Map<string, { bruto: number; liquido: number; lucro: number }>();
  fechs.forEach((f) => {
    const k = String(f.data_inicio).slice(0, 7);
    const cur = monthMap.get(k) || { bruto: 0, liquido: 0, lucro: 0 };
    cur.bruto += Number(f.faturamento_bruto);
    cur.liquido += Number(f.faturamento_liquido);
    cur.lucro += Number(f.lucro_real);
    monthMap.set(k, cur);
  });
  const monthly = Array.from(monthMap.entries()).slice(-6).map(([m, v]) => ({ mes: m, ...v }));

  const cards = [
    { label: "Faturamento Bruto", value: brl(totalBruto || brutoMes), icon: TrendingUp, hint: totalBruto ? "Fechamentos totais" : "Bruto do mês (sem fechar)", color: "text-chart-2" },
    { label: "Faturamento Líquido", value: brl(totalLiquido), icon: Wallet, hint: "Recebido após taxas", color: "text-primary" },
    { label: "Total de Taxas", value: brl(totalTaxas), icon: Percent, hint: pct(taxaMedia) + " média", color: "text-warning" },
    { label: "Impostos Pagos", value: brl(totalImposto), icon: Landmark, hint: "Imposto fixo acumulado", color: "text-chart-5" },
    { label: "Lucro Real", value: brl(lucroTotal), icon: CheckCircle2, hint: "Líquido − Imposto", color: "text-success" },
    { label: "Taxa Média", value: pct(taxaMedia), icon: BarChart3, hint: "Sobre o bruto", color: "text-chart-3" },
  ];

  return (
    <AppLayout>
      <PageHeader title="Dashboard" subtitle="Visão geral do seu desempenho financeiro" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className="p-5 bg-gradient-card hover:shadow-glow transition-shadow">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{c.label}</p>
                  <p className="font-display text-2xl font-bold tracking-tight">{c.value}</p>
                  <p className="text-xs text-muted-foreground">{c.hint}</p>
                </div>
                <div className={`size-10 rounded-xl bg-muted grid place-items-center ${c.color}`}>
                  <c.icon className="size-5" />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold">Evolução Diária do Faturamento</h3>
            <span className="text-xs text-muted-foreground">Últimos 30 lançamentos</span>
          </div>
          <div className="h-72">
            {dailyData.length === 0 ? <Empty msg="Sem registros ainda." /> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gBruto" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.74 0.17 158)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="oklch(0.74 0.17 158)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="data" stroke="var(--color-muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }} formatter={(v: number) => brl(v)} />
                  <Area type="monotone" dataKey="bruto" stroke="oklch(0.74 0.17 158)" strokeWidth={2} fill="url(#gBruto)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold">Comparativo Mensal</h3>
            <span className="text-xs text-muted-foreground">Bruto vs Líquido vs Lucro</span>
          </div>
          <div className="h-72">
            {monthly.length === 0 ? <Empty msg="Realize fechamentos para visualizar." /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="mes" stroke="var(--color-muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }} formatter={(v: number) => brl(v)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="bruto" name="Bruto" fill="oklch(0.7 0.17 230)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="liquido" name="Líquido" fill="oklch(0.74 0.17 158)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="lucro" name="Lucro" fill="oklch(0.78 0.16 75)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="h-full grid place-items-center text-sm text-muted-foreground">{msg}</div>;
}
