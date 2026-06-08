import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Copy, CheckCircle2, Link2, Power, Trash2, Zap } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/integracoes")({
  head: () => ({ meta: [{ title: "Integrações — ScaleHot" }] }),
  component: IntegracoesPage,
});

type Gateway = {
  id: string;
  name: string;
  desc: string;
  color: string;
  instructions: string[];
};

const GATEWAYS: Gateway[] = [
  {
    id: "syncpay",
    name: "Syncpay",
    desc: "Pix e checkout para infoprodutos",
    color: "from-emerald-500/20 to-emerald-500/0",
    instructions: [
      "Acesse o painel da Syncpay e abra Webhooks.",
      "Crie um novo webhook (ex.: \"scalehot\").",
      "Cole a URL acima no campo \"Uri alvo do disparo\".",
      "Salve. As vendas começarão a entrar automaticamente.",
    ],
  },
  {
    id: "wiinpay",
    name: "Wiinpay",
    desc: "Gateway nacional de pagamentos",
    color: "from-sky-500/20 to-sky-500/0",
    instructions: [
      "No painel Wiinpay, acesse Configurações → Webhooks.",
      "Adicione um novo endpoint com a URL acima.",
      "Selecione os eventos payment.approved e payment.refunded.",
      "Salve para ativar a integração.",
    ],
  },
  {
    id: "hotmart",
    name: "Hotmart",
    desc: "Marketplace de produtos digitais",
    color: "from-orange-500/20 to-orange-500/0",
    instructions: [
      "Acesse Ferramentas → Webhook na Hotmart.",
      "Crie um novo webhook 2.0 com a URL acima.",
      "Marque os eventos PURCHASE_APPROVED e PURCHASE_REFUNDED.",
      "Confirme para começar a receber vendas.",
    ],
  },
  {
    id: "kiwify",
    name: "Kiwify",
    desc: "Vendas e afiliados",
    color: "from-purple-500/20 to-purple-500/0",
    instructions: [
      "No painel Kiwify, vá em Apps → Webhooks.",
      "Cole a URL acima e selecione \"Compra aprovada\".",
      "Salve para ativar.",
    ],
  },
  {
    id: "monetizze",
    name: "Monetizze",
    desc: "Plataforma de infoprodutos",
    color: "from-yellow-500/20 to-yellow-500/0",
    instructions: [
      "Acesse Configurações → Postback na Monetizze.",
      "Adicione a URL acima como Postback Global.",
      "Selecione os eventos de Venda Finalizada e Reembolso.",
      "Salve.",
    ],
  },
  {
    id: "pepper",
    name: "Pepper",
    desc: "Pagamentos via Pix e cartão",
    color: "from-rose-500/20 to-rose-500/0",
    instructions: [
      "No painel da Pepper, vá em Integrações → Webhooks.",
      "Cole a URL acima.",
      "Ative os eventos de pagamento aprovado e reembolso.",
    ],
  },
  {
    id: "custom",
    name: "Webhook Personalizado",
    desc: "Qualquer plataforma com webhook",
    color: "from-slate-500/20 to-slate-500/0",
    instructions: [
      "Envie um POST JSON para a URL acima.",
      "Inclua os campos: amount, transaction_id, client_name (opcional), liquid_amount (opcional).",
      "O ScaleHot reconhece automaticamente como CashIn.",
    ],
  },
];

function buildWebhookUrl(userId: string | undefined) {
  if (!userId) return "";
  // Always use the stable production domain so webhooks keep working after publish
  // and don't break when accessed from a preview/dev URL.
  const PRODUCTION_ORIGIN = "https://scalehot.lovable.app";
  return `${PRODUCTION_ORIGIN}/api/public/webhook-receiver?user_id=${userId}`;
}

function CopyButton({ value, label = "Copiar" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          toast.success("URL copiada!");
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error("Não foi possível copiar");
        }
      }}
      className="gap-2"
    >
      {copied ? <CheckCircle2 className="size-4 text-success" /> : <Copy className="size-4" />}
      {copied ? "Copiado" : label}
    </Button>
  );
}

function IntegracoesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const url = buildWebhookUrl(user?.id);
  const [openGateway, setOpenGateway] = useState<Gateway | null>(null);
  const [customName, setCustomName] = useState("");

  const { data: integrations = [] } = useQuery({
    queryKey: ["user_integrations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_integrations" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    enabled: !!user,
  });

  const activate = useMutation({
    mutationFn: async ({ gateway, name }: { gateway: string; name: string }) => {
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase.from("user_integrations" as any).insert({
        user_id: user.id,
        gateway,
        name,
        status: "active",
        webhook_url: url,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Integração ativada!");
      qc.invalidateQueries({ queryKey: ["user_integrations"] });
      setOpenGateway(null);
      setCustomName("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("user_integrations" as any)
        .update({ status: status === "active" ? "inactive" : "active" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user_integrations"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_integrations" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Integração removida");
      qc.invalidateQueries({ queryKey: ["user_integrations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activeMap = useMemo(() => {
    const m = new Map<string, any>();
    for (const i of integrations) if (i.status === "active") m.set(i.gateway, i);
    return m;
  }, [integrations]);

  return (
    <AppLayout>
      <PageHeader
        title="Integrações"
        subtitle="Conecte seus gateways e receba vendas automaticamente no dashboard"
      />

      {/* URL única do usuário */}
      <Card className="p-6 bg-gradient-card mb-8 border-primary/30">
        <div className="flex items-center gap-2 mb-2">
          <Link2 className="size-5 text-primary" />
          <h3 className="font-display font-bold text-lg">Sua URL de Webhook</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Cole essa URL no painel do seu gateway para receber vendas automaticamente.
        </p>
        <div className="flex items-stretch gap-2 flex-col sm:flex-row">
          <code className="flex-1 px-3 py-2.5 rounded-md bg-muted text-xs sm:text-sm break-all border border-border font-mono">
            {url || "Faça login para gerar sua URL"}
          </code>
          {url && <CopyButton value={url} label="Copiar URL" />}
        </div>
      </Card>

      {/* Gateways disponíveis */}
      <h2 className="font-display text-xl font-bold tracking-tight mb-4">Gateways disponíveis</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {GATEWAYS.map((g, i) => {
          const active = activeMap.has(g.id);
          return (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card className={`p-5 h-full bg-gradient-to-br ${g.color} relative overflow-hidden`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="size-10 rounded-xl bg-background grid place-items-center border border-border">
                    <Zap className="size-5 text-primary" />
                  </div>
                  <span
                    className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                      active
                        ? "bg-success/15 text-success border border-success/30"
                        : "bg-muted text-muted-foreground border border-border"
                    }`}
                  >
                    {active ? "Ativo" : "Inativo"}
                  </span>
                </div>
                <h3 className="font-display font-bold text-lg">{g.name}</h3>
                <p className="text-xs text-muted-foreground mb-4 min-h-[2.5em]">{g.desc}</p>
                <Button
                  size="sm"
                  variant={active ? "outline" : "default"}
                  onClick={() => {
                    setCustomName(g.name);
                    setOpenGateway(g);
                  }}
                  className="w-full"
                >
                  {active ? "Ver instruções" : "Conectar"}
                </Button>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Integrações ativas */}
      <h2 className="font-display text-xl font-bold tracking-tight mb-4">Integrações ativas</h2>
      <Card className="overflow-hidden">
        {integrations.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma integração ativada ainda. Escolha um gateway acima para começar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Gateway</th>
                  <th className="text-left px-4 py-3">Nome</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Conectado em</th>
                  <th className="text-right px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {integrations.map((i: any) => (
                  <tr key={i.id} className="border-t border-border">
                    <td className="px-4 py-3 capitalize font-medium">{i.gateway}</td>
                    <td className="px-4 py-3">{i.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                          i.status === "active"
                            ? "bg-success/15 text-success"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {i.status === "active" ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(i.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleStatus.mutate({ id: i.id, status: i.status })}
                          title={i.status === "active" ? "Desativar" : "Ativar"}
                        >
                          <Power className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => remove.mutate(i.id)}
                          title="Remover"
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal */}
      <Dialog open={!!openGateway} onOpenChange={(o) => !o && setOpenGateway(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Conectar {openGateway?.name}</DialogTitle>
            <DialogDescription>
              Cole a URL abaixo no painel do gateway. Quando uma venda for aprovada, ela aparece automaticamente no seu dashboard.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Sua URL de Webhook</Label>
              <div className="flex gap-2 mt-1">
                <code className="flex-1 px-3 py-2 rounded-md bg-muted text-xs break-all border border-border font-mono">
                  {url}
                </code>
                <CopyButton value={url} />
              </div>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Passo a passo</Label>
              <ol className="mt-2 space-y-1.5 text-sm list-decimal list-inside text-muted-foreground">
                {openGateway?.instructions.map((step, idx) => (
                  <li key={idx} className="pl-1">{step}</li>
                ))}
              </ol>
            </div>

            <div>
              <Label htmlFor="conn-name">Nome da conexão</Label>
              <Input
                id="conn-name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Ex: Conta principal"
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenGateway(null)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!openGateway) return;
                const name = customName.trim() || openGateway.name;
                activate.mutate({ gateway: openGateway.id, name });
              }}
              disabled={activate.isPending}
              className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
            >
              <Zap className="size-4 mr-2" /> Ativar integração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
