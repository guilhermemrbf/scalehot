import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { brl, pct, fmtDate } from "@/lib/format";
import { Trash2, Pencil, X, Check } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/historico")({
  head: () => ({ meta: [{ title: "Histórico — ScaleHot" }] }),
  component: Historico,
});

function Historico() {
  const qc = useQueryClient();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const { data: fats = [] } = useQuery({
    queryKey: ["faturamentos", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("faturamentos").select("*").order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const { data: config } = useQuery({
    queryKey: ["configuracoes"],
    queryFn: async () => (await supabase.from("configuracoes").select("*").limit(1).single()).data,
  });

  const filtered = useMemo(() => fats.filter((f) => (!from || f.data >= from) && (!to || f.data <= to)), [fats, from, to]);
  const imposto = Number(config?.imposto_fixo || 0);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("faturamentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Removido."); qc.invalidateQueries(); },
  });
  const upd = useMutation({
    mutationFn: async ({ id, v }: { id: string; v: number }) => {
      const { error } = await supabase.from("faturamentos").update({ faturamento_bruto: v }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Atualizado."); setEditId(null); qc.invalidateQueries(); },
  });

  return (
    <AppLayout>
      <PageHeader title="Histórico" subtitle="Todos os lançamentos diários" />

      <Card className="p-5 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div className="space-y-2"><Label>De</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="space-y-2"><Label>Até</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <Button variant="outline" onClick={() => { setFrom(""); setTo(""); }}>Limpar filtro</Button>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-12 text-center">Nenhum registro encontrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="text-left py-3 px-5 font-medium">Data</th>
                  <th className="text-right py-3 px-5 font-medium">Bruto</th>
                  <th className="text-right py-3 px-5 font-medium">Imposto</th>
                  <th className="text-right py-3 px-5 font-medium">Estimativa Lucro*</th>
                  <th className="text-right py-3 px-5 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((r) => {
                  const v = Number(r.faturamento_bruto);
                  return (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="py-3 px-5 font-medium">{fmtDate(r.data)}</td>
                      <td className="py-3 px-5 text-right tabular-nums">
                        {editId === r.id ? (
                          <Input className="h-8 max-w-[140px] ml-auto text-right" value={editValue} onChange={(e) => setEditValue(e.target.value)} />
                        ) : brl(v)}
                      </td>
                      <td className="py-3 px-5 text-right tabular-nums text-chart-5">{brl(imposto)}</td>
                      <td className="py-3 px-5 text-right tabular-nums text-success">{brl(v - imposto)}</td>
                      <td className="py-3 px-5 text-right">
                        <div className="inline-flex gap-1">
                          {editId === r.id ? (
                            <>
                              <Button size="icon" variant="ghost" onClick={() => upd.mutate({ id: r.id, v: parseFloat(editValue.replace(",", ".")) })}><Check className="size-4 text-success" /></Button>
                              <Button size="icon" variant="ghost" onClick={() => setEditId(null)}><X className="size-4" /></Button>
                            </>
                          ) : (
                            <>
                              <Button size="icon" variant="ghost" onClick={() => { setEditId(r.id); setEditValue(String(v)); }}><Pencil className="size-4" /></Button>
                              <Button size="icon" variant="ghost" onClick={() => del.mutate(r.id)}><Trash2 className="size-4 text-destructive" /></Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="text-xs text-muted-foreground mt-3">*Estimativa simples (bruto − imposto). Cálculo de taxas é feito no Fechamento.</p>
    </AppLayout>
  );
}
