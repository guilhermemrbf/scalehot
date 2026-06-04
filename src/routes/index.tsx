import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { brl, pct, startOfMonthISO, startOfWeekISO, todayISO } from "@/lib/format";
import { TrendingUp, Wallet, Percent, Landmark, CheckCircle2, BarChart3, Target, Save, Settings2, Megaphone, Trophy } from "lucide-react";
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

  const { data: metas } = useQuery({
    queryKey: ["metas"],
    queryFn: async () => (await supabase.from("metas").select("*").limit(1).single()).data,
  });

  const totalBruto = fechs.reduce((s, f) => s + Number(f.faturamento_bruto), 0);
  const totalLiquido = fechs.reduce((s, f) => s + Number(f.faturamento_liquido), 0);
  const totalTaxas = fechs.reduce((s, f) => s + Number(f.taxa_valor), 0);
  const totalImposto = fechs.reduce((s, f) => s + Number(f.imposto), 0);
  const lucroBrutoTotal = fechs.reduce((s, f) => s + Number(f.lucro_real), 0);
  const totalAnuncios = gastos.reduce((s, g) => s + Number(g.valor), 0);
  const lucroTotal = lucroBrutoTotal - totalAnuncios;
  
  // Monthly/Weekly/Daily Profit calculations
  const inicioMes = startOfMonthISO();
  const inicioSemana = startOfWeekISO();
  const hoje = todayISO();
  
  const calculateLucro = (since: string) => {
    const fPeriodo = fechs.filter(f => f.data_inicio >= since);
    const gPeriodo = gastos.filter(g => (g as any).data >= since && (g as any).data <= hoje);
    const lBruto = fPeriodo.reduce((s, f) => s + Number(f.lucro_real), 0);
    const tAnuncios = gPeriodo.reduce((s, g) => s + Number(g.valor), 0);
    return lBruto - tAnuncios;
  };

  const lucroLiquidoMensal = calculateLucro(inicioMes);
  const lucroLiquidoSemanal = calculateLucro(inicioSemana);
  const lucroLiquidoHoje = calculateLucro(hoje);

  const taxaMedia = totalBruto > 0 ? (totalTaxas / totalBruto) * 100 : 0;

  // Faturamento bruto (não fechado) do mês
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
    { label: "Lucro Total", value: brl(lucroTotal), icon: Trophy, hint: "Acumulado histórico", color: "text-success" },
    { label: "Total de Taxas", value: brl(totalTaxas), icon: Percent, hint: pct(taxaMedia) + " média", color: "text-warning" },
    { label: "Impostos Pagos", value: brl(totalImposto), icon: Landmark, hint: "Imposto fixo acumulado", color: "text-chart-5" },
    { label: "Gastos c/ Anúncios", value: brl(totalAnuncios), icon: Megaphone, hint: `${gastos.length} lançamentos`, color: "text-destructive" },
    { label: "Taxa Média", value: pct(taxaMedia), icon: BarChart3, hint: "Sobre o bruto", color: "text-chart-3" },
  ];

  const metaMensalValor = Number(metas?.meta_mensal || 1650);
  const percentualMeta = Math.min(100, (lucroLiquidoMensal / metaMensalValor) * 100);
  const metaBatida = lucroLiquidoMensal >= metaMensalValor;

  return (
    <AppLayout>
      <PageHeader title="Dashboard" subtitle="Visão geral do seu desempenho financeiro" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {cards.map((c, i) => (
            <motion.div key={c.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className="p-5 bg-gradient-card hover:shadow-glow transition-shadow h-full">
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

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="p-6 bg-gradient-card border-primary/20 hover:shadow-glow transition-shadow h-full flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-lg bg-primary/10 grid place-items-center text-primary">
                    <Target className="size-4" />
                  </div>
                  <h3 className="font-display font-bold tracking-tight">Meta Mensal</h3>
                </div>
                <div className="flex items-center gap-2">
                  {metaBatida && (
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-tighter bg-success/15 text-success px-2 py-0.5 rounded-full animate-pulse">
                      <Trophy className="size-3" /> Meta Batida!
                    </span>
                  )}
                  <MetasDialog qc={qc} metas={metas} trigger={<Button variant="ghost" size="icon" className="size-6 rounded-full hover:bg-primary/10 hover:text-primary"><Settings2 className="size-3" /></Button>} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <p className="text-3xl font-display font-bold tracking-tighter text-primary">
                    {brl(lucroLiquidoMensal)}
                  </p>
                  <p className="text-sm font-medium text-muted-foreground">
                    / {brl(metaMensalValor)}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">Lucro Líquido do Mês</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span>Progresso</span>
                  <span>{percentualMeta.toFixed(1)}%</span>
                </div>
                <div className="h-3 rounded-full bg-muted overflow-hidden border border-border/50">
                  <motion.div
                    className={`h-full rounded-full ${metaBatida ? 'bg-gradient-to-r from-success to-emerald-400' : 'bg-gradient-primary'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${percentualMeta}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border/50">
              <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                {metaBatida 
                  ? "Parabéns! Você superou sua meta de lucro este mês. Continue com o excelente trabalho!"
                  : `Faltam ${brl(metaMensalValor - lucroLiquidoMensal)} para atingir sua meta mensal.`}
              </p>
            </div>
          </Card>
        </motion.div>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="size-5 text-primary" />
              <h2 className="font-display text-xl font-bold tracking-tight">Outras Metas</h2>
            </div>
            <MetasDialog qc={qc} metas={metas} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "Diária", atual: lucroLiquidoHoje, meta: Number(metas?.meta_diaria || 0) },
              { label: "Semanal", atual: lucroLiquidoSemanal, meta: Number(metas?.meta_semanal || 0) },
            ].map((b, i) => {
              const progress = b.meta > 0 ? Math.min(100, (b.atual / b.meta) * 100) : 0;
              const completo = progress >= 100;
              return (
                <Card key={b.label} className="p-5 bg-gradient-card">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Meta {b.label}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${completo ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                      {progress.toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xl font-display font-bold tracking-tight mb-1">{brl(b.atual)}</p>
                  <p className="text-[10px] text-muted-foreground mb-3">de {brl(b.meta)}</p>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
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
        </section>

        <Card className="p-6 bg-muted/30 border-dashed flex flex-col items-center justify-center text-center space-y-4">
          <div className="size-12 rounded-full bg-primary/10 grid place-items-center text-primary">
            <Settings2 className="size-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-display font-semibold">Configurações de Meta</h3>
            <p className="text-sm text-muted-foreground max-w-[240px]">Ajuste seus objetivos diários, semanais e mensais para acompanhar seu progresso.</p>
          </div>
          <MetasDialog qc={qc} metas={metas} trigger={<Button variant="outline" size="sm">Ajustar Metas</Button>} />
        </Card>
      </div>
    </AppLayout>
  );
}

function MetasDialog({ qc, metas, trigger }: { qc: any, metas: any, trigger?: React.ReactNode }) {
  const [diaria, setDiaria] = useState("");
  const [semanal, setSemanal] = useState("");
  const [mensal, setMensal] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (metas) {
      setDiaria(String(metas.meta_diaria));
      setSemanal(String(metas.meta_semanal));
      setMensal(String(metas.meta_mensal));
    }
  }, [metas, open]);

  const save = useMutation({
    mutationFn: async () => {
      if (!metas) return;
      const { error } = await supabase.from("metas").update({
        meta_diaria: parseFloat(diaria) || 0,
        meta_semanal: parseFloat(semanal) || 0,
        meta_mensal: parseFloat(mensal) || 0,
        updated_at: new Date().toISOString(),
      }).eq("id", metas.id);
      if (error) throw error;
    },
    onSuccess: () => { 
      toast.success("Metas atualizadas."); 
      setOpen(false); 
      qc.invalidateQueries({ queryKey: ["metas"] }); 
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="relative">
      <div onClick={() => setOpen(true)}>
        {trigger || (
          <Button variant="ghost" size="sm" className="gap-2">
            <Settings2 className="size-4" />
            Configurar
          </Button>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md"
          >
            <Card className="p-6 shadow-2xl border-primary/20">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display text-xl font-bold">Definir Metas</h3>
                <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="rounded-full">
                  <Settings2 className="size-4 rotate-45" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Meta Diária (R$)</Label>
                  <Input inputMode="decimal" value={diaria} onChange={(e) => setDiaria(e.target.value)} placeholder="0,00" />
                </div>
                <div className="space-y-2">
                  <Label>Meta Semanal (R$)</Label>
                  <Input inputMode="decimal" value={semanal} onChange={(e) => setSemanal(e.target.value)} placeholder="0,00" />
                </div>
                <div className="space-y-2">
                  <Label>Meta Mensal (R$)</Label>
                  <Input inputMode="decimal" value={mensal} onChange={(e) => setMensal(e.target.value)} placeholder="0,00" />
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={() => save.mutate()} disabled={save.isPending} className="flex-1 bg-gradient-primary text-primary-foreground">
                  {save.isPending ? "Salvando..." : "Salvar Metas"}
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="h-full grid place-items-center text-sm text-muted-foreground">{msg}</div>;
}
