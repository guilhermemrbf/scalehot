import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { brl, pct } from "@/lib/format";
import { Wallet, Trophy, Percent, Landmark, RotateCcw, CheckCircle2, LogOut, Lock, Activity } from "lucide-react";
import {
  getEmployeePanelData,
  unlockEmployeePanel,
  lockEmployeePanel,
} from "@/lib/employee-panel.functions";

export const Route = createFileRoute("/painel")({
  head: () => ({
    meta: [
      { title: "Painel da Equipe — ScaleUp" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PainelEquipe,
});

function PainelEquipe() {
  const qc = useQueryClient();
  const load = useServerFn(getEmployeePanelData);
  const unlock = useServerFn(unlockEmployeePanel);
  const lock = useServerFn(lockEmployeePanel);

  const { data, isLoading } = useQuery({
    queryKey: ["employee-panel"],
    queryFn: () => load(),
  });

  const [password, setPassword] = useState("");
  const doUnlock = useMutation({
    mutationFn: async () => unlock({ data: { password } }),
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
            <p className="text-sm text-muted-foreground mt-1">Digite a senha compartilhada para acessar.</p>
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
    { label: "Total de Taxas", value: brl(k.totalTaxas), icon: Percent, hint: pct(k.taxaMediaPct) + " do bruto", color: "text-warning" },
    { label: "Impostos", value: brl(k.totalImposto), icon: Landmark, color: "text-chart-5" },
    { label: "Vendas Aprovadas", value: String(k.qtdVendas), icon: CheckCircle2, color: "text-success" },
    { label: "Vendas Reembolsadas", value: String(k.totalReembolsos), icon: RotateCcw, color: "text-destructive" },
  ];

  return (
    <div className="min-h-screen bg-background bg-gradient-hero">
      <header className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl overflow-hidden ring-1 ring-primary/30 shadow-[0_0_18px_rgba(168,85,247,0.35)]">
              <img src="/icon-192.png" alt="ScaleUp" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="font-display font-bold tracking-tight">Painel da Equipe</h1>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Visualização somente</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => doLock.mutate()}>
            <LogOut className="size-4 mr-1.5" /> Sair
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {cards.map((c) => (
            <Card key={c.label} className="p-5 bg-gradient-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{c.label}</p>
                  <p className={`font-display text-2xl font-bold tracking-tight mt-1 ${c.label === "Lucro" ? c.color : ""}`}>{c.value}</p>
                  {"hint" in c && c.hint && <p className="text-xs text-muted-foreground mt-1">{c.hint}</p>}
                </div>
                <div className={`size-10 rounded-xl bg-muted grid place-items-center ${c.color}`}>
                  <c.icon className="size-5" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="size-5 text-primary" />
            <h2 className="font-display text-xl font-bold tracking-tight">Últimas Vendas</h2>
          </div>
          {data.recentes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma venda liberada ainda.</p>
          ) : (
            <div className="space-y-2">
              {data.recentes.map((tx) => {
                const isRefund = tx.type === "refund";
                const color = isRefund
                  ? "text-destructive bg-destructive/10 border-destructive/30"
                  : "text-success bg-success/10 border-success/30";
                const Icon = isRefund ? RotateCcw : CheckCircle2;
                const name = tx.client_name || "Cliente";
                const dt = new Date(tx.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
                return (
                  <div key={tx.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`size-9 rounded-lg grid place-items-center border shrink-0 ${color}`}>
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{name}</p>
                        <p className="text-xs text-muted-foreground">{dt} · {tx.gateway}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-bold tracking-tight">{brl(Number(tx.amount))}</p>
                      {tx.liquid_amount != null && (
                        <p className="text-xs text-muted-foreground">Líq: {brl(Number(tx.liquid_amount))}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
