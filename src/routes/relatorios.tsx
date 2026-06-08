import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { brl, pct, fmtDate } from "@/lib/format";
import { Download } from "lucide-react";
import { useMemo } from "react";

export const Route = createFileRoute("/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — ScaleUp" }] }),
  component: Relatorios,
});

function Relatorios() {
  const { data: fechs = [] } = useQuery({
    queryKey: ["fechamentos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fechamentos").select("*").order("data_inicio", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  type Agg = { key: string; bruto: number; liquido: number; taxa: number; pct: number; imposto: number; lucro: number };
  const agrupar = (fn: (s: string) => string) => {
    const m = new Map<string, Agg>();
    for (const f of fechs) {
      const key = fn(String(f.data_inicio));
      const cur = m.get(key) || { key, bruto: 0, liquido: 0, taxa: 0, pct: 0, imposto: 0, lucro: 0 };
      cur.bruto += Number(f.faturamento_bruto);
      cur.liquido += Number(f.faturamento_liquido);
      cur.taxa += Number(f.taxa_valor);
      cur.imposto += Number(f.imposto);
      cur.lucro += Number(f.lucro_real);
      m.set(key, cur);
    }
    return Array.from(m.values()).map((a) => ({ ...a, pct: a.bruto > 0 ? (a.taxa / a.bruto) * 100 : 0 })).sort((a, b) => b.key.localeCompare(a.key));
  };

  const diario = useMemo(() => agrupar((s) => s), [fechs]);
  const mensal = useMemo(() => agrupar((s) => s.slice(0, 7)), [fechs]);
  const semanal = useMemo(() => agrupar((s) => {
    const d = new Date(s + "T00:00:00");
    const onejan = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil((((d.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
    return `${d.getFullYear()}-S${String(week).padStart(2, "0")}`;
  }), [fechs]);

  const exportPDF = async (titulo: string, rows: Agg[]) => {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF();
    doc.setFontSize(18); doc.text("ScaleUp — " + titulo, 14, 18);
    doc.setFontSize(10); doc.setTextColor(120); doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 14, 25);
    const totals = rows.reduce((s, r) => ({ bruto: s.bruto + r.bruto, liquido: s.liquido + r.liquido, taxa: s.taxa + r.taxa, imposto: s.imposto + r.imposto, lucro: s.lucro + r.lucro }), { bruto: 0, liquido: 0, taxa: 0, imposto: 0, lucro: 0 });
    autoTable(doc, {
      startY: 32,
      head: [["Período", "Bruto", "Líquido", "Taxa", "%", "Imposto", "Lucro"]],
      body: rows.map((r) => [r.key, brl(r.bruto), brl(r.liquido), brl(r.taxa), pct(r.pct), brl(r.imposto), brl(r.lucro)]),
      foot: [["Total", brl(totals.bruto), brl(totals.liquido), brl(totals.taxa), pct(totals.bruto ? (totals.taxa/totals.bruto)*100 : 0), brl(totals.imposto), brl(totals.lucro)]],
      headStyles: { fillColor: [30, 130, 100] },
      footStyles: { fillColor: [40, 40, 40], textColor: 255 },
      styles: { fontSize: 9 },
    });
    doc.save(`financeflow-${titulo.toLowerCase()}.pdf`);
  };

  return (
    <AppLayout>
      <PageHeader title="Relatórios" subtitle="Análise consolidada por período" />
      <div className="space-y-5">
        <Relatorio titulo="Relatório Diário" rows={diario} format={(k) => fmtDate(k)} onExport={() => exportPDF("Diário", diario)} />
        <Relatorio titulo="Relatório Semanal" rows={semanal} format={(k) => k} onExport={() => exportPDF("Semanal", semanal)} />
        <Relatorio titulo="Relatório Mensal" rows={mensal} format={(k) => k} onExport={() => exportPDF("Mensal", mensal)} />
      </div>
    </AppLayout>
  );
}

function Relatorio({ titulo, rows, format, onExport }: { titulo: string; rows: any[]; format: (k: string) => string; onExport: () => void }) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-lg">{titulo}</h3>
        <Button variant="outline" size="sm" onClick={onExport} disabled={rows.length === 0}>
          <Download className="size-4 mr-2" /> Exportar PDF
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Sem fechamentos registrados.</p>
      ) : (
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="text-left py-3 font-medium">Período</th>
                <th className="text-right py-3 font-medium">Bruto</th>
                <th className="text-right py-3 font-medium">Líquido</th>
                <th className="text-right py-3 font-medium">Taxa</th>
                <th className="text-right py-3 font-medium">%</th>
                <th className="text-right py-3 font-medium">Imposto</th>
                <th className="text-right py-3 font-medium">Lucro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.key} className="hover:bg-muted/40">
                  <td className="py-3 font-medium">{format(r.key)}</td>
                  <td className="text-right tabular-nums">{brl(r.bruto)}</td>
                  <td className="text-right tabular-nums">{brl(r.liquido)}</td>
                  <td className="text-right tabular-nums text-warning">{brl(r.taxa)}</td>
                  <td className="text-right tabular-nums">{pct(r.pct)}</td>
                  <td className="text-right tabular-nums text-chart-5">{brl(r.imposto)}</td>
                  <td className="text-right tabular-nums font-semibold text-success">{brl(r.lucro)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
