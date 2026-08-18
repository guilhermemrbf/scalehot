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
import { Copy, Users, Link as LinkIcon, Eye, EyeOff, CheckCircle2, Clock, DollarSign, XCircle, Send, Wallet, Plus, Trash2, Save } from "lucide-react";
import {
  listEmployeeClients,
  createEmployeeClient,
  updateEmployeeClient,
  deleteEmployeeClient,
  listAdminTransactions,
  setTransactionVisibility,
  bulkSetVisibility,
  type EmployeeClient,
} from "@/lib/employee-panel.functions";
import { listWithdrawalRequests, decideWithdrawal } from "@/lib/withdrawals.functions";
import { getClientPanelMetrics } from "@/lib/finance.functions";

export const Route = createFileRoute("/painel-equipe")({
  head: () => ({
    meta: [
      { title: "Gestão do Gateway — ScaleUp" },
      { name: "description", content: "Gerencie seu gateway, aprove vendas e saques." },
      { property: "og:title", content: "Gestão do Gateway — ScaleUp" },
      { property: "og:description", content: "Gerencie seu gateway, aprove vendas e saques." },
    ],
  }),
  component: PainelEquipeAdmin,
});

function PainelEquipeAdmin() {
  const qc = useQueryClient();
  const listClients = useServerFn(listEmployeeClients);
  const listTx = useServerFn(listAdminTransactions);
  const setVis = useServerFn(setTransactionVisibility);
  const bulk = useServerFn(bulkSetVisibility);

  const { data: clients = [] } = useQuery({ queryKey: ["employee-clients"], queryFn: () => listClients() });
  const { data: txs = [] } = useQuery({ queryKey: ["employee-panel-admin-tx"], queryFn: () => listTx() });

  const [activeTab, setActiveTab] = useState<"sales" | "withdrawals" | "clients">("sales");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "visible" | "hidden">("hidden");

  useEffect(() => {
    if (!selectedClientId && clients.length > 0) setSelectedClientId(clients[0].id);
  }, [clients, selectedClientId]);

  const selectedClient = clients.find((c) => c.id === selectedClientId) ?? null;

  const toggle = useMutation({
    mutationFn: async (v: { id: string; visible: boolean }) =>
      setVis({ data: { ...v, clientId: v.visible ? selectedClientId : null } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employee-panel-admin-tx"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkMut = useMutation({
    mutationFn: async (visible: boolean) => bulk({ data: { visible, clientId: selectedClientId } }),
    onSuccess: () => { toast.success("Vendas atualizadas."); qc.invalidateQueries({ queryKey: ["employee-panel-admin-tx"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const publicUrl = selectedClient
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/painel/${selectedClient.slug}`
    : "";

  const listWds = useServerFn(listWithdrawalRequests);
  const { data: withdrawals = [] } = useQuery({
    queryKey: ["admin-withdrawals"],
    queryFn: () => listWds(),
    // Economia: só atualiza a cada 2 min e apenas com a aba em foco.
    refetchInterval: 120_000,
    refetchIntervalInBackground: false,
    staleTime: 60_000,
  });

  const loadMetrics = useServerFn(getClientPanelMetrics);
  const { data: metrics } = useQuery({
    queryKey: ["client-panel-metrics", selectedClientId],
    queryFn: () => loadMetrics({ data: { clientId: selectedClientId } }),
    enabled: !!selectedClientId,
  });

  // Vendas do cliente selecionado: aprovadas dele + todas as pendentes (ainda sem cliente)
  const scoped = txs.filter(
    (t) => !t.employee_visible || !selectedClientId || t.employee_client_id === selectedClientId
  );
  const filtered = scoped.filter((t) => filter === "all" ? true : filter === "visible" ? t.employee_visible : !t.employee_visible);
  
  // Inclui reembolsos (MED) nas contagens se necessário, mas separa cashins para KPIs de venda
  const allTxs = scoped;
  const cashins = scoped.filter((t) => t.type === "cashin");
  const approved = allTxs.filter((t) => t.employee_visible);
  const pending = allTxs.filter((t) => !t.employee_visible);
  const sumApproved = approved.reduce((s, t) => s + Number(t.amount || 0), 0);
  const sumPending = pending.reduce((s, t) => s + Number(t.amount || 0), 0);
  const visibleCount = approved.length;

  // Valores financeiros centralizados no Supabase
  const liquidoAprovado = metrics?.faturamento_liquido ?? 0;
  const saquesPagos = metrics?.saques_pagos ?? 0;
  const saquesPendentes = metrics?.saques_pendentes ?? 0;
  const saldoCliente = metrics?.saldo_disponivel ?? 0;

  return (
    <AppLayout>
      <PageHeader
        title="Gestão do Gateway"
        subtitle="Gerencie vendas, pedidos de saque e painéis de clientes"
      />

      <div className="flex bg-muted rounded-xl p-1.5 mb-6 max-w-md">
        {( [
          { key: "sales", label: "Vendas", icon: DollarSign },
          { key: "withdrawals", label: "Saques", icon: Send },
          { key: "clients", label: "Painéis", icon: Users },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === t.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="size-4" />
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "sales" && (
        <>
          {clients.length > 0 && (
            <Card className="p-4 mb-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium mr-1">Cliente</span>
                {clients.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedClientId(c.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      selectedClientId === c.id
                        ? "bg-gradient-primary text-primary-foreground shadow-glow"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {c.name}{!c.active && " (inativo)"}
                  </button>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-6 bg-gradient-card mb-6 border-success/30">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Saldo disponível do cliente</p>
                <p className="font-display text-4xl font-bold tracking-tight mt-1 text-success">{brl(saldoCliente)}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Líquido aprovado {brl(liquidoAprovado)} · Saques pagos {brl(saquesPagos)}
                  {saquesPendentes > 0 && <> · Pendentes {brl(saquesPendentes)}</>}
                </p>
              </div>
              <div className="size-12 rounded-xl bg-success/10 grid place-items-center text-success shrink-0">
                <Wallet className="size-6" />
              </div>
            </div>
          </Card>

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

          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-display font-semibold">Aprovação de vendas</h3>
                <p className="text-xs text-muted-foreground">
                  Ao aprovar, a venda vai para o painel de <strong>{selectedClient?.name ?? "—"}</strong>. Vendas pendentes não aparecem em nenhum painel.
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
        </>
      )}

      {activeTab === "withdrawals" && <WithdrawalAdminSection />}

      {activeTab === "clients" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ClientsManager clients={clients} />

          <Card className="p-6 bg-gradient-card">
            <div className="flex items-center gap-3 mb-5">
              <div className="size-10 rounded-xl bg-accent grid place-items-center"><LinkIcon className="size-5 text-accent-foreground" /></div>
              <div>
                <h3 className="font-display font-semibold">Link do painel</h3>
                <p className="text-xs text-muted-foreground">
                  Link exclusivo de <strong className="text-foreground">{selectedClient?.name ?? "—"}</strong>. Só abre com a senha dele.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Input readOnly value={publicUrl} placeholder="Crie um cliente para gerar o link" />
              <Button
                variant="outline"
                disabled={!publicUrl}
                onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success("Link copiado."); }}
              >
                <Copy className="size-4" />
              </Button>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              Senha atual: <strong className="text-foreground font-mono">{selectedClient?.password ?? "—"}</strong>
              {" · "}Vendas liberadas: <strong className="text-foreground">{visibleCount}</strong>
            </div>
          </Card>
        </div>
      )}
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
    // Economia: só atualiza a cada 2 min e apenas com a aba em foco.
    refetchInterval: 120_000,
    refetchIntervalInBackground: false,
    staleTime: 60_000,
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
    <div className="mt-2">
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

function ClientsManager({ clients }: { clients: EmployeeClient[] }) {
  const qc = useQueryClient();
  const create = useServerFn(createEmployeeClient);
  const update = useServerFn(updateEmployeeClient);
  const remove = useServerFn(deleteEmployeeClient);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [nameEdits, setNameEdits] = useState<Record<string, string>>({});
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [reveal, setReveal] = useState<Record<string, boolean>>({});

  const invalidate = () => qc.invalidateQueries({ queryKey: ["employee-clients"] });

  const createMut = useMutation({
    mutationFn: async () => create({ data: { name, password } }),
    onSuccess: () => { toast.success("Cliente criado."); setName(""); setPassword(""); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: async (v: { id: string; name?: string; password?: string; active?: boolean }) => update({ data: v }),
    onSuccess: () => { toast.success("Painel atualizado."); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMut = useMutation({
    mutationFn: async (id: string) => remove({ data: { id } }),
    onSuccess: () => { toast.success("Cliente removido."); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="p-6 bg-gradient-card">
      <div className="flex items-center gap-3 mb-5">
        <div className="size-10 rounded-xl bg-primary/15 grid place-items-center"><Users className="size-5 text-primary" /></div>
        <div>
          <h3 className="font-display font-semibold">Painéis criados</h3>
          <p className="text-xs text-muted-foreground">Edite nome e senha de cada painel. {clients.length} painel(is).</p>
        </div>
      </div>

      <div className="space-y-3 mb-5">
        {clients.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum cliente ainda. Crie o primeiro abaixo.</p>
        )}
        {clients.map((c) => {
          const nameVal = nameEdits[c.id] ?? c.name;
          const passVal = edits[c.id] ?? c.password;
          const dirty = nameVal.trim() !== c.name || passVal !== c.password;
          const valid = nameVal.trim().length >= 1 && passVal.length >= 4;
          const link = `${typeof window !== "undefined" ? window.location.origin : ""}/painel/${c.slug}`;
          return (
            <div key={c.id} className="p-4 rounded-xl border bg-card/60 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-muted-foreground font-mono truncate pt-1">/painel/{c.slug}</p>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(link); toast.success("Link copiado."); }}>
                    <Copy className="size-4" />
                  </Button>
                  <Switch checked={c.active} onCheckedChange={(v) => updateMut.mutate({ id: c.id, active: v })} />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { if (confirm(`Remover o painel de ${c.name}?`)) removeMut.mutate(c.id); }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Nome</Label>
                  <Input
                    value={nameVal}
                    onChange={(e) => setNameEdits((s) => ({ ...s, [c.id]: e.target.value }))}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Senha</Label>
                  <div className="relative">
                    <Input
                      type={reveal[c.id] ? "text" : "password"}
                      value={passVal}
                      onChange={(e) => setEdits((s) => ({ ...s, [c.id]: e.target.value }))}
                      className="h-9 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setReveal((s) => ({ ...s, [c.id]: !s[c.id] }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                    >
                      {reveal[c.id] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!dirty || !valid || updateMut.isPending}
                  onClick={() => updateMut.mutate({ id: c.id, name: nameVal.trim(), password: passVal })}
                >
                  <Save className="size-4 mr-2" /> Salvar
                </Button>
              </div>
            </div>
          );
        })}
      </div>


      <div className="space-y-2 pt-4 border-t border-border/60">
        <Label>Novo cliente</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do cliente" />
        <div className="relative">
          <Input
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha do painel (mín. 4 caracteres)"
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
        <Button
          onClick={() => createMut.mutate()}
          disabled={createMut.isPending || name.trim().length < 1 || password.length < 4}
          className="bg-gradient-primary text-primary-foreground shadow-glow w-full"
        >
          <Plus className="size-4 mr-2" /> Criar painel
        </Button>
      </div>
    </Card>
  );
}
