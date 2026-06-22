import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, DollarSign, Bell } from "lucide-react";
import { toast } from "sonner";
import { sendMarketingBurst } from "@/lib/push.functions";
import sharkBotAsset from "@/assets/shark-bot.png.asset.json";

export const Route = createFileRoute("/gerador-notificacoes")({
  head: () => ({ meta: [{ title: "Geradora de Notificações — ScaleUp" }] }),
  component: GeradorNotificacoes,
});

function GeradorNotificacoes() {
  const burstFn = useServerFn(sendMarketingBurst);
  const [count, setCount] = useState(100);
  const [minValue, setMinValue] = useState(5.9);
  const [maxValue, setMaxValue] = useState(19.9);
  const [minInterval, setMinInterval] = useState(3);
  const [maxInterval, setMaxInterval] = useState(7);
  const [sending, setSending] = useState(false);
  const [activePreset, setActivePreset] = useState<null | "shark" | "scaleup">(null);

  async function dispatch(opts?: { title?: string; icon?: string; label?: string; key?: "shark" | "scaleup" }) {
    if (sending || activePreset) return;
    if (minValue >= maxValue) {
      toast.error("Valor mínimo deve ser menor que o máximo");
      return;
    }
    if (minInterval > maxInterval) {
      toast.error("Intervalo mínimo deve ser menor ou igual ao máximo");
      return;
    }
    if (opts?.key) setActivePreset(opts.key);
    else setSending(true);
    toast.info(`Disparando ${count} notificações${opts?.label ? ` (${opts.label})` : ""}...`);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const icon = opts?.icon ? (opts.icon.startsWith("http") ? opts.icon : `${origin}${opts.icon}`) : undefined;
      const res = await burstFn({
        data: {
          count,
          minValue,
          maxValue,
          minIntervalMs: Math.round(minInterval * 1000),
          maxIntervalMs: Math.round(maxInterval * 1000),
          title: opts?.title ?? "venda aprovada!",
          ...(icon ? { icon } : {}),
        },
      });
      if ((res as any)?.ok) {
        toast.success(`Enviadas ${(res as any).sent}/${(res as any).total} notificações.`);
      } else {
        toast.error("Falha ao disparar lote.");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao disparar lote");
    } finally {
      setSending(false);
      setActivePreset(null);
    }
  }

  return (
    <AppLayout>
      <PageHeader
        title="Geradora de Notificações"
        subtitle="Dispare notificações de teste de venda aprovada"
      />

      <Card className="p-6 bg-gradient-card max-w-2xl mb-6">
        <div className="flex items-start gap-4">
          <div className="size-14 rounded-2xl overflow-hidden ring-1 ring-primary/30 shadow-glow shrink-0 bg-background/40 grid place-items-center">
            <img src={sharkBotAsset.url} alt="Shark Bot" className="w-full h-full object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-semibold">Gerar notificação Shark Bot</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Dispara o lote usando a logo do Shark Bot como ícone da notificação.
            </p>
            <button
              type="button"
              onClick={() => dispatch({ title: "Shark Bot • venda aprovada!", icon: sharkBotAsset.url, label: "Shark Bot" })}
              disabled={sending || sendingShark}
              className="mt-3 w-full rounded-lg bg-gradient-primary text-primary-foreground text-sm font-medium py-2.5 hover:opacity-90 shadow-glow transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {sendingShark ? <Loader2 className="size-4 animate-spin" /> : <DollarSign className="size-4" />}
              {sendingShark ? "Disparando Shark Bot..." : `Gerar ${count} notificações Shark Bot`}
            </button>
          </div>
        </div>
      </Card>


      <Card className="p-6 bg-gradient-card max-w-2xl">
        <div className="flex items-start gap-3 mb-6">
          <div className="size-10 rounded-xl bg-emerald-500/15 grid place-items-center">
            <Bell className="size-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-display font-semibold">Configurações do lote</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Cada notificação aparece como "venda aprovada!" com um valor aleatório.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="count">Quantidade</Label>
            <Input
              id="count"
              type="number"
              min={1}
              max={200}
              value={count}
              onChange={(e) => setCount(Math.min(200, Math.max(1, +e.target.value || 1)))}
            />
            <p className="text-[11px] text-muted-foreground mt-1">Máximo 200</p>
          </div>

          <div />

          <div>
            <Label htmlFor="min">Valor mínimo (R$)</Label>
            <Input
              id="min"
              type="number"
              step="0.10"
              min={0.1}
              value={minValue}
              onChange={(e) => setMinValue(+e.target.value || 0)}
            />
          </div>
          <div>
            <Label htmlFor="max">Valor máximo (R$)</Label>
            <Input
              id="max"
              type="number"
              step="0.10"
              min={0.1}
              value={maxValue}
              onChange={(e) => setMaxValue(+e.target.value || 0)}
            />
          </div>

          <div>
            <Label htmlFor="minInt">Intervalo mínimo (s)</Label>
            <Input
              id="minInt"
              type="number"
              min={1}
              max={60}
              value={minInterval}
              onChange={(e) => setMinInterval(+e.target.value || 1)}
            />
          </div>
          <div>
            <Label htmlFor="maxInt">Intervalo máximo (s)</Label>
            <Input
              id="maxInt"
              type="number"
              min={1}
              max={60}
              value={maxInterval}
              onChange={(e) => setMaxInterval(+e.target.value || 1)}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => dispatch()}
          disabled={sending}
          className="mt-6 w-full rounded-lg bg-gradient-primary text-primary-foreground text-sm font-medium py-3 hover:opacity-90 shadow-glow transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {sending ? <Loader2 className="size-4 animate-spin" /> : <DollarSign className="size-4" />}
          {sending ? "Disparando..." : `Gerar ${count} notificações`}
        </button>

        <p className="text-[11px] text-muted-foreground mt-3 text-center">
          As notificações são enviadas apenas para o seu dispositivo. Ative as
          notificações push em Configurações primeiro.
        </p>
      </Card>
    </AppLayout>
  );
}
