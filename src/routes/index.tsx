import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
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
import { useAuth } from "@/lib/auth";
import { VendasTempoReal } from "@/components/VendasTempoReal";
import { getDashboardMetrics } from "@/lib/finance.functions";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — ScaleUp" }] }),
  component: Dashboard,
});

function Dashboard() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [periodo, setPeriodo] = useState<"hoje" | "mes" | "total">("mes");
  const inicioMes = startOfMonthISO();
  const hoje = todayISO();
  const loadMetrics = useServerFn(getDashboardMetrics);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (error) return null;
      return data;
    },
    enabled: !!user,
  });

  const { data: config } = useQuery({
    queryKey: ["configuracoes"],
    queryFn: async () => (await supabase.from("configuracoes").select("*").limit(1).single()).data,
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["dashboard_metrics", periodo],
    queryFn: () => loadMetrics({ data: { periodo } }),
    enabled: !!user,
  });

  const impostoMensal = Number((config as any)?.imposto_fixo ?? 0);
  const taxaBotPorVenda = Number((config as any)?.taxa_bot_fixa ?? 0);

  const saudacao = () => {
    const hora = new Date().getHours();
    if (hora < 12) return "Bom dia";
    if (hora < 18) return "Boa tarde";
    return "Boa noite";
  };

  const { data: gastos = [] } = useQuery({
    queryKey: ["gastos_anuncios", periodo],
    queryFn: async () => {
      let query = supabase.from("gastos_anuncios" as any).select("*").order("data");
      if (periodo === "mes") {
        query = query.gte("data", inicioMes).lte("data", hoje);
      } else if (periodo === "hoje") {
        query = query.gte("data", hoje).lte("data", hoje);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  const { data: txs = [] } = useQuery({
    queryKey: ["transactions_dash", periodo],
    queryFn: async () => {
      let q = supabase
        .from("transactions" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (periodo === "mes") q = q.gte("created_at", inicioMes);
      else if (periodo === "hoje") {
        // BRT (UTC-3): "hoje" começa às 03:00 UTC do dia e termina às 03:00 UTC do dia seguinte
        const inicioUtc = `${hoje}T03:00:00.000Z`;
        const amanha = new Date(new Date(`${hoje}T12:00:00Z`).getTime() + 86400000).toISOString().slice(0, 10);
        const fimUtc = `${amanha}T03:00:00.000Z`;
        q = q.gte("created_at", inicioUtc).lt("created_at", fimUtc);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    enabled: !!user,
  });

  // Legacy: registros diários antigos (antes dos webhooks) — mantém histórico
  const { data: legacyFats = [] } = useQuery({
    queryKey: ["faturamentos_legacy", periodo],
    queryFn: async () => {
      let q = supabase.from("faturamentos").select("*").order("data", { ascending: false });
      if (periodo === "mes") q = q.gte("data", inicioMes).lte("data", hoje);
      else if (periodo === "hoje") q = q.eq("data", hoje);
      const { data, error } = await q;
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`tx_dashboard_totals_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `user_id=eq.${user.id}`,
        },
        () => qc.invalidateQueries({ queryKey: ["transactions_dash"] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, user?.id]);

  // ============ Cálculos automáticos via webhooks + histórico legado ============
  const cashins = txs.filter((t: any) => t.type === "cashin");
  const refunds = txs.filter((t: any) => t.type === "refund");

  const brutoWebhooks = cashins.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
  const liquidoWebhooks = cashins.reduce(
    (s: number, t: any) => s + Number(t.liquid_amount ?? t.amount ?? 0),
    0
  );

  // Legado: registros antigos antes dos webhooks (sem dado de taxa de gateway → líquido = bruto)
  const brutoLegacy = legacyFats.reduce((s: number, f: any) => s + Number(f.faturamento_bruto || 0), 0);
  const reembolsosLegacy = legacyFats.reduce((s: number, f: any) => s + Number(f.reembolsos_count || 0), 0);

  const brutoRefunds = refunds.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);

  // Métricas principais agora calculadas no banco via RPC
  const m = metrics ?? {
    total_bruto: 0,
    total_liquido: 0,
    taxa_gateway: 0,
    taxa_bot: 0,
    total_taxas: 0,
    total_imposto: 0,
    total_anuncios: 0,
    total_reembolsos: 0,
    qtd_vendas: 0,
    qtd_reembolsos: 0,
    lucro_total: 0,
    roi: 0,
    taxa_media_pct: 0,
  };

  const totalBruto = Number(m.total_bruto);
  const totalLiquidoGateway = Number(m.total_liquido);
  const taxaGateway = Number(m.taxa_gateway);
  const taxaBot = Number(m.taxa_bot);
  const totalTaxas = Number(m.total_taxas);
  const totalImposto = Number(m.total_imposto);
  const totalAnuncios = Number(m.total_anuncios);
  const totalReembolsos = Number(m.total_reembolsos);
  const totalRepasses = cashins
    .filter((t: any) => t.employee_visible)
    .reduce((s: number, t: any) => s + Number(t.liquid_amount ?? t.amount ?? 0), 0);
  const qtdVendas = Number(m.qtd_vendas);
  const lucroTotal = Number(m.lucro_total);
  const roi = Number(m.roi);
  const taxaMedia = Number(m.taxa_media_pct);



  // Daily chart - vendas webhook (UTC-3) + registros legados
  const dailyMap = new Map<string, number>();
  cashins.forEach((t: any) => {
    if (!t.created_at) return;
    const sp = new Date(new Date(t.created_at).getTime() - 3 * 60 * 60 * 1000);
    const d = `${sp.getUTCFullYear()}-${String(sp.getUTCMonth() + 1).padStart(2, "0")}-${String(sp.getUTCDate()).padStart(2, "0")}`;
    dailyMap.set(d, (dailyMap.get(d) || 0) + Number(t.amount || 0));
  });
  refunds.forEach((t: any) => {
    if (!t.created_at) return;
    const sp = new Date(new Date(t.created_at).getTime() - 3 * 60 * 60 * 1000);
    const d = `${sp.getUTCFullYear()}-${String(sp.getUTCMonth() + 1).padStart(2, "0")}-${String(sp.getUTCDate()).padStart(2, "0")}`;
    dailyMap.set(d, (dailyMap.get(d) || 0) - Number(t.amount || 0));
  });
  legacyFats.forEach((f: any) => {
    if (!f.data) return;
    const d = String(f.data);
    dailyMap.set(d, (dailyMap.get(d) || 0) + Number(f.faturamento_bruto || 0));
  });
  const dailyData = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([data, bruto]) => ({ data: data.slice(5).replace("-", "/"), bruto }));

  // Monthly aggregation (webhooks + legado)
  const monthMap = new Map<string, { bruto: number; liquido: number; lucro: number }>();
  cashins.forEach((t: any) => {
    if (!t.created_at) return;
    const sp = new Date(new Date(t.created_at).getTime() - 3 * 60 * 60 * 1000);
    const k = `${sp.getUTCFullYear()}-${String(sp.getUTCMonth() + 1).padStart(2, "0")}`;
    const cur = monthMap.get(k) || { bruto: 0, liquido: 0, lucro: 0 };
    const bruto = Number(t.amount || 0);
    const liq = Number(t.liquid_amount ?? t.amount ?? 0);
    cur.bruto += bruto;
    cur.liquido += liq;
    cur.lucro += liq - taxaBotPorVenda;
    monthMap.set(k, cur);
  });
  refunds.forEach((t: any) => {
    if (!t.created_at) return;
    const sp = new Date(new Date(t.created_at).getTime() - 3 * 60 * 60 * 1000);
    const k = `${sp.getUTCFullYear()}-${String(sp.getUTCMonth() + 1).padStart(2, "0")}`;
    const cur = monthMap.get(k) || { bruto: 0, liquido: 0, lucro: 0 };
    const val = Number(t.amount || 0);
    cur.bruto -= val;
    cur.liquido -= val;
    cur.lucro -= val;
    monthMap.set(k, cur);
  });
  legacyFats.forEach((f: any) => {
    if (!f.data) return;
    const k = String(f.data).slice(0, 7);
    const cur = monthMap.get(k) || { bruto: 0, liquido: 0, lucro: 0 };
    const bruto = Number(f.faturamento_bruto || 0);
    cur.bruto += bruto;
    cur.liquido += bruto;
    cur.lucro += bruto;
    monthMap.set(k, cur);
  });
  // desconta imposto fixo uma vez por mês
  monthMap.forEach((v) => { v.lucro -= impostoMensal; });
  const monthly = Array.from(monthMap.entries()).slice(-6).map(([m, v]) => ({ mes: m, ...v }));

  // Faturamentos legados (mantém para metas)
  const { data: fats = [] } = useQuery({
    queryKey: ["faturamentos_metas"],
    queryFn: async () => {
      const { data } = await supabase.from("faturamentos").select("*").gte("data", inicioMes).lte("data", hoje);
      return data ?? [];
    },
  });

  const cards = [
    { label: "Total em Vendas Hoje", value: brl(totalBruto), icon: Activity, hint: "", color: "text-primary", isMain: false },
    { label: "Total em Vendas este Mês", value: brl(totalLiquidoGateway), icon: Wallet, hint: "", color: "text-primary", isMain: false },
    { label: "Saldo Disponível", value: brl(lucroTotal), icon: Trophy, hint: "Disponível para saque", color: "text-primary", isMain: true },
    { label: "ROI", value: roi.toFixed(2) + "x", icon: Target, hint: "Lucro / anúncios", color: roi >= 1 ? "text-success" : "text-destructive", isMain: false },
    { label: "Gastos c/ Anúncios", value: brl(totalAnuncios), icon: Megaphone, hint: totalRepasses > 0 ? `inclui ${brl(totalRepasses)} de repasses aprovados` : "", color: "text-destructive", isMain: false },
    { label: "Total de Taxas", value: brl(totalTaxas), icon: Percent, hint: pct(taxaMedia) + " do bruto", color: "text-warning", isMain: false },
    { label: "Vendas Reembolsadas", value: String(totalReembolsos), icon: RotateCcw, hint: "Total no período", color: "text-destructive", isMain: false },


  ];


  return (
    <AppLayout>
      <PageHeader 
        title={`${saudacao()}, ${profile?.full_name || "Guilherme"}`} 
        subtitle="Gerencie suas vendas e acompanhe seu lucro em tempo real"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {cards.map((c, i) => (
          <motion.div 
            key={c.label} 
            initial={{ opacity: 0, y: 12 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: i * 0.04 }}
            className={c.isMain ? "lg:col-span-1" : ""}
          >
            <Card className="p-6 bg-gradient-card border-white/5 hover:border-primary/40 hover:shadow-glow transition-all duration-500 group relative overflow-hidden h-full">
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="flex items-start justify-between relative z-10">
                <div className="space-y-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`size-10 rounded-xl bg-primary/10 grid place-items-center ${c.color} border border-primary/20 shadow-inner`}>
                      <c.icon className="size-5" />
                    </div>
                    <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">{c.label}</p>
                  </div>
                  <p className={`font-display text-4xl font-bold tracking-tight ${c.isMain ? "text-primary drop-shadow-[0_0_20px_rgba(var(--color-primary),0.6)]" : "text-foreground"}`}>
                    {c.value}
                  </p>
                  {c.hint && <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium mt-2">{c.hint}</p>}
                </div>
                {c.isMain && (
                  <Button size="sm" className="bg-white text-black hover:bg-white/90 rounded-full font-bold px-8 py-5 text-xs uppercase tracking-widest shadow-2xl transition-transform hover:scale-105 active:scale-95">
                    Sacar
                  </Button>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-8 lg:col-span-2 bg-gradient-card border-white/5 shadow-card overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 blur-[120px] -mr-48 -mt-48 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--color-primary),0.8)]" />
              <h3 className="font-display font-bold text-xl uppercase tracking-tight">Visão Geral de Vendas</h3>
            </div>
            <div className="flex bg-white/5 p-1 rounded-full border border-white/5 backdrop-blur-md">
              {["HOJE", "ONTEM", "7D", "14D", "30D"].map((t) => (
                <button key={t} className={`px-5 py-2 rounded-full text-[9px] font-bold tracking-[0.2em] transition-all duration-300 ${t === "HOJE" ? "bg-primary text-white shadow-[0_0_15px_rgba(var(--color-primary),0.5)]" : "text-muted-foreground hover:text-white"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="h-52 sm:h-72">

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

        <div className="space-y-4">
          <VendasTempoReal />
        </div>
      </div>

      <MetasSection qc={qc} fats={fats as any[]} brutoWebhook={(() => {
        const ini = startOfMonthISO();
        return txs
          .filter((t: any) => t.type === "cashin" && t.created_at)
          .filter((t: any) => {
            const sp = new Date(new Date(t.created_at).getTime() - 3 * 60 * 60 * 1000);
            const d = `${sp.getUTCFullYear()}-${String(sp.getUTCMonth() + 1).padStart(2, "0")}-${String(sp.getUTCDate()).padStart(2, "0")}`;
            return d >= ini;
          })
          .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
      })()} />

      <Card className="p-8 mt-8 bg-gradient-card border-white/5 shadow-card relative overflow-hidden group">
        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="text-center">
            <h3 className="font-display text-lg font-bold tracking-tight">Período de Visualização</h3>
            <p className="text-xs text-muted-foreground mt-1">Escolha o intervalo aplicado aos indicadores acima</p>
          </div>
          <div className="flex bg-white/5 p-1.5 rounded-2xl w-full max-w-md gap-1.5 border border-white/5 backdrop-blur-md">
            {([
              { key: "hoje", label: "Hoje" },
              { key: "mes", label: "Mês" },
              { key: "total", label: "Total" },
            ] as const).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setPeriodo(opt.key)}
                className={`flex-1 px-4 py-3 rounded-lg text-sm sm:text-base uppercase tracking-wider font-bold transition-all ${
                  periodo === opt.key
                    ? "bg-background text-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </Card>
    </AppLayout>
  );
}

function MetasSection({ qc, fats, brutoWebhook }: { qc: ReturnType<typeof useQueryClient>; fats: any[]; brutoWebhook: number }) {
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
  const sumFats = fats.filter((f: any) => f.data >= ini30 && f.data <= hoje).reduce((s: number, f: any) => s + Number(f.faturamento_bruto), 0);
  const atualMes = sumFats + brutoWebhook;

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fmtShort = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  const periodoMes = `${fmtShort(start)} - ${fmtShort(end)}`;

  const blocos = [
    { label: `Meta Mensal: ${periodoMes}`, atual: atualMes, meta: Number(metas?.meta_mensal || 0) },
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
