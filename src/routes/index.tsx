import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { brl, pct, startOfMonthISO, todayISO } from "@/lib/format";
import { TrendingUp, Wallet, Percent, Landmark, CheckCircle2, BarChart3, Target, Save, Settings2, Megaphone, Trophy, RotateCcw, Activity } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar, Legend } from "recharts";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — ScaleHot" }] }),
  component: Dashboard,
});

function Dashboard() {
  const qc = useQueryClient();
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

  const { data: gastos = [] } = useQuery({
    queryKey: ["gastos_anuncios"],
    queryFn: async () => {
      const { data, error } = await supabase.from("gastos_anuncios" as any).select("*").order("data");
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  const totalBruto = fechs.reduce((s, f) => s + Number(f.faturamento_bruto), 0);
  const totalLiquido = fechs.reduce((s, f) => s + Number(f.faturamento_liquido), 0);
  const totalTaxas = fechs.reduce((s, f) => s + Number(f.taxa_valor), 0);
  const totalImposto = fechs.reduce((s, f) => s + Number(f.imposto), 0);
  const lucroBruto = fechs.reduce((s, f) => s + Number(f.lucro_real), 0);
  const totalAnuncios = gastos.reduce((s, g) => s + Number(g.valor), 0);
  const lucroTotal = lucroBruto - totalAnuncios;
  const taxaMedia = totalBruto > 0 ? (totalTaxas / totalBruto) * 100 : 0;
  
  const roi = totalAnuncios > 0 ? (lucroTotal / totalAnuncios) : 0;
  const totalReembolsos = fats.reduce((s, f) => s + (Number(f.reembolsos_count) || 0), 0);

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
    { label: "Lucro", value: brl(lucroTotal), icon: Trophy, hint: "Após taxas, imposto e anúncios", color: "text-success" },
    { label: "ROI Total", value: roi.toFixed(2) + "x", icon: Activity, hint: "Retorno sobre investimento", color: "text-chart-4" },
    { label: "Vendas Reembolsadas", value: String(totalReembolsos), icon: RotateCcw, hint: "Total de solicitações", color: "text-destructive" },
    { label: "Gastos c/ Anúncios", value: brl(totalAnuncios), icon: Megaphone, hint: `${gastos.length} lançamentos`, color: "text-destructive" },
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

      <MetasSection qc={qc} fats={fats} />
    </AppLayout>
  );
}

function MetasSection({ qc, fats }: { qc: ReturnType<typeof useQueryClient>; fats: any[] }) {
  const { data: metas } = useQuery({
    queryKey: ["metas"],
    queryFn: async () => (await supabase.from("metas").select("*").limit(1).single()).data,
  });

  const [mensal, setMensal] = useState("");
  const [editar, setEditar] = useState(false);

  useEffect(() => {
    if (metas) {
      setMensal(String(metas.meta_mensal));
    }
  }, [metas]);

  const save = useMutation({
    mutationFn: async () => {
      if (!metas) return;
      const { error } = await supabase.from("metas").update({
        meta_mensal: parseFloat(mensal) || 0,
        updated_at: new Date().toISOString(),
      }).eq("id", metas.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Meta atualizada."); setEditar(false); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const hoje = todayISO();
  const ini30 = startOfMonthISO();
  const sum = (since: string) => fats.filter((f: any) => f.data >= since && f.data <= hoje).reduce((s: number, f: any) => s + Number(f.faturamento_bruto), 0);

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fmtShort = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  const periodoMes = `${fmtShort(start)} - ${fmtShort(end)}`;

  const blocos = [
    { label: `Meta Mensal: ${periodoMes}`, atual: sum(ini30), meta: Number(metas?.meta_mensal || 0) },
  ];

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="size-5 text-primary" />
          <h2 className="font-display text-xl font-bold tracking-tight">Metas</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setEditar((v) => !v)} className="gap-2">
          <Settings2 className="size-4" />
          {editar ? "Fechar" : "Definir metas"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {blocos.map((b, i) => {
          const progress = b.meta > 0 ? Math.min(100, (b.atual / b.meta) * 100) : 0;
          const completo = progress >= 100;
          return (
            <Card key={b.label} className="p-6 bg-gradient-card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Target className="size-4 text-primary" />
                  <h3 className="font-display font-semibold">{b.label}</h3>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${completo ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                  {progress.toFixed(0)}%
                </span>
              </div>
              <p className="text-2xl font-display font-bold tracking-tight">{brl(b.atual)}</p>
              <p className="text-xs text-muted-foreground mb-4">de {brl(b.meta)}</p>
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-primary rounded-full"
                  initial={{ width: 0 }} animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1, ease: "easeOut" }}
                />
              </div>
            </Card>
          );
        })}
      </div>

      {editar && (
        <Card className="p-6 mt-4">
          <h3 className="font-display font-semibold mb-4">Definir Metas</h3>
          <div className="grid grid-cols-1 gap-4 max-w-sm">
            <div className="space-y-2"><Label>Meta Mensal (R$)</Label><Input inputMode="decimal" value={mensal} onChange={(e) => setMensal(e.target.value)} /></div>
          </div>
          <Button onClick={() => save.mutate()} disabled={save.isPending} className="mt-5 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
            <Save className="size-4 mr-2" /> Salvar Metas
          </Button>
        </Card>
      )}
    </section>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="h-full grid place-items-center text-sm text-muted-foreground">{msg}</div>;
}
