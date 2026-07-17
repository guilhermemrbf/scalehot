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
import { Copy, Save, Users, Link as LinkIcon, Eye, EyeOff, CheckCircle2, Clock, DollarSign, XCircle, Send } from "lucide-react";
import {
  getEmployeePanelPassword,
  setEmployeePanelPassword,
  listAdminTransactions,
  setTransactionVisibility,
  bulkSetVisibility,
} from "@/lib/employee-panel.functions";
import { listWithdrawalRequests, decideWithdrawal } from "@/lib/withdrawals.functions";

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
  const [filter, setFilter] = useState<"all" | "visible" | "hidden">("hidden");

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
  const cashins = txs.filter((t) => t.type !== "refund");
  const approved = cashins.filter((t) => t.employee_visible);
  const pending = cashins.filter((t) => !t.employee_visible);
  const sumApproved = approved.reduce((s, t) => s + Number(t.amount || 0), 0);
  const sumPending = pending.reduce((s, t) => s + Number(t.amount || 0), 0);
  const visibleCount = approved.length;

  return (
    <AppLayout>
      <PageHeader
        title="Painel da Equipe"
        subtitle="Aprove cada venda individualmente antes que ela apareça no painel dos funcionários"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider mb-1">
            <Clock className="size-4" /> Pendentes
          </div>
          <p className="font-display text-2xl font-bold">{pending.length}</p>
          <p className="text-xs text-muted-foreground">{brl(sumPending)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-success text-xs uppercase tracking-wider mb-1">
            <CheckCircle2 className="size-4" /> Aprovadas
          </div>
          <p className="font-display text-2xl font-bold">{approved.length}</p>
          <p className="text-xs text-muted-foreground">{brl(sumApproved)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider mb-1">
            <DollarSign className="size-4" /> Total de vendas
          </div>
          <p className="font-display text-2xl font-bold">{cashins.length}</p>
          <p className="text-xs text-muted-foreground">{brl(sumApproved + sumPending)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider mb-1">
            <Eye className="size-4" /> Exibindo no painel
          </div>
          <p className="font-display text-2xl font-bold">{visibleCount}</p>
          <p className="text-xs text-muted-foreground">de {txs.length} totais</p>
        </Card>
      </div>

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
            <h3 className="font-display font-semibold">Aprovação de vendas</h3>
            <p className="text-xs text-muted-foreground">
              Cada venda recebida via webhook fica <strong>pendente</strong> até você aprovar. Só vendas aprovadas aparecem no painel dos funcionários/clientes.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-muted rounded-lg p-1">
              {([
                { key: "hidden", label: `Pendentes (${pending.length})` },
                { key: "visible", label: `Aprovadas (${approved.length})` },
                { key: "all", label: "Todas" },
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
              <CheckCircle2 className="size-4 mr-1" /> Aprovar todas
            </Button>
            <Button variant="outline" size="sm" onClick={() => bulkMut.mutate(false)} disabled={bulkMut.isPending}>
              <XCircle className="size-4 mr-1" /> Ocultar todas
            </Button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            {filter === "hidden" ? "Nenhuma venda pendente 🎉" : "Nenhuma venda neste filtro."}
          </p>
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
                  <th className="text-center py-3 px-4 font-medium">Status</th>
                  <th className="text-right py-3 px-4 font-medium">Ação</th>
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
                    <td className="py-3 px-4 text-center">
                      {t.employee_visible ? (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded bg-success/10 text-success">
                          <CheckCircle2 className="size-3" /> Aprovada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded bg-warning/10 text-warning">
                          <Clock className="size-3" /> Pendente
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        {t.employee_visible ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggle.mutate({ id: t.id, visible: false })}
                          >
                            <XCircle className="size-4 mr-1" /> Ocultar
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="bg-success text-success-foreground hover:bg-success/90"
                            onClick={() => toggle.mutate({ id: t.id, visible: true })}
                          >
                            <CheckCircle2 className="size-4 mr-1" /> Aprovar
                          </Button>
                        )}
                        <Switch
                          checked={t.employee_visible}
                          onCheckedChange={(v) => toggle.mutate({ id: t.id, visible: v })}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <WithdrawalAdminSection />
    </AppLayout>
  );
}

function WithdrawalAdminSection() {
  const qc = useQueryClient();
  const list = useServerFn(listWithdrawalRequests);
  const decide = useServerFn(decideWithdrawal);

  const { data: items = [] } = useQuery({
    queryKey: ["admin-withdrawals"],
    queryFn: () => list(),
    refetchInterval: 15_000,
  });

  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");

  const decideMut = useMutation({
    mutationFn: async (v: { id: string; status: "approved" | "rejected" }) => decide({ data: v }),
    onSuccess: (_r, v) => {
      toast.success(v.status === "approved" ? "Saque aprovado." : "Saque rejeitado.");
      qc.invalidateQueries({ queryKey: ["admin-withdrawals"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pending = items.filter((i) => i.status === "pending");
  const approved = items.filter((i) => i.status === "approved");
  const rejected = items.filter((i) => i.status === "rejected");
  const filtered = filter === "all" ? items : items.filter((i) => i.status === filter);

  return (
    <Card className="p-5 mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary/15 grid place-items-center">
            <Send className="size-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-semibold">Pedidos de saque</h3>
            <p className="text-xs text-muted-foreground">
              Aprove ou rejeite as solicitações. A transferência é feita fora do sistema.
            </p>
          </div>
        </div>
        <div className="flex bg-muted rounded-lg p-1">
          {([
            { key: "pending", label: `Pendentes (${pending.length})` },
            { key: "approved", label: `Aprovados (${approved.length})` },
            { key: "rejected", label: `Rejeitados (${rejected.length})` },
            { key: "all", label: "Todos" },
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
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">
          {filter === "pending" ? "Nenhum pedido pendente 🎉" : "Nenhum pedido neste filtro."}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((w) => (
            <div key={w.id} className="p-4 rounded-lg border bg-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium">{w.requester_name}</p>
                    {w.status === "pending" && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded bg-warning/10 text-warning">
                        <Clock className="size-3" /> Pendente
                      </span>
                    )}
                    {w.status === "approved" && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded bg-success/10 text-success">
                        <CheckCircle2 className="size-3" /> Aprovado
                      </span>
                    )}
                    {w.status === "rejected" && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded bg-destructive/10 text-destructive">
                        <XCircle className="size-3" /> Rejeitado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Solicitado em {new Date(w.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <p className="text-sm mt-2">
                    <strong>Chave Pix:</strong>{" "}
                    <span className="font-mono">{w.pix_key}</span>
                    <button
                      type="button"
                      className="ml-2 text-xs text-primary hover:underline"
                      onClick={() => { navigator.clipboard.writeText(w.pix_key); toast.success("Chave copiada."); }}
                    >
                      copiar
                    </button>
                  </p>
                  {w.note && <p className="text-xs text-muted-foreground mt-1">Obs.: {w.note}</p>}
                  {w.owner_note && (
                    <p className="text-xs text-muted-foreground mt-1">Sua nota: {w.owner_note}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display text-2xl font-bold tracking-tight">{brl(Number(w.amount))}</p>
                </div>
              </div>

              {w.status === "pending" && (
                <div className="flex flex-wrap justify-end gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => decideMut.mutate({ id: w.id, status: "rejected" })}
                    disabled={decideMut.isPending}
                  >
                    <XCircle className="size-4 mr-1" /> Rejeitar
                  </Button>
                  <Button
                    size="sm"
                    className="bg-success text-success-foreground hover:bg-success/90"
                    onClick={() => decideMut.mutate({ id: w.id, status: "approved" })}
                    disabled={decideMut.isPending}
                  >
                    <CheckCircle2 className="size-4 mr-1" /> Aprovar
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
