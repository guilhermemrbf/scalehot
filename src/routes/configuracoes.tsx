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
import { useAuth } from "@/lib/auth";
import { NotificationsCard } from "@/components/NotificationsCard";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — ScaleHot" }] }),
  component: Configuracoes,
});

function Configuracoes() {
  const { user } = useAuth();
  const qc = useQueryClient();
  
  const { data: config } = useQuery({
    queryKey: ["configuracoes"],
    queryFn: async () => (await supabase.from("configuracoes").select("*").limit(1).single()).data,
  });

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

  const [imposto, setImposto] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => { 
    if (config) setImposto(String(config.imposto_fixo)); 
  }, [config]);

  useEffect(() => {
    if (profile) setFullName(profile.full_name || "");
  }, [profile]);

  const saveConfig = useMutation({
    mutationFn: async () => {
      if (!config) return;
      const v = parseFloat(imposto.replace(",", "."));
      if (isNaN(v) || v < 0) throw new Error("Valor inválido.");
      const { error } = await supabase.from("configuracoes").update({ imposto_fixo: v, updated_at: new Date().toISOString() }).eq("id", config.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Imposto atualizado."); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Perfil atualizado."); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const LOGO_URL = "https://ynvrijkuampxpsmshftm.supabase.co/storage/v1/object/public/prompt-images/uploads/1780550473717-76e036f0-c55c-4e17-acd2-d98b1b0f50d3.jpeg";

  return (
    <AppLayout>
      <PageHeader title="Configurações" subtitle="Gerencie seu perfil e ajustes do sistema" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Perfil */}
        <Card className="p-6 bg-gradient-card">
          <div className="flex flex-col items-center mb-6">
            <div className="size-24 rounded-full overflow-hidden bg-muted flex items-center justify-center border-2 border-primary shadow-glow">
              <img src={LOGO_URL} alt="ScaleHot" className="w-full h-full object-cover" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">ScaleHot</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Seu Nome</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Como quer ser chamado?" />
            </div>
            <Button onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
              <Save className="size-4 mr-2" /> Salvar Perfil
            </Button>
          </div>
        </Card>

        {/* Sistema */}
        <Card className="p-6 bg-gradient-card">
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
          <Button onClick={() => saveConfig.mutate()} disabled={saveConfig.isPending} className="mt-5 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
            <Save className="size-4 mr-2" /> Salvar Imposto
          </Button>
        </Card>

        <NotificationsCard />
      </div>

    </AppLayout>
  );
}
