import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { brl } from "@/lib/format";
import { Wallet, Trophy, Percent, RotateCcw, CheckCircle2, LogOut, Lock, Activity, Send, Clock, XCircle, Smartphone, Share, PlusSquare, MoreVertical, Download, Home, ArrowLeftRight } from "lucide-react";
import {
  getEmployeePanelData,
  unlockEmployeePanel,
  lockEmployeePanel,
} from "@/lib/employee-panel.functions";
import { requestWithdrawal, listMyWithdrawals } from "@/lib/withdrawals.functions";

type Tab = "home" | "saque";

export function ClientPanelApp({ slug }: { slug?: string }) {
  const qc = useQueryClient();
  const load = useServerFn(getEmployeePanelData);
  const unlock = useServerFn(unlockEmployeePanel);
  const lock = useServerFn(lockEmployeePanel);
  const [tab, setTab] = useState<Tab>("home");

  const { data, isLoading } = useQuery({
    queryKey: ["employee-panel", slug ?? null],
    queryFn: () => load({ data: { slug: slug ?? null } }),
  });

  const [password, setPassword] = useState("");
  const doUnlock = useMutation({
    mutationFn: async () => unlock({ data: { password, slug: slug ?? null } }),
    onSuccess: (r) => {
      if (r.ok) {
        setPassword("");
        qc.invalidateQueries({ queryKey: ["employee-panel"] });
      } else {
        toast.error("Senha incorreta.");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const doLock = useMutation({
    mutationFn: async () => lock(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employee-panel"] }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-hero px-4">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  if (!data || data.locked) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-hero px-4">
        <Card className="w-full max-w-md p-8 bg-gradient-card">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="size-14 rounded-2xl bg-primary/15 grid place-items-center mb-3">
              <Lock className="size-6 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Painel da Equipe</h1>
            <p className="text-sm text-muted-foreground mt-1">Cada painel que for criado para outros clientes, no caso, se eu criar outros pra-- painéis pra outros clientes, vai funcionar da mesma forma também? Só enviar o link e já vai funcionar? Ou preciso fazer outro procedimento?</p>
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); if (password) doUnlock.mutate(); }}
            className="space-y-3"
          >
            <Input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            <Button
              type="submit"
              disabled={doUnlock.isPending || !password}
              className="w-full bg-gradient-primary text-primary-foreground shadow-glow"
            >
              {doUnlock.isPending ? "Verificando…" : "Entrar"}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  const k = data.kpis;
  const cards = [
    { label: "Faturamento Líquido", value: brl(k.faturamentoLiquido), icon: Wallet, color: "text-chart-2" },
    { label: "Lucro", value: brl(k.lucro), icon: Trophy, color: k.lucro >= 0 ? "text-success" : "text-destructive" },
    { label: "Total de Taxas", value: brl(k.totalTaxas), icon: Percent, color: "text-warning" },
    { label: "Vendas Aprovadas", value: String(k.qtdVendas), icon: CheckCircle2, color: "text-success" },
    { label: "Vendas Reembolsadas", value: String(k.totalReembolsos), icon: RotateCcw, color: "text-destructive" },
  ];

  return (
    <div className="min-h-screen bg-background bg-gradient-hero pb-24">
      <header className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl overflow-hidden ring-1 ring-primary/30 shadow-[0_0_18px_rgba(168,85,247,0.35)]">
              <img src="/icon-192.png" alt="ScaleUp" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="font-display font-bold tracking-tight">
                {tab === "home" ? "Painel da Equipe" : "Saque e Transações"}
              </h1>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                {tab === "home" ? "Visualização somente" : "Sua carteira"}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => doLock.mutate()}>
            <LogOut className="size-4 mr-1.5" /> Sair
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {tab === "home" ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {cards.map((c) => (
                <Card key={c.label} className="p-5 bg-gradient-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{c.label}</p>
                      <p className={`font-display text-2xl font-bold tracking-tight mt-1 ${c.label === "Lucro" ? c.color : ""}`}>{c.value}</p>
                    </div>
                    <div className={`size-10 rounded-xl bg-muted grid place-items-center ${c.color}`}>
                      <c.icon className="size-5" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <InstallAppCard slug={slug} />

            <Card className="p-5 mt-6">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="size-5 text-primary" />
                <h2 className="font-display text-xl font-bold tracking-tight">Últimas Vendas</h2>
              </div>
              {data.recentes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma venda liberada ainda.</p>
              ) : (
                <div className="space-y-2">
                  {data.recentes.map((tx) => (
                    <TxRow
                      key={tx.id}
                      tx={{ ...(tx as any), approved: true }}
                    />
                  ))}
                </div>
              )}
            </Card>
          </>
        ) : (
          <>
            <BalanceCard k={k} />

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
              <MiniStat label="Total de vendas" value={brl(k.faturamentoLiquido)} sub={`${k.qtdVendas} aprovadas`} icon={CheckCircle2} color="text-success" />
              <MiniStat label="Saques pagos" value={brl(k.saquesPagos)} sub="já transferidos" icon={ArrowLeftRight} color="text-chart-2" />
              <MiniStat label="Saques pendentes" value={brl(k.saquesPendentes)} sub="em análise" icon={Send} color="text-warning" />
            </div>

            <WithdrawalSection />
          </>
        )}

      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-background/90 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto grid grid-cols-2">
          {([
            { id: "home" as Tab, label: "Início", icon: Home },
            { id: "saque" as Tab, label: "Saque e Transações", icon: ArrowLeftRight },
          ]).map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}
              >
                <t.icon className="size-5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function BalanceCard({ k }: { k: any }) {
  return (
    <Card className="p-6 bg-gradient-card mb-6 border-success/30">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Saldo disponível para saque</p>
          <p className="font-display text-4xl font-bold tracking-tight mt-1 text-success">{brl(k.saldoDisponivel)}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Lucro {brl(k.lucro)} · Saques pagos {brl(k.saquesPagos)}
            {k.saquesPendentes > 0 && <> · Pendentes {brl(k.saquesPendentes)}</>}
          </p>
        </div>
        <div className="size-12 rounded-xl bg-success/10 grid place-items-center text-success shrink-0">
          <Wallet className="size-6" />
        </div>
      </div>
    </Card>
  );
}

function MiniStat({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub: string; icon: any; color: string }) {
  return (
    <Card className="p-4 bg-gradient-card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium truncate">{label}</p>
          <p className="font-display text-lg font-bold tracking-tight mt-1">{value}</p>
          <p className="text-[11px] text-muted-foreground">{sub}</p>
        </div>
        <div className={`size-8 rounded-lg bg-muted grid place-items-center shrink-0 ${color}`}>
          <Icon className="size-4" />
        </div>
      </div>
    </Card>
  );
}

type Tx = {
  id: string;
  type: string;
  amount: number;
  liquid_amount: number | null;
  client_name: string | null;
  gateway: string;
  created_at: string;
  approved: boolean;
};

function TxRow({ tx }: { tx: Tx }) {
  const isRefund = tx.type === "refund";
  const color = isRefund
    ? "text-destructive bg-destructive/10 border-destructive/30"
    : tx.approved
      ? "text-success bg-success/10 border-success/30"
      : "text-warning bg-warning/10 border-warning/30";
  const Icon = isRefund ? RotateCcw : tx.approved ? CheckCircle2 : Clock;
  const name = tx.client_name || "Cliente";
  const dt = new Date(tx.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`size-9 rounded-lg grid place-items-center border shrink-0 ${color}`}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{name}</p>
            {isRefund ? (
              <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">Reembolsada</span>
            ) : tx.approved ? (
              <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-success/10 text-success">Aprovada</span>
            ) : (
              <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-warning/10 text-warning">Pendente</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{dt} · {tx.gateway}</p>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="font-display font-bold tracking-tight">{brl(Number(tx.amount))}</p>
        {tx.liquid_amount != null && (
          <p className="text-xs text-muted-foreground">Líq: {brl(Number(tx.liquid_amount))}</p>
        )}
      </div>
    </div>
  );
}

function statusBadge(s: "pending" | "approved" | "rejected") {
  if (s === "approved") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded bg-success/10 text-success">
        <CheckCircle2 className="size-3" /> Aprovado
      </span>
    );
  }
  if (s === "rejected") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded bg-destructive/10 text-destructive">
        <XCircle className="size-3" /> Rejeitado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded bg-warning/10 text-warning">
      <Clock className="size-3" /> Pendente
    </span>
  );
}

function WithdrawalSection() {
  const qc = useQueryClient();
  const req = useServerFn(requestWithdrawal);
  const list = useServerFn(listMyWithdrawals);

  const { data: history } = useQuery({
    queryKey: ["my-withdrawals"],
    queryFn: () => list(),
  });

  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [note, setNote] = useState("");

  const submit = useMutation({
    mutationFn: async () => {
      const value = Number(amount.replace(",", "."));
      if (!Number.isFinite(value) || value <= 0) throw new Error("Informe um valor válido.");
      if (name.trim().length < 2) throw new Error("Informe seu nome.");
      if (pixKey.trim().length < 3) throw new Error("Informe uma chave Pix válida.");
      return req({
        data: {
          amount: value,
          requesterName: name.trim(),
          pixKey: pixKey.trim(),
          note: note.trim() || undefined,
        },
      });
    },
    onSuccess: (r) => {
      if (!r || (r as any).ok !== true) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }
      toast.success("Pedido enviado! Aguarde a aprovação.");
      setAmount("");
      setNote("");
      qc.invalidateQueries({ queryKey: ["my-withdrawals"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const items = (history && !("locked" in history && history.locked) ? (history as any).items : []) as Array<{
    id: string;
    amount: number;
    requester_name: string;
    pix_key: string;
    note: string | null;
    status: "pending" | "approved" | "rejected";
    owner_note: string | null;
    created_at: string;
  }>;

  return (
    <Card className="p-6 bg-gradient-card">
      <div className="flex items-center gap-3 mb-5">
        <div className="size-10 rounded-xl bg-primary/15 grid place-items-center">
          <Send className="size-5 text-primary" />
        </div>
        <div>
          <h3 className="font-display font-semibold">Solicitar saque</h3>
          <p className="text-xs text-muted-foreground">
            Envie o pedido e aguarde a aprovação. A transferência é feita fora do sistema.
          </p>
        </div>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); submit.mutate(); }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
      >
        <div className="space-y-1.5">
          <Label>Seu nome</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" maxLength={120} />
        </div>
        <div className="space-y-1.5">
          <Label>Valor do saque</Label>
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d,.]/g, ""))}
            placeholder="0,00"
            inputMode="decimal"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Chave Pix</Label>
          <Input value={pixKey} onChange={(e) => setPixKey(e.target.value)} placeholder="CPF, e-mail, telefone ou chave aleatória" maxLength={200} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Observação (opcional)</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} placeholder="Alguma observação para o dono da conta?" />
        </div>
        <div className="sm:col-span-2 flex justify-end">
          <Button
            type="submit"
            disabled={submit.isPending || !amount || !name || !pixKey}
            className="bg-gradient-primary text-primary-foreground shadow-glow"
          >
            <Send className="size-4 mr-2" /> {submit.isPending ? "Enviando…" : "Solicitar saque"}
          </Button>
        </div>
      </form>

      {items.length > 0 && (
        <div className="mt-6">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">Seus pedidos</h4>
          <div className="space-y-2">
            {items.slice(0, 8).map((w) => (
              <div key={w.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{w.requester_name}</p>
                    {statusBadge(w.status)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(w.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    {" · "}Pix: {w.pix_key}
                  </p>
                  {w.owner_note && <p className="text-xs text-muted-foreground mt-1">Retorno: {w.owner_note}</p>}
                </div>
                <p className="font-display font-bold tracking-tight shrink-0">{brl(Number(w.amount))}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function InstallAppCard({ slug }: { slug?: string }) {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const [defaultTab, setDefaultTab] = useState<"ios" | "android">(isIOS ? "ios" : "android");

  return (
    <Card className="p-6 bg-gradient-card mt-6">
      <div className="flex items-start gap-3 mb-5">
        <div className="size-10 rounded-xl bg-primary/15 grid place-items-center shrink-0">
          <Smartphone className="size-5 text-primary" />
        </div>
        <div>
          <h3 className="font-display font-semibold">Instalar o aplicativo</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Adicione o painel à tela inicial do seu celular para abrir como app e receber notificações.
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <Button
          type="button"
          variant={defaultTab === "ios" ? "default" : "outline"}
          size="sm"
          onClick={() => setDefaultTab("ios")}
          className={defaultTab === "ios" ? "bg-gradient-primary text-primary-foreground" : ""}
        >
          iPhone / iPad
        </Button>
        <Button
          type="button"
          variant={defaultTab === "android" ? "default" : "outline"}
          size="sm"
          onClick={() => setDefaultTab("android")}
          className={defaultTab === "android" ? "bg-gradient-primary text-primary-foreground" : ""}
        >
          Android
        </Button>
      </div>

      {defaultTab === "ios" ? (
        <ol className="space-y-3 text-sm">
          <li className="flex gap-3">
            <span className="size-6 rounded-full bg-primary/15 text-primary text-xs font-bold grid place-items-center shrink-0">1</span>
            <p>Abra este painel no <strong>Safari</strong> (não funciona pelo Chrome no iPhone).</p>
          </li>
          <li className="flex gap-3">
            <span className="size-6 rounded-full bg-primary/15 text-primary text-xs font-bold grid place-items-center shrink-0">2</span>
            <p className="flex items-center gap-1 flex-wrap">
              Toque no botão de compartilhar
              <Share className="size-4 inline text-primary" />
              na barra inferior.
            </p>
          </li>
          <li className="flex gap-3">
            <span className="size-6 rounded-full bg-primary/15 text-primary text-xs font-bold grid place-items-center shrink-0">3</span>
            <p className="flex items-center gap-1 flex-wrap">
              Selecione <strong>Adicionar à Tela de Início</strong>
              <PlusSquare className="size-4 inline text-primary" />
              e confirme em <strong>Adicionar</strong>.
            </p>
          </li>
          <li className="flex gap-3">
            <span className="size-6 rounded-full bg-primary/15 text-primary text-xs font-bold grid place-items-center shrink-0">4</span>
            <p>Pronto! O ícone do <strong>ScaleUp</strong> aparece na tela inicial. Abra por lá para ativar as notificações.</p>
          </li>
        </ol>
      ) : (
        <ol className="space-y-3 text-sm">
          <li className="flex gap-3">
            <span className="size-6 rounded-full bg-primary/15 text-primary text-xs font-bold grid place-items-center shrink-0">1</span>
            <p>Abra este painel no <strong>Google Chrome</strong>.</p>
          </li>
          <li className="flex gap-3">
            <span className="size-6 rounded-full bg-primary/15 text-primary text-xs font-bold grid place-items-center shrink-0">2</span>
            <p className="flex items-center gap-1 flex-wrap">
              Toque no menu
              <MoreVertical className="size-4 inline text-primary" />
              no canto superior direito.
            </p>
          </li>
          <li className="flex gap-3">
            <span className="size-6 rounded-full bg-primary/15 text-primary text-xs font-bold grid place-items-center shrink-0">3</span>
            <p className="flex items-center gap-1 flex-wrap">
              Toque em <strong>Instalar aplicativo</strong>
              <Download className="size-4 inline text-primary" />
              (ou <strong>Adicionar à tela inicial</strong>).
            </p>
          </li>
          <li className="flex gap-3">
            <span className="size-6 rounded-full bg-primary/15 text-primary text-xs font-bold grid place-items-center shrink-0">4</span>
            <p>Confirme em <strong>Instalar</strong>. O <strong>ScaleUp</strong> aparece como aplicativo no seu celular.</p>
          </li>
        </ol>
      )}

      <div className="mt-5 p-3 rounded-lg bg-muted/40 border border-border/60">
        <p className="text-xs text-muted-foreground">
          💡 Dica: depois de instalado, abra sempre pelo ícone na tela inicial para receber as notificações de vendas em tempo real.
        </p>
      </div>
    </Card>
  );
}
