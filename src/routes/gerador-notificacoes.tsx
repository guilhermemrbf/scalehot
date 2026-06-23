import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, DollarSign, Bell, Check } from "lucide-react";
import { toast } from "sonner";
import { sendMarketingBurst } from "@/lib/push.functions";
import sharkBotAsset from "@/assets/shark-bot.png.asset.json";
import apexvipsAsset from "@/assets/apexvips.jpg.asset.json";

export const Route = createFileRoute("/gerador-notificacoes")({
  head: () => ({ meta: [{ title: "Geradora de Notificações — ScaleUp" }] }),
  component: GeradorNotificacoes,
});

type PresetKey = "shark" | "scaleup" | "apex";

type Preset = {
  key: PresetKey;
  label: string;
  iconUrl: string;
  isAbsolute: boolean;
  title: string;
  subtitle: string;
  bodyTemplate: string;
};

const PRESETS: Preset[] = [
  {
    key: "shark",
    label: "Shark Bot",
    iconUrl: sharkBotAsset.url,
    isAbsolute: false,
    title: "🦈 Nova Venda! · from Shark Bot",
    subtitle: "from Shark Bot",
    bodyTemplate: "Você recebeu {valor}",
  },
  {
    key: "scaleup",
    label: "ScaleUp",
    iconUrl: "/icon-192.png",
    isAbsolute: false,
    title: "Venda Aprovada! · from ScaleUp",
    subtitle: "from ScaleUp",
    bodyTemplate: "Você recebeu: {valor}!",
  },
  {
    key: "apex",
    label: "ApexVips",
    iconUrl: apexvipsAsset.url,
    isAbsolute: false,
    title: "Venda Aprovada! · from ApexVips",
    subtitle: "from ApexVips",
    bodyTemplate: "Você recebeu: {valor}!",
  },

];

function GeradorNotificacoes() {
  const burstFn = useServerFn(sendMarketingBurst);
  const [count, setCount] = useState(100);
  const [minValue, setMinValue] = useState(5.9);
  const [maxValue, setMaxValue] = useState(19.9);
  const [minInterval, setMinInterval] = useState(3);
  const [maxInterval, setMaxInterval] = useState(7);
  const [selected, setSelected] = useState<Set<PresetKey>>(new Set(["shark", "scaleup", "apex"]));
  const [sending, setSending] = useState(false);

  function toggle(key: PresetKey) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function dispatch() {
    if (sending) return;
    if (selected.size === 0) {
      toast.error("Selecione ao menos uma notificação");
      return;
    }
    if (minValue >= maxValue) {
      toast.error("Valor mínimo deve ser menor que o máximo");
      return;
    }
    if (minInterval > maxInterval) {
      toast.error("Intervalo mínimo deve ser menor ou igual ao máximo");
      return;
    }
    setSending(true);
    toast.info(`Disparando ${count} notificações...`);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const presets = PRESETS.filter((p) => selected.has(p.key)).map((p) => ({
        title: p.title,
        subtitle: p.subtitle,
        bodyTemplate: p.bodyTemplate,
        icon: p.isAbsolute || p.iconUrl.startsWith("http") ? p.iconUrl : `${origin}${p.iconUrl}`,
      }));
      const res = await burstFn({
        data: {
          count,
          minValue,
          maxValue,
          minIntervalMs: Math.round(minInterval * 1000),
          maxIntervalMs: Math.round(maxInterval * 1000),
          presets,
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
    }
  }

  return (
    <AppLayout>
      <PageHeader
        title="Geradora de Notificações"
        subtitle="Configure o lote e dispare notificações de teste"
      />

      <Card className="p-6 bg-gradient-card max-w-2xl">
        <div className="flex items-start gap-3 mb-6">
          <div className="size-10 rounded-xl bg-emerald-500/15 grid place-items-center">
            <Bell className="size-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-display font-semibold">Configurações do lote</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Defina valores, intervalos e quais notificações enviar.
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
            <Input id="min" type="number" step="0.10" min={0.1} value={minValue} onChange={(e) => setMinValue(+e.target.value || 0)} />
          </div>
          <div>
            <Label htmlFor="max">Valor máximo (R$)</Label>
            <Input id="max" type="number" step="0.10" min={0.1} value={maxValue} onChange={(e) => setMaxValue(+e.target.value || 0)} />
          </div>
          <div>
            <Label htmlFor="minInt">Intervalo mínimo (s)</Label>
            <Input id="minInt" type="number" min={1} max={60} value={minInterval} onChange={(e) => setMinInterval(+e.target.value || 1)} />
          </div>
          <div>
            <Label htmlFor="maxInt">Intervalo máximo (s)</Label>
            <Input id="maxInt" type="number" min={1} max={60} value={maxInterval} onChange={(e) => setMaxInterval(+e.target.value || 1)} />
          </div>
        </div>

        <div className="mt-6">
          <Label className="mb-2 block">Notificações a enviar</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PRESETS.map((p) => {
              const active = selected.has(p.key);
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => toggle(p.key)}
                  className={`relative text-left rounded-xl border p-3 flex items-center gap-3 transition ${
                    active
                      ? "border-primary/60 bg-primary/10 shadow-glow"
                      : "border-border bg-background/40 opacity-70 hover:opacity-100"
                  }`}
                >
                  <div className="size-10 rounded-lg overflow-hidden ring-1 ring-border shrink-0 bg-background grid place-items-center">
                    <img src={p.iconUrl} alt={p.label} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.label}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {active ? "Selecionado" : "Toque para incluir"}
                    </p>
                  </div>
                  {active && (
                    <div className="size-5 rounded-full bg-primary text-primary-foreground grid place-items-center shrink-0">
                      <Check className="size-3" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={dispatch}
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
