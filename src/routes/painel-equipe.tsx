import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { brl } from "@/lib/format";
import { Copy, Save, Users, Link as LinkIcon, Eye, EyeOff } from "lucide-react";
import {
  getEmployeePanelPassword,
  setEmployeePanelPassword,
  listAdminTransactions,
  setTransactionVisibility,
  bulkSetVisibility,
} from "@/lib/employee-panel.functions";

export const Route = createFileRoute("/painel-equipe")({
  head: () => ({ meta: [{ title: "Painel da Equipe — ScaleUp" }] }),
  component: PainelEquipeAdmin,
});

function PainelEquipeAdmin() {
  const qc = useQueryClient();
  const loadPwd = useServerFn(getEmployeePanelPassword);
  const savePwd = useServerFn(setEmployeePanelPassword);
  const listTx = useServerFn(listAdminTransactions);
  const setVis = useServerFn(setTransactionVisibility);
  const bulk = useServerFn(bulkSetVisibility);

  const { data: pwd } = useQuery({ queryKey: ["employee-panel-pwd"], queryFn: () => loadPwd() });
  const { data: txs = [] } = useQuery({ queryKey: ["employee-panel-admin-tx"], queryFn: () => listTx() });

  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [filter, setFilter] = useState<"all" | "visible" | "hidden">("all");

  useEffect(() => { if (pwd?.password) setPassword(pwd.password); }, [pwd?.password]);

  const savePwdMut = useMutation({
    mutationFn: async () => savePwd({ data: { password } }),
    onSuccess: () => { toast.success("Senha salva."); qc.invalidateQueries({ queryKey: ["employee-panel-pwd"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async (v: { id: string; visible: boolean }) => setVis({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employee-panel-admin-tx"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkMut = useMutation({
    mutationFn: async (visible: boolean) => bulk({ data: { visible } }),
    onSuccess: () => { toast.success("Vendas atualizadas."); qc.invalidateQueries({ queryKey: ["employee-panel-admin-tx"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/painel` : "/painel";

  const filtered = txs.filter((t) => filter === "all" ? true : filter === "visible" ? t.employee_visible : !t.employee_visible);
  const visibleCount = txs.filter((t) => t.employee_visible).length;

  return (
    <AppLayout>
      <PageHeader
        title="Painel da Equipe"
        subtitle="Configure a senha compartilhada e escolha quais vendas seus funcionários enxergam"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-6 bg-gradient-card">
          <div className="flex items-center gap-3 mb-5">
            <div className="size-10 rounded-xl bg-primary/15 grid place-items-center"><Users className="size-5 text-primary" /></div>
            <div>
              <h3 className="font-display font-semibold">Senha compartilhada</h3>
              <p className="text-xs text-muted-foreground">Envie essa senha para os funcionários acessarem o link.</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Senha</Label>
              <div className="relative">
                <Input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Defina uma senha (mín. 4 caracteres)"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <Button
              onClick={() => savePwdMut.mutate()}
              disabled={savePwdMut.isPending || password.length < 4}
              className="bg-gradient-primary text-primary-foreground shadow-glow"
            >
              <Save className="size-4 mr-2" /> Salvar senha
            </Button>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-card">
          <div className="flex items-center gap-3 mb-5">
            <div className="size-10 rounded-xl bg-accent grid place-items-center"><LinkIcon className="size-5 text-accent-foreground" /></div>
            <div>
              <h3 className="font-display font-semibold">Link do painel</h3>
              <p className="text-xs text-muted-foreground">Somente com a senha o acesso é liberado.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Input readOnly value={publicUrl} />
            <Button
              variant="outline"
              onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success("Link copiado."); }}
            >
              <Copy className="size-4" />
            </Button>
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            Vendas liberadas atualmente: <strong className="text-foreground">{visibleCount}</strong> de {txs.length}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-display font-semibold">Controlar vendas exibidas</h3>
            <p className="text-xs text-muted-foreground">Ative apenas as vendas que os funcionários devem ver.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-muted rounded-lg p-1">
              {([
                { key: "all", label: "Todas" },
                { key: "visible", label: "Visíveis" },
                { key: "hidden", label: "Ocultas" },
              ] as const).map((o) => (
                <button
                  key={o.key}
                  onClick={() => setFilter(o.key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium uppercase tracking-wider transition ${
                    filter === o.key ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => bulkMut.mutate(true)} disabled={bulkMut.isPending}>
              Liberar todas
            </Button>
            <Button variant="outline" size="sm" onClick={() => bulkMut.mutate(false)} disabled={bulkMut.isPending}>
              Ocultar todas
            </Button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">Nenhuma venda neste filtro.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="text-left py-3 px-4 font-medium">Cliente</th>
                  <th className="text-left py-3 px-4 font-medium">Gateway</th>
                  <th className="text-left py-3 px-4 font-medium">Tipo</th>
                  <th className="text-right py-3 px-4 font-medium">Valor</th>
                  <th className="text-left py-3 px-4 font-medium">Data</th>
                  <th className="text-right py-3 px-4 font-medium">Visível</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/30">
                    <td className="py-3 px-4">{t.client_name || "—"}</td>
                    <td className="py-3 px-4 text-muted-foreground">{t.gateway}</td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${
                        t.type === "refund" ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
                      }`}>
                        {t.type === "refund" ? "Reembolso" : t.type === "cashin" ? "Pago" : t.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">{brl(Number(t.amount))}</td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">
                      {new Date(t.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Switch
                        checked={t.employee_visible}
                        onCheckedChange={(v) => toggle.mutate({ id: t.id, visible: v })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </AppLayout>
  );
}
