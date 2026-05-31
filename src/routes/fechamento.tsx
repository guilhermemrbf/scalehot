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
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Calculator, Save } from "lucide-react";

type Period = "hoje" | "semana" | "mes" | "custom";

export const Route = createFileRoute("/fechamento")({
  head: () => ({ meta: [{ title: "Fechamento de Caixa — FinanceFlow" }] }),
  component: Fechamento,
});

function Fechamento() {
  const qc = useQueryClient();
  const [period, setPeriod] = useState<Period>("hoje");
  const [inicio, setInicio] = useState(todayISO());
  const [fim, setFim] = useState(todayISO());
  const [liquidoInput, setLiquidoInput] = useState("");

  const range = useMemo(() => {
    if (period === "hoje") return { ini: todayISO(), end: todayISO() };
    if (period === "semana") return { ini: startOfWeekISO(), end: todayISO() };
    if (period === "mes") return { ini: startOfMonthISO(), end: todayISO() };
    return { ini: inicio, end: fim };
  }, [period, inicio, fim]);

  const { data: fats = [] } = useQuery({
    queryKey: ["faturamentos", "periodo", range.ini, range.end],
    queryFn: async () => {
      const { data, error } = await supabase.from("faturamentos").select("*")
        .gte("data", range.ini).lte("data", range.end);
      if (error) throw error;
      return data;
    },
  });

  const { data: config } = useQuery({
    queryKey: ["configuracoes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("configuracoes").select("*").limit(1).single();
      if (error) throw error;
      return data;
    },
  });

  const bruto = fats.reduce((s, f) => s + Number(f.faturamento_bruto), 0);
  const liquido = parseFloat(liquidoInput.replace(",", ".")) || 0;
  const taxa = Math.max(0, bruto - liquido);
  const taxaPct = bruto > 0 ? (taxa / bruto) * 100 : 0;
  const imposto = Number(config?.imposto_fixo || 0);
  const lucro = liquido - imposto;

  const salvar = useMutation({
    mutationFn: async () => {
      if (bruto <= 0) throw new Error("Não há faturamento bruto no período.");
      if (liquido <= 0) throw new Error("Informe o valor líquido recebido.");
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão expirada.");
      const { error } = await supabase.from("fechamentos").insert({
        data_inicio: range.ini, data_fim: range.end,
        faturamento_bruto: bruto, faturamento_liquido: liquido,
        taxa_valor: taxa, taxa_percentual: Number(taxaPct.toFixed(2)),
        imposto, lucro_real: lucro,
        user_id: u.user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Fechamento registrado!");
      setLiquidoInput("");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const periods: { id: Period; label: string }[] = [
    { id: "hoje", label: "Hoje" },
    { id: "semana", label: "Esta Semana" },
    { id: "mes", label: "Este Mês" },
    { id: "custom", label: "Personalizado" },
  ];

  return (
    <AppLayout>
      <PageHeader title="Fechamento de Caixa" subtitle="Calcule taxas, impostos e lucro real automaticamente" />

      <Card className="p-6 mb-5">
        <div className="flex flex-wrap gap-2 mb-4">
          {periods.map((p) => (
            <button key={p.id} onClick={() => setPeriod(p.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                period === p.id ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}>{p.label}</button>
          ))}
        </div>
        {period === "custom" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Data início</Label><Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} /></div>
            <div className="space-y-2"><Label>Data fim</Label><Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} /></div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-6 bg-gradient-card">
          <h3 className="font-display font-semibold mb-1">Resumo do Período</h3>
          <p className="text-xs text-muted-foreground mb-5">{range.ini} → {range.end} · {fats.length} lançamento(s)</p>

          <div className="space-y-4">
            <Linha label="Faturamento Bruto" value={brl(bruto)} big />
            <div className="space-y-2 pt-2">
              <Label htmlFor="liquido">Faturamento Líquido Recebido</Label>
              <Input id="liquido" inputMode="decimal" placeholder="0,00" value={liquidoInput}
                onChange={(e) => setLiquidoInput(e.target.value)} className="text-xl font-display font-semibold h-12" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-display font-semibold mb-5 flex items-center gap-2"><Calculator className="size-4 text-primary" /> Cálculos Automáticos</h3>
          <div className="space-y-3">
            <Linha label="Valor das Taxas" value={brl(taxa)} accent="text-warning" />
            <Linha label="Percentual de Taxas" value={pct(taxaPct)} accent="text-warning" />
            <Linha label="Imposto Fixo" value={brl(imposto)} accent="text-chart-5" />
            <div className="pt-3 mt-3 border-t border-border">
              <Linha label="Lucro Real" value={brl(lucro)} big accent={lucro >= 0 ? "text-success" : "text-destructive"} />
            </div>
          </div>
          <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}
            className="w-full mt-6 h-12 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
            <Save className="size-4 mr-2" />
            {salvar.isPending ? "Salvando..." : "Registrar Fechamento"}
          </Button>
        </Card>
      </div>
    </AppLayout>
  );
}

function Linha({ label, value, big, accent }: { label: string; value: string; big?: boolean; accent?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`font-display font-semibold ${big ? "text-2xl" : "text-base"} ${accent || ""}`}>{value}</span>
    </div>
  );
}
