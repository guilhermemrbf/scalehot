import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { brl } from "@/lib/format";
import {
  Wallet,
  Percent,
  RotateCcw,
  CheckCircle2,
  LogOut,
  Lock,
  Clock,
  XCircle,
  Smartphone,
  Share,
  PlusSquare,
  MoreVertical,
  Download,
  LayoutDashboard,
  ArrowLeftRight,
  ShieldCheck,
  ArrowDownToLine,
  Send,
  Eye,
  EyeOff,
  Landmark,
  Receipt,
  Zap,
  BadgeCheck,
  RefreshCw,
  Copy,
} from "lucide-react";
import {
  getEmployeePanelData,
  unlockEmployeePanel,
  lockEmployeePanel,
} from "@/lib/employee-panel.functions";
import { listMyWithdrawals } from "@/lib/withdrawals.functions";

type Tab = "overview" | "transacoes" | "saques";

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "overview", label: "Visão geral", icon: LayoutDashboard },
  { id: "transacoes", label: "Transações", icon: ArrowLeftRight },
  { id: "saques", label: "Saques", icon: Landmark },
];

function greetingPrefix() {
  const h = Number(
    new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" }).format(new Date())
  );
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="size-9 rounded-xl bg-gradient-primary grid place-items-center shadow-glow shrink-0">
        <Zap className="size-4.5 text-primary-foreground" />
      </div>
      {!compact && (
        <div className="leading-none">
          <p className="font-display font-bold tracking-tight text-[15px]">
            ScaleUp <span className="text-primary">Pay</span>
          </p>
          <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground mt-1">Gateway de pagamentos</p>
        </div>
      )}
    </div>
  );
}

