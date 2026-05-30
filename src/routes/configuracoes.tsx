import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Landmark } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — FinanceFlow" }] }),
  component: Configuracoes,
});

function Configuracoes() {
  const qc = useQueryClient();
  const { data: config } = useQuery({
    queryKey: ["configuracoes"],
    queryFn: async () => (await supabase.from("configuracoes").select("*").limit(1).single()).data,
  });
  const [imposto, setImposto] = useState("");
  useEffect(() => { if (config) setImposto(String(config.imposto_fixo)); }, [config]);

  const save = useMutation({
    mutationFn: async () => {
      if (!config) return;
      const v = parseFloat(imposto.replace(",", "."));
      if (isNaN(v) || v < 0) throw new Error("Valor inválido.");
      const { error } = await supabase.from("configuracoes").update({ imposto_fixo: v, updated_at: new Date().toISOString() }).eq("id", config.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Configurações atualizadas."); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppLayout>
      <PageHeader title="Configurações" subtitle="Ajustes globais do aplicativo" />
      <Card className="p-6 max-w-xl bg-gradient-card">
        <div className="flex items-center gap-3 mb-5">
          <div className="size-10 rounded-xl bg-accent grid place-items-center"><Landmark className="size-5 text-accent-foreground" /></div>
          <div>
            <h3 className="font-display font-semibold">Imposto Fixo</h3>
            <p className="text-xs text-muted-foreground">Descontado automaticamente em todos os fechamentos</p>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Valor (R$)</Label>
          <Input inputMode="decimal" value={imposto} onChange={(e) => setImposto(e.target.value)} className="text-xl font-display font-semibold h-12" />
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending} className="mt-5 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
          <Save className="size-4 mr-2" /> Salvar
        </Button>
      </Card>
    </AppLayout>
  );
}
