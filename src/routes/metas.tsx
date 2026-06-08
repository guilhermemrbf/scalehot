import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { brl, todayISO, startOfMonthISO, startOfWeekISO } from "@/lib/format";
import { Target, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export const Route = createFileRoute("/metas")({
  head: () => ({ meta: [{ title: "Metas — ScaleUp" }] }),
  component: Metas,
});

function Metas() {
  const qc = useQueryClient();
  const { data: metas } = useQuery({
    queryKey: ["metas"],
    queryFn: async () => (await supabase.from("metas").select("*").limit(1).single()).data,
  });
  const { data: fats = [] } = useQuery({
    queryKey: ["faturamentos"],
    queryFn: async () => (await supabase.from("faturamentos").select("*")).data || [],
  });

  const [diaria, setDiaria] = useState("");
  const [semanal, setSemanal] = useState("");
  const [mensal, setMensal] = useState("");

  useEffect(() => {
    if (metas) {
      setDiaria(String(metas.meta_diaria));
      setSemanal(String(metas.meta_semanal));
      setMensal(String(metas.meta_mensal));
    }
  }, [metas]);

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
    onSuccess: () => { toast.success("Metas atualizadas."); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const hoje = todayISO();
  const ini7 = startOfWeekISO();
  const ini30 = startOfMonthISO();
  const sum = (since: string) => fats.filter((f: any) => f.data >= since && f.data <= hoje).reduce((s: number, f: any) => s + Number(f.faturamento_bruto), 0);

  const blocos = [
    { label: "Meta Diária", atual: sum(hoje), meta: Number(metas?.meta_diaria || 0) },
    { label: "Meta Semanal", atual: sum(ini7), meta: Number(metas?.meta_semanal || 0) },
    { label: "Meta Mensal", atual: sum(ini30), meta: Number(metas?.meta_mensal || 0) },
  ];

  return (
    <AppLayout>
      <PageHeader title="Metas" subtitle="Acompanhe seu progresso em tempo real" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
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

      <Card className="p-6">
        <h3 className="font-display font-semibold mb-4">Definir Metas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2"><Label>Meta Diária (R$)</Label><Input inputMode="decimal" value={diaria} onChange={(e) => setDiaria(e.target.value)} /></div>
          <div className="space-y-2"><Label>Meta Semanal (R$)</Label><Input inputMode="decimal" value={semanal} onChange={(e) => setSemanal(e.target.value)} /></div>
          <div className="space-y-2"><Label>Meta Mensal (R$)</Label><Input inputMode="decimal" value={mensal} onChange={(e) => setMensal(e.target.value)} /></div>
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending} className="mt-5 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
          <Save className="size-4 mr-2" /> Salvar Metas
        </Button>
      </Card>
    </AppLayout>
  );
}
