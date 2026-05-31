import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { brl, fmtDate, todayISO, startOfMonthISO } from "@/lib/format";
import { useState } from "react";
import { toast } from "sonner";
import { Megaphone, Trash2, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/anuncios")({
  head: () => ({ meta: [{ title: "Gastos com Anúncios — FinanceFlow" }] }),
  component: Anuncios,
});

function Anuncios() {
  const qc = useQueryClient();
  const [data, setData] = useState(todayISO());
  const [valor, setValor] = useState("");
  const [plataforma, setPlataforma] = useState("");
  const [descricao, setDescricao] = useState("");

  const { data: lista = [] } = useQuery({
    queryKey: ["gastos_anuncios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gastos_anuncios" as any)
        .select("*")
        .order("data", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const mut = useMutation({
    mutationFn: async () => {
      const v = parseFloat(valor.replace(",", "."));
      if (!data || !v || v <= 0) throw new Error("Informe data e valor válidos.");
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão expirada.");
      const { error } = await supabase.from("gastos_anuncios" as any).insert({
        data,
        valor: v,
        plataforma: plataforma || null,
        descricao: descricao || null,
        user_id: u.user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Gasto registrado!");
      setValor(""); setPlataforma(""); setDescricao("");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gastos_anuncios" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Gasto removido."); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const iniMes = startOfMonthISO();
  const hoje = todayISO();
  const totalMes = lista.filter((g) => g.data >= iniMes && g.data <= hoje).reduce((s, g) => s + Number(g.valor), 0);
  const totalGeral = lista.reduce((s, g) => s + Number(g.valor), 0);

  return (
    <AppLayout>
      <PageHeader title="Gastos com Anúncios" subtitle="Registre o investimento em publicidade e acompanhe o impacto no lucro" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-5 bg-gradient-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Gasto do Mês</p>
                <p className="font-display text-2xl font-bold tracking-tight">{brl(totalMes)}</p>
                <p className="text-xs text-muted-foreground">Investimento atual</p>
              </div>
              <div className="size-10 rounded-xl bg-muted grid place-items-center text-destructive">
                <TrendingDown className="size-5" />
              </div>
            </div>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="p-5 bg-gradient-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Total Acumulado</p>
                <p className="font-display text-2xl font-bold tracking-tight">{brl(totalGeral)}</p>
                <p className="text-xs text-muted-foreground">{lista.length} lançamentos</p>
              </div>
              <div className="size-10 rounded-xl bg-muted grid place-items-center text-warning">
                <Megaphone className="size-5" />
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <Card className="p-6 lg:col-span-2 bg-gradient-card">
          <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="data">Data</Label>
              <Input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valor">Valor Investido (R$)</Label>
              <Input id="valor" inputMode="decimal" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} required className="text-2xl font-display font-semibold h-14" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plataforma">Plataforma</Label>
              <Input id="plataforma" placeholder="Meta Ads, Google Ads, TikTok…" value={plataforma} onChange={(e) => setPlataforma(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição (opcional)</Label>
              <Input id="descricao" placeholder="Campanha, observação…" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </div>
            <Button type="submit" disabled={mut.isPending} className="w-full h-12 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
              <Megaphone className="size-4 mr-2" />
              {mut.isPending ? "Salvando..." : "Registrar Gasto"}
            </Button>
          </form>
        </Card>

        <Card className="p-6 lg:col-span-3">
          <h3 className="font-display font-semibold mb-4">Histórico de Gastos</h3>
          {lista.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhum gasto registrado ainda.</p>
          ) : (
            <div className="divide-y divide-border">
              {lista.map((g) => (
                <div key={g.id} className="flex items-center justify-between py-3 gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{fmtDate(g.data)} {g.plataforma && <span className="text-muted-foreground">· {g.plataforma}</span>}</p>
                    <p className="text-xs text-muted-foreground truncate">{g.descricao || "Sem descrição"}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <p className="font-display font-semibold text-lg text-destructive">- {brl(Number(g.valor))}</p>
                    <button onClick={() => del.mutate(g.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition" aria-label="Remover">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
