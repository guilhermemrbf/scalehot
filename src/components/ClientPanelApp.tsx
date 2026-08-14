import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
  Activity,
  Clock,
  XCircle,
  Smartphone,
  Share,
  PlusSquare,
  MoreVertical,
  Download,
  Home,
  ArrowLeftRight,
  TrendingUp,
  ShieldCheck,
  ArrowDownToLine,
  Send,
} from "lucide-react";
import {
  getEmployeePanelData,
  unlockEmployeePanel,
  lockEmployeePanel,
} from "@/lib/employee-panel.functions";
import { listMyWithdrawals } from "@/lib/withdrawals.functions";

type Tab = "home" | "saque";

function greetingPrefix() {
  const h = Number(
    new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" }).format(new Date())
  );
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

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
            <h1 className="font-display text-2xl font-bold tracking-tight">Gateway de Vendas</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Acesse com sua senha para acompanhar faturamento, taxas e saques.
            </p>
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

  return (
    <div className="min-h-screen bg-background bg-gradient-hero pb-24">
      <header className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl overflow-hidden ring-1 ring-primary/30 shadow-[0_0_18px_rgba(168,85,247,0.35)]">
              <img src="/icon-192.png" alt="ScaleUp" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="font-display font-bold tracking-tight leading-tight">
                {data.clientName || "Gateway de Vendas"}
              </h1>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="size-3 text-success" /> Conta verificada
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => doLock.mutate()}>
            <LogOut className="size-4 mr-1.5" /> Sair
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {tab === "home" ? (
          <>
            <div className="mb-5">
              <p className="font-display text-2xl font-bold tracking-tight">
                {greetingPrefix()}
                {data.clientName ? `, ${data.clientName}` : ""}!
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">Aqui está o resumo da sua conta.</p>
            </div>

            <HeroCard

              label="Faturamento do mês"
              value={brl(k.faturamentoLiquido)}
              caption={`${k.qtdVendas} vendas aprovadas · líquido após taxas`}
              icon={TrendingUp}
            />

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
              <MiniStat label="Total de taxas" value={brl(k.totalTaxas)} sub="descontado das vendas" icon={Percent} color="text-warning" />
              <MiniStat label="Vendas aprovadas" value={String(k.qtdVendas)} sub="no período" icon={CheckCircle2} color="text-success" />
              <MiniStat label="Vendas reembolsadas" value={String(k.totalReembolsos)} sub="estornos" icon={RotateCcw} color="text-destructive" />
            </div>

            <Card className="p-5 mt-6 bg-gradient-card">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="size-5 text-primary" />
                <h2 className="font-display text-lg font-bold tracking-tight">Últimas vendas</h2>
              </div>
              {data.recentes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma venda liberada ainda.</p>
              ) : (
                <div className="space-y-2">
                  {data.recentes.map((tx) => (
                    <TxRow key={tx.id} tx={{ ...(tx as any), approved: true }} />
                  ))}
                </div>
              )}
            </Card>

            <InstallAppCard />
          </>
        ) : (
          <>
            <HeroCard
              label="Saldo disponível para saque"
              value={brl(k.saldoDisponivel)}
              caption="valor liberado após taxas e saques · saque mín. R$ 50,00"
              icon={Wallet}
              tone="success"
            />

            <Card className="p-6 bg-gradient-card mt-4 border-primary/20">
              <div className="flex flex-col items-center text-center gap-4">
                <div className={`size-12 rounded-full grid place-items-center ${k.saldoDisponivel >= 50 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  <Send className="size-6" />
                </div>
                <div>
                  <h3 className="font-display font-bold">Solicitar Saque</h3>
                  <p className="text-sm text-muted-foreground">
                    {k.saldoDisponivel >= 50 
                      ? "Você atingiu o valor mínimo para retirada." 
                      : "Saque mínimo permitido: R$ 50,00"}
                  </p>
                </div>
                <Button 
                  className="w-full bg-gradient-primary text-primary-foreground shadow-glow disabled:opacity-50 disabled:grayscale"
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
                            note: "Solicitação via botão de saque"
                          } 
                        });
                        if (!res.ok) throw new Error(res.reason || "Erro ao solicitar");
                        return res;
                      })(),
                      {
                        loading: 'Enviando pedido...',
                        success: 'Pedido enviado com sucesso!',
                        error: (err) => err.message || 'Erro ao enviar pedido.',
                      }
                    );
                  }}
                >
                  {k.saldoDisponivel >= 50 
                    ? `Confirmar Saque de ${brl(k.saldoDisponivel)}`
                    : `Saldo insuficiente (${brl(k.saldoDisponivel)})`}
                </Button>
              </div>
            </Card>

            {k.saldoDisponivel >= 50 && (
              <Card className="p-6 bg-gradient-card mt-4 border-primary/20">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="size-12 rounded-full bg-primary/10 grid place-items-center text-primary">
                    <Send className="size-6" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold">Solicitar Saque</h3>
                    <p className="text-sm text-muted-foreground">Você atingiu o valor mínimo para retirada.</p>
                  </div>
                  <Button 
                    className="w-full bg-gradient-primary text-primary-foreground shadow-glow"
                    onClick={() => {
                      // O usuário solicitou que apenas apareça no painel dele para aprovar
                      toast.promise(
                        (async () => {
                          const req = await import("@/lib/withdrawals.functions");
                          return req.requestWithdrawal({ 
                            data: { 
                              amount: k.saldoDisponivel,
                              requesterName: data.clientName || "Cliente",
                              pixKey: "Consultar com o cliente",
                              note: "Solicitação via botão de saque"
                            } 
                          });
                        })(),
                        {
                          loading: 'Enviando pedido...',
                          success: 'Pedido enviado com sucesso!',
                          error: 'Erro ao enviar pedido.',
                        }
                      );
                    }}
                  >
                    Confirmar Saque de {brl(k.saldoDisponivel)}
                  </Button>
                </div>
              </Card>
            )}

            <div className="grid grid-cols-2 gap-3 mt-4">
              <MiniStat
                label="Vendas pendentes"
                value={brl(k.totalPendente)}
                sub={`${k.qtdPendentes} aguardando liberação`}
                icon={Clock}
                color="text-warning"
              />
              <MiniStat
                label="Saques pagos"
                value={brl(k.saquesPagos)}
                sub="já transferidos"
                icon={ArrowDownToLine}
                color="text-chart-2"
              />
            </div>

            <WithdrawalStatement />
          </>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-background/90 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto grid grid-cols-2">
          {([
            { id: "home" as Tab, label: "Início", icon: Home },
            { id: "saque" as Tab, label: "Transações", icon: ArrowLeftRight },
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

function HeroCard({
  label,
  value,
  caption,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: string;
  caption: string;
  icon: any;
  tone?: "primary" | "success";
}) {
  const accent = tone === "success" ? "text-success" : "text-foreground";
  const ring = tone === "success" ? "border-success/30" : "border-primary/30";
  const chip = tone === "success" ? "bg-success/10 text-success" : "bg-primary/15 text-primary";
  return (
    <Card className={`relative overflow-hidden p-6 bg-gradient-card border ${ring}`}>
      <div className="absolute inset-0 bg-gradient-primary opacity-[0.06] pointer-events-none" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
          <p className={`font-display text-4xl font-bold tracking-tight mt-1 ${accent}`}>{value}</p>
          <p className="text-xs text-muted-foreground mt-2">{caption}</p>
        </div>
        <div className={`size-12 rounded-xl grid place-items-center shrink-0 ${chip}`}>
          <Icon className="size-6" />
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
  const bruto = Number(tx.amount);
  const liq = tx.liquid_amount == null ? null : Number(tx.liquid_amount);
  const taxa = liq == null ? null : Math.max(0, bruto - liq);
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/70 bg-card/60">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`size-9 rounded-lg grid place-items-center border shrink-0 ${color}`}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{name}</p>
            {isRefund ? (
              <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">Reembolsada</span>
            ) : (
              <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-success/10 text-success">Aprovada</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{dt} · {tx.gateway}</p>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="font-display font-bold tracking-tight text-success">{brl(liq ?? bruto)}</p>
        {taxa != null && taxa > 0 && (
          <p className="text-[11px] text-destructive">Taxa {brl(taxa)}</p>
        )}
      </div>
    </div>
  );
}

function WithdrawalStatement() {
  const list = useServerFn(listMyWithdrawals);
  const { data: history } = useQuery({
    queryKey: ["my-withdrawals"],
    queryFn: () => list(),
  });

  const all = (history && !("locked" in history && history.locked) ? (history as any).items : []) as Array<{
    id: string;
    amount: number;
    requester_name: string;
    pix_key: string;
    status: "pending" | "approved" | "rejected";
    owner_note: string | null;
    created_at: string;
  }>;

  // Pedidos pendentes são gerenciados apenas pelo dono da conta.
  const items = all.filter((w) => w.status !== "pending");

  return (
    <Card className="p-5 mt-6 bg-gradient-card">
      <div className="flex items-center gap-2 mb-4">
        <ArrowLeftRight className="size-5 text-primary" />
        <div>
          <h2 className="font-display text-lg font-bold tracking-tight">Extrato de saques</h2>
          <p className="text-xs text-muted-foreground">Histórico das transferências processadas.</p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum saque processado ainda.</p>
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
                        {paid ? "Pago" : "Transação inválida"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {new Date(w.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      {" · Pix: "}{w.pix_key}
                    </p>
                    {w.owner_note && <p className="text-xs text-muted-foreground mt-0.5">Retorno: {w.owner_note}</p>}
                  </div>
                </div>
                <p className={`font-display font-bold tracking-tight shrink-0 ${paid ? "" : "line-through text-muted-foreground"}`}>
                  {brl(Number(w.amount))}
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