export function ClientPanelApp({ slug }: { slug?: string }) {
  const qc = useQueryClient();
  const load = useServerFn(getEmployeePanelData);
  const unlock = useServerFn(unlockEmployeePanel);
  const lock = useServerFn(lockEmployeePanel);
  const [tab, setTab] = useState<Tab>("overview");
  const [hideValues, setHideValues] = useState(false);

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
        if (r.slug) {
          window.location.href = `/painel/${r.slug}`;
        } else {
          qc.invalidateQueries({ queryKey: ["employee-panel"] });
        }
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

  const money = (v: number) => (hideValues ? "R$ ••••" : brl(v));

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background bg-gradient-hero px-4">
        <div className="flex flex-col items-center gap-4">
          <Wordmark compact />
          <p className="text-sm text-muted-foreground">Conectando à sua conta…</p>
        </div>
      </div>
    );
  }

  if (!data || data.locked) {
    return <LoginScreen password={password} setPassword={setPassword} pending={doUnlock.isPending} onSubmit={() => doUnlock.mutate()} />;
  }

  const k = data.kpis;
  const accountId = (slug ?? "principal").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10) || "SCALEUP";

  return (
    <div className="min-h-screen bg-background bg-gradient-hero pb-24 lg:pb-10">
      {/* Top bar */}
      <header className="border-b border-border/70 bg-background/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Wordmark />

          <nav className="hidden lg:flex items-center gap-1 p-1 rounded-xl bg-muted/40 border border-border/60">
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <t.icon className="size-4" />
                  {t.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                qc.invalidateQueries({ queryKey: ["employee-panel"] });
                qc.invalidateQueries({ queryKey: ["my-withdrawals"] });
                toast.success("Conta atualizada");
              }}
              aria-label="Atualizar dados"
              className="size-10 rounded-xl border border-border/70 grid place-items-center text-muted-foreground active:scale-95 hover:text-foreground transition"
            >
              <RefreshCw className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setHideValues((v) => !v)}
              aria-label={hideValues ? "Mostrar valores" : "Ocultar valores"}
              className="size-10 rounded-xl border border-border/70 grid place-items-center text-muted-foreground active:scale-95 hover:text-foreground transition"
            >
              {hideValues ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
            <Button variant="outline" size="sm" className="h-10 px-3" onClick={() => doLock.mutate()}>
              <LogOut className="size-4 lg:mr-1.5" />
              <span className="hidden lg:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Account identity */}
        <section className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
              {greetingPrefix()}
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mt-1">
              {data.clientName || "Conta ScaleUp Pay"}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-success/10 text-success border border-success/25">
              <BadgeCheck className="size-3.5" /> Conta verificada
            </span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(accountId);
                toast.success("ID da conta copiado");
              }}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-muted/50 text-muted-foreground border border-border/60 active:scale-95 transition"
            >
              <ShieldCheck className="size-3.5 text-primary" /> ID {accountId}
              <Copy className="size-3" />
            </button>
          </div>
        </section>

        {tab === "overview" && (
          <>
            <BalanceHero
              available={money(k.saldoDisponivel)}
              pending={money(k.totalPendente)}
              pendingCount={k.qtdPendentes}
              onWithdraw={() => setTab("saques")}
              canWithdraw={k.saldoDisponivel >= 50}
            />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <MiniStat label="Faturamento líquido" value={money(k.faturamentoLiquido)} sub="após taxas" icon={Receipt} color="text-primary" />
              <MiniStat label="Vendas aprovadas" value={String(k.qtdVendas)} sub="no período" icon={CheckCircle2} color="text-success" />
              <MiniStat label="Total de taxas" value={money(k.totalTaxas)} sub={`média ${Number(k.taxaMediaPct || 0).toFixed(2)}%`} icon={Percent} color="text-warning" />
              <MiniStat label="Reembolsos" value={String(k.totalReembolsos)} sub="estornos" icon={RotateCcw} color="text-destructive" />
            </div>

            <Card className="p-5 bg-gradient-card">
              <SectionTitle icon={ArrowLeftRight} title="Últimas transações" sub="Vendas liberadas na sua conta" />
              {data.recentes.length === 0 ? (
                <EmptyState text="Nenhuma venda liberada ainda." />
              ) : (
                <div className="space-y-2">
                  {data.recentes.slice(0, 6).map((tx) => (
                    <TxRow key={tx.id} tx={{ ...(tx as any), approved: true }} hide={hideValues} />
                  ))}
                </div>
              )}
              {data.recentes.length > 6 && (
                <Button variant="outline" size="sm" className="w-full mt-4" onClick={() => setTab("transacoes")}>
                  Ver todas as transações
                </Button>
              )}
            </Card>

            <InstallAppCard />
          </>
        )}

        {tab === "transacoes" && <TransactionsPanel txs={data.transacoes as any[]} hide={hideValues} />}

        {tab === "saques" && (
          <>
            <Card className="relative overflow-hidden p-6 bg-gradient-card border border-success/25">
              <div className="absolute inset-0 bg-gradient-primary opacity-[0.05] pointer-events-none" />
              <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Disponível para saque</p>
                  <p className="font-display text-4xl font-bold tracking-tight text-success mt-1">{money(k.saldoDisponivel)}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Liberado após taxas e saques anteriores · valor mínimo de R$ 50,00 por solicitação.
                  </p>
                </div>
                <Button
                  className="bg-gradient-primary text-primary-foreground shadow-glow disabled:opacity-50 disabled:grayscale lg:w-64"
                  disabled={k.saldoDisponivel < 50}
                  onClick={() => {
                    toast.promise(
                      (async () => {
                        const req = await import("@/lib/withdrawals.functions");
                        const res = await req.requestWithdrawal({
                          data: {
                            amount: k.saldoDisponivel,
                            requesterName: data.clientName || "Cliente",
                            pixKey: "Consultar com o cliente",
                            note: "Solicitação via ScaleUp Pay",
                          },
                        });
                        if (!res.ok) throw new Error((res as any).reason || "Erro ao solicitar");
                        return res;
                      })(),
                      {
                        loading: "Enviando solicitação…",
                        success: "Solicitação de saque enviada!",
                        error: (err: Error) => err.message || "Erro ao enviar solicitação.",
                      }
                    );
                  }}
                >
                  <Send className="size-4 mr-2" />
                  {k.saldoDisponivel >= 50 ? `Sacar ${money(k.saldoDisponivel)}` : "Saldo insuficiente"}
                </Button>
              </div>
            </Card>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <MiniStat label="A liberar" value={money(k.totalPendente)} sub={`${k.qtdPendentes} pendentes`} icon={Clock} color="text-warning" />
              <MiniStat label="Saques pagos" value={money(k.saquesPagos)} sub="já transferidos" icon={ArrowDownToLine} color="text-chart-2" />
              <MiniStat label="Em análise" value={money(k.saquesPendentes)} sub="aguardando aprovação" icon={Wallet} color="text-primary" />
              <MiniStat label="Faturamento líquido" value={money(k.faturamentoLiquido)} sub="acumulado" icon={Receipt} color="text-success" />
            </div>

            <WithdrawalStatement hide={hideValues} />
          </>
        )}
      </main>

      {/* Mobile nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-border/70 bg-background/95 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto grid grid-cols-3">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`relative flex flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {active && <span className="absolute top-0 h-0.5 w-10 rounded-full bg-primary" />}
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

function LoginScreen({
  password,
  setPassword,
  pending,
  onSubmit,
}: {
  password: string;
  setPassword: (v: string) => void;
  pending: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background bg-gradient-hero">
      <div className="hidden lg:flex flex-col justify-between p-12 border-r border-border/60">
        <Wordmark />
        <div className="max-w-md">
          <h2 className="font-display text-4xl font-bold tracking-tight leading-tight">
            Sua conta de <span className="text-primary">pagamentos</span>, em tempo real.
          </h2>
          <p className="text-sm text-muted-foreground mt-4">
            Acompanhe vendas aprovadas, taxas aplicadas, saldo disponível e solicite saques direto pela sua conta ScaleUp Pay.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            {[
              "Vendas confirmadas em segundos",
              "Taxas e reembolsos totalmente transparentes",
              "Saque a partir de R$ 50,00 via Pix",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2.5">
                <CheckCircle2 className="size-4 text-success shrink-0" />
                <span className="text-muted-foreground">{f}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[11px] text-muted-foreground uppercase tracking-widest">
          Ambiente protegido · criptografia ponta a ponta
        </p>
      </div>

      <div className="grid place-items-center px-4 py-12">
        <Card className="w-full max-w-md p-8 bg-gradient-card border-border/70">
          <div className="lg:hidden mb-6 flex justify-center">
            <Wordmark />
          </div>
          <div className="flex flex-col items-center text-center mb-6">
            <div className="size-14 rounded-2xl bg-primary/15 grid place-items-center mb-3">
              <Lock className="size-6 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Acessar sua conta</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Digite a senha de acesso enviada para você.
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (password) onSubmit();
            }}
            className="space-y-3"
          >
            <Input
              type="password"
              placeholder="Senha de acesso"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            <Button
              type="submit"
              disabled={pending || !password}
              className="w-full bg-gradient-primary text-primary-foreground shadow-glow"
            >
              {pending ? "Verificando…" : "Entrar na ScaleUp Pay"}
            </Button>
          </form>
          <p className="text-[11px] text-muted-foreground text-center mt-6">
            Não tem a senha? Solicite ao responsável pela sua conta.
          </p>
        </Card>
      </div>
    </div>
  );
}

function BalanceHero({
  available,
  pending,
  pendingCount,
  onWithdraw,
  canWithdraw,
}: {
  available: string;
  pending: string;
  pendingCount: number;
  onWithdraw: () => void;
  canWithdraw: boolean;
}) {
  return (
    <Card className="relative overflow-hidden p-6 sm:p-8 bg-gradient-card border border-primary/25">
      <div className="absolute inset-0 bg-gradient-primary opacity-[0.07] pointer-events-none" />
      <div className="absolute -top-24 -right-16 size-64 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
      <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Saldo disponível</p>
          <p className="font-display text-4xl sm:text-5xl font-bold tracking-tight mt-1.5">{available}</p>
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg bg-warning/10 text-warning border border-warning/25">
              <Clock className="size-3.5" /> {pending} a liberar · {pendingCount} pendentes
            </span>
          </div>
        </div>
        <Button
          onClick={onWithdraw}
          className="bg-gradient-primary text-primary-foreground shadow-glow lg:w-56"
        >
          <ArrowDownToLine className="size-4 mr-2" />
          {canWithdraw ? "Solicitar saque" : "Ver saques"}
        </Button>
      </div>
    </Card>
  );
}

function SectionTitle({ icon: Icon, title, sub }: { icon: any; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="size-9 rounded-xl bg-primary/15 grid place-items-center shrink-0">
        <Icon className="size-4.5 text-primary" />
      </div>
      <div>
        <h2 className="font-display text-lg font-bold tracking-tight leading-tight">{title}</h2>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-12 flex flex-col items-center gap-3 text-center">
      <div className="size-12 rounded-2xl bg-muted/50 grid place-items-center text-muted-foreground">
        <Receipt className="size-5" />
      </div>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function MiniStat({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub: string; icon: any; color: string }) {
  return (
    <Card className="p-4 bg-gradient-card hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium truncate">{label}</p>
          <p className="font-display text-lg font-bold tracking-tight mt-1 truncate">{value}</p>
          <p className="text-[11px] text-muted-foreground truncate">{sub}</p>
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

function TransactionsPanel({ txs, hide }: { txs: Tx[]; hide: boolean }) {
  const [filter, setFilter] = useState<"all" | "aprovadas" | "pendentes" | "reembolsos">("all");
  const visible = useMemo(() => txs.filter((t) => t.approved || t.type === "refund"), [txs]);

  const list = useMemo(() => {
    if (filter === "aprovadas") return visible.filter((t) => t.type !== "refund" && t.approved);
    if (filter === "pendentes") return visible.filter((t) => t.type !== "refund" && !t.approved);
    if (filter === "reembolsos") return visible.filter((t) => t.type === "refund");
    return visible;
  }, [visible, filter]);

  const filters: { id: typeof filter; label: string }[] = [
    { id: "all", label: "Todas" },
    { id: "aprovadas", label: "Aprovadas" },
    { id: "pendentes", label: "Pendentes" },
    { id: "reembolsos", label: "Reembolsos" },
  ];

  return (
    <Card className="p-5 bg-gradient-card">
      <SectionTitle icon={ArrowLeftRight} title="Extrato de transações" sub="Todas as movimentações da sua conta" />

      <div className="flex flex-wrap gap-2 mb-4">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              filter === f.id
                ? "bg-primary/15 text-primary border-primary/30"
                : "bg-muted/30 text-muted-foreground border-border/60 hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState text="Nenhuma transação neste filtro." />
      ) : (
        <div className="space-y-2">
          {list.map((tx) => (
            <TxRow key={tx.id} tx={tx} hide={hide} />
          ))}
        </div>
      )}
    </Card>
  );
}

function TxRow({ tx, hide }: { tx: Tx; hide: boolean }) {
  const isRefund = tx.type === "refund";
  const color = isRefund
    ? "text-destructive bg-destructive/10 border-destructive/30"
    : tx.approved
      ? "text-success bg-success/10 border-success/30"
      : "text-warning bg-warning/10 border-warning/30";
  const Icon = isRefund ? RotateCcw : tx.approved ? CheckCircle2 : Clock;
  const name = tx.client_name || "Cliente";
  const dt = new Date(tx.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const bruto = Number(tx.amount);
  const liq = tx.liquid_amount == null ? null : Number(tx.liquid_amount);
  const taxa = liq == null ? null : Math.max(0, bruto - liq);
  const money = (v: number) => (hide ? "R$ ••••" : brl(v));
  const badge = isRefund ? "Reembolsada" : tx.approved ? "Aprovada" : "Pendente";
  const badgeCls = isRefund
    ? "bg-destructive/10 text-destructive"
    : tx.approved
      ? "bg-success/10 text-success"
      : "bg-warning/10 text-warning";

  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/70 bg-card/60 hover:border-primary/30 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`size-9 rounded-lg grid place-items-center border shrink-0 ${color}`}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium truncate">{name}</p>
            <span className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${badgeCls}`}>{badge}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {dt} · {tx.gateway}
          </p>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className={`font-display font-bold tracking-tight ${isRefund ? "text-destructive" : "text-success"}`}>
          {isRefund ? "-" : ""}
          {money(liq ?? bruto)}
        </p>
        {taxa != null && taxa > 0 && <p className="text-[11px] text-muted-foreground">Taxa {money(taxa)}</p>}
      </div>
    </div>
  );
}

function WithdrawalStatement({ hide }: { hide: boolean }) {
  const list = useServerFn(listMyWithdrawals);
  const { data: history } = useQuery({
    queryKey: ["my-withdrawals"],
    queryFn: () => list(),
  });
  const money = (v: number) => (hide ? "R$ ••••" : brl(v));

  const all = (history && !("locked" in history && history.locked) ? (history as any).items : []) as Array<{
    id: string;
    amount: number;
    requester_name: string;
    pix_key: string;
    status: "pending" | "approved" | "rejected";
    owner_note: string | null;
    created_at: string;
  }>;

  const items = all.filter((w) => w.status !== "pending");

  return (
    <Card className="p-5 bg-gradient-card">
      <SectionTitle icon={Landmark} title="Extrato de saques" sub="Histórico das transferências processadas" />

      {items.length === 0 ? (
        <EmptyState text="Nenhum saque processado ainda." />
      ) : (
        <div className="space-y-2">
          {items.map((w) => {
            const paid = w.status === "approved";
            return (
              <div key={w.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/70 bg-card/60">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`size-9 rounded-lg grid place-items-center border shrink-0 ${
                      paid
                        ? "text-success bg-success/10 border-success/30"
                        : "text-destructive bg-destructive/10 border-destructive/30"
                    }`}
                  >
                    {paid ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{w.requester_name}</p>
                      <span
                        className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${
                          paid ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {paid ? "Pago" : "Recusado"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {new Date(w.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      {" · Pix: "}
                      {w.pix_key}
                    </p>
                    {w.owner_note && <p className="text-xs text-muted-foreground mt-0.5">Retorno: {w.owner_note}</p>}
                  </div>
                </div>
                <p className={`font-display font-bold tracking-tight shrink-0 ${paid ? "" : "line-through text-muted-foreground"}`}>
                  {money(Number(w.amount))}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function InstallAppCard() {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const [defaultTab, setDefaultTab] = useState<"ios" | "android">(isIOS ? "ios" : "android");

  return (
    <Card className="p-6 bg-gradient-card">
      <div className="flex items-start gap-3 mb-5">
        <div className="size-10 rounded-xl bg-primary/15 grid place-items-center shrink-0">
          <Smartphone className="size-5 text-primary" />
        </div>
        <div>
          <h3 className="font-display font-semibold">Instalar a ScaleUp Pay no celular</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Adicione sua conta à tela inicial para abrir como app e receber notificações de venda.
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
            <Step n={1} />
            <p>Abra sua conta no <strong>Safari</strong> (não funciona pelo Chrome no iPhone).</p>
          </li>
          <li className="flex gap-3">
            <Step n={2} />
            <p className="flex items-center gap-1 flex-wrap">
              Toque no botão de compartilhar <Share className="size-4 inline text-primary" /> na barra inferior.
            </p>
          </li>
          <li className="flex gap-3">
            <Step n={3} />
            <p className="flex items-center gap-1 flex-wrap">
              Selecione <strong>Adicionar à Tela de Início</strong> <PlusSquare className="size-4 inline text-primary" /> e confirme.
            </p>
          </li>
          <li className="flex gap-3">
            <Step n={4} />
            <p>Pronto! O ícone da <strong>ScaleUp Pay</strong> aparece na tela inicial.</p>
          </li>
        </ol>
      ) : (
        <ol className="space-y-3 text-sm">
          <li className="flex gap-3">
            <Step n={1} />
            <p>Abra sua conta no <strong>Google Chrome</strong>.</p>
          </li>
          <li className="flex gap-3">
            <Step n={2} />
            <p className="flex items-center gap-1 flex-wrap">
              Toque no menu <MoreVertical className="size-4 inline text-primary" /> no canto superior direito.
            </p>
          </li>
          <li className="flex gap-3">
            <Step n={3} />
            <p className="flex items-center gap-1 flex-wrap">
              Toque em <strong>Instalar aplicativo</strong> <Download className="size-4 inline text-primary" />.
            </p>
          </li>
          <li className="flex gap-3">
            <Step n={4} />
            <p>Confirme em <strong>Instalar</strong> e abra sempre pelo ícone.</p>
          </li>
        </ol>
      )}

      <div className="mt-5 p-3 rounded-lg bg-muted/40 border border-border/60">
        <p className="text-xs text-muted-foreground">
          💡 Depois de instalado, abra pelo ícone para receber as notificações de vendas em tempo real.
        </p>
      </div>
    </Card>
  );
}

function Step({ n }: { n: number }) {
  return (
    <span className="size-6 rounded-full bg-primary/15 text-primary text-xs font-bold grid place-items-center shrink-0">{n}</span>
  );
}
