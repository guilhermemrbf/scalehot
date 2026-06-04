import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Landmark, User, Camera } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

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
  const [uploading, setUploading] = useState(false);

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

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Você deve selecionar uma imagem para fazer o upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user?.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

      const { error: updateError } = await supabase.from('profiles').update({
        avatar_url: publicUrl,
      }).eq('id', user?.id);

      if (updateError) throw updateError;

      toast.success('Foto de perfil atualizada!');
      qc.invalidateQueries();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader title="Configurações" subtitle="Gerencie seu perfil e ajustes do sistema" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Perfil */}
        <Card className="p-6 bg-gradient-card">
          <div className="flex flex-col items-center mb-6">
            <div className="relative group">
              <div className="size-24 rounded-full overflow-hidden bg-muted flex items-center justify-center border-2 border-primary shadow-glow">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="size-12 text-muted-foreground" />
                )}
              </div>
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer">
                <Camera className="size-6 text-white" />
                <input type="file" className="hidden" accept="image/*" onChange={uploadAvatar} disabled={uploading} />
              </label>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{uploading ? "Enviando..." : "Clique para alterar a foto"}</p>
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
      </div>
    </AppLayout>
  );
}
