import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { brl, fmtDate, todayISO } from "@/lib/format";
import { useState } from "react";
import { toast } from "sonner";
import { PlusCircle, Calendar } from "lucide-react";

export const Route = createFileRoute("/registro")({
  head: () => ({ meta: [{ title: "Registro Diário — ScaleHot" }] }),
  component: Registro,
});

function Registro() {
  const qc = useQueryClient();
  const [data, setData] = useState(todayISO());
  const [bruto, setBruto] = useState("");

  const { data: recentes = [] } = useQuery({
    queryKey: ["faturamentos", "recentes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("faturamentos").select("*").order("data", { ascending: false }).limit(10);
      if (error) throw error;
      return data;
    },
  });

  const mut = useMutation({
    mutationFn: async () => {
      const value = parseFloat(bruto.replace(",", "."));
      if (!data || !value || value <= 0) throw new Error("Informe data e valor válidos.");
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão expirada.");
      const { error } = await supabase.from("faturamentos").insert({ data, faturamento_bruto: value, user_id: u.user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registro salvo com sucesso!");
      setBruto("");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppLayout>
      <PageHeader title="Registro Diário" subtitle="Lance o faturamento bruto do dia em segundos" />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <Card className="p-6 lg:col-span-2 bg-gradient-card">
          <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="data">Data</Label>
              <Input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bruto">Faturamento Bruto (R$)</Label>
              <Input id="bruto" inputMode="decimal" placeholder="0,00" value={bruto} onChange={(e) => setBruto(e.target.value)} required className="text-2xl font-display font-semibold h-14" />
            </div>
            <Button type="submit" disabled={mut.isPending} className="w-full h-12 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
              <PlusCircle className="size-4 mr-2" />
              {mut.isPending ? "Salvando..." : "Salvar Registro"}
            </Button>
          </form>
        </Card>

        <Card className="p-6 lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold">Últimos Registros</h3>
            <Calendar className="size-4 text-muted-foreground" />
          </div>
          {recentes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhum registro ainda.</p>
          ) : (
            <div className="divide-y divide-border">
              {recentes.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-sm">{fmtDate(r.data)}</p>
                    <p className="text-xs text-muted-foreground">Lançamento diário</p>
                  </div>
                  <p className="font-display font-semibold text-lg">{brl(Number(r.faturamento_bruto))}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
