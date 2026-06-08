import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Bell, BellOff, Loader2, Smartphone, Volume2, DollarSign, WifiOff, Share, MoreVertical, X, Send } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  sendTestNotification,
  getNotificationPreferences,
  saveNotificationPreferences,
} from "@/lib/push.functions";
import { getOneSignal } from "@/lib/onesignal";

function getPWAStatus() {
  if (typeof window === "undefined") {
    return { isInstalled: false, isSupported: false, isBrowser: true };
  }
  const isInstalled =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;
  const isSupported = "serviceWorker" in navigator && "Notification" in window;
  return { isInstalled, isSupported, isBrowser: !isInstalled };
}

export function NotificationsCard() {
  const { user } = useAuth();
  const [pwa, setPwa] = useState({ isInstalled: false, isSupported: false, isBrowser: true });
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);

  const testFn = useServerFn(sendTestNotification);
  const fetchPrefs = useServerFn(getNotificationPreferences);
  const savePrefs = useServerFn(saveNotificationPreferences);

  const [prefs, setPrefs] = useState({ daily_summary: true, milestones: true, per_sale: true, bot_offline: true });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const status = getPWAStatus();
    setPwa(status);
    if (!status.isSupported || !status.isInstalled) return;

    (async () => {
      try {
        const OneSignal = await getOneSignal();
        const isOptedIn = !!OneSignal.User?.PushSubscription?.optedIn;
        setEnabled(isOptedIn);
      } catch (e) {
        console.warn("[push] failed to read OneSignal state", e);
      }
    })();

    fetchPrefs().then((p) => setPrefs(p)).catch(() => {});
  }, []);

  async function togglePref(key: "daily_summary" | "milestones" | "per_sale" | "bot_offline", value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    try {
      await savePrefs({ data: next });
    } catch {
      toast.error("Falha ao salvar preferência");
      setPrefs(prefs);
    }
  }

  async function enable() {
    setLoading(true);
    try {
      const OneSignal = await getOneSignal();
      if (user?.id) await OneSignal.login(user.id);
      await OneSignal.User.PushSubscription.optOut();
      await OneSignal.User.PushSubscription.optIn();
      const permission = OneSignal.Notifications.permission;
      const subscription = OneSignal.User.PushSubscription;
      if (!permission || !subscription.optedIn || !subscription.id) {
        toast.error("Permissão negada. Ative nas configurações do dispositivo.");
        return;
      }
      setEnabled(true);
      toast.success("Notificações ativadas com sucesso!");
      const result = await testFn({ data: { subscriptionId: subscription.id } });
      if (!result?.ok) {
        console.error("[push] test notification failed", result);
        toast.error(`Assinatura ativada, mas o teste falhou: ${result?.reason ?? "erro no OneSignal"}`);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Falha ao ativar notificações");
    } finally {
      setLoading(false);
    }
  }

  async function disable() {
    setLoading(true);
    try {
      const OneSignal = await getOneSignal();
      await OneSignal.User.PushSubscription.optOut();
      setEnabled(false);
      toast.success("Notificações desativadas.");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao desativar");
    } finally {
      setLoading(false);
    }
  }

  async function sendTest() {
    setSendingTest(true);
    try {
      const OneSignal = await getOneSignal();
      if (user?.id) await OneSignal.login(user.id);
      const subscriptionId = OneSignal.User?.PushSubscription?.id;
      if (!subscriptionId) {
        toast.error("Assinatura do dispositivo não encontrada. Desative e ative novamente as notificações.");
        return;
      }
      const result = await testFn({ data: { subscriptionId } });
      if (result?.ok) {
        toast.success("Notificação de teste enviada! Verifique seu dispositivo.");
      } else {
        toast.error(`Falha ao enviar teste: ${result?.reason ?? "assinatura inválida no OneSignal"}`);
        console.error("[push] test failed", result);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao enviar teste");
    } finally {
      setSendingTest(false);
    }
  }

  // ESTADO 1 — App não instalado (browser)
  if (pwa.isBrowser) {
    return (
      <>
        <Card className="p-6 bg-gradient-card md:col-span-2">
          <div className="flex items-start gap-3 mb-4">
            <div className="size-10 rounded-xl bg-accent grid place-items-center">
              <Smartphone className="size-5 text-accent-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-display font-semibold">Instale o ScaleUp para ativar notificações</h3>
              <p className="text-xs text-muted-foreground mt-1">
                As notificações push funcionam apenas quando o app está instalado na tela inicial do seu celular.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowHowTo(true)}
            className="w-full rounded-lg bg-gradient-primary text-primary-foreground text-sm font-medium py-3 hover:opacity-90 shadow-glow transition"
          >
            Como instalar o app
          </button>
        </Card>

        {showHowTo && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setShowHowTo(false)}>
            <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 relative" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setShowHowTo(false)} className="absolute top-4 right-4 p-1 rounded-lg hover:bg-muted">
                <X className="size-4" />
              </button>
              <h3 className="font-display font-semibold text-lg mb-4">Como instalar o ScaleUp</h3>

              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-background/40 p-4">
                  <p className="text-sm font-semibold mb-2 flex items-center gap-2">📱 iPhone (Safari)</p>
                  <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                    <li>Toque no botão <Share className="inline size-3" /> <strong>Compartilhar</strong> na barra inferior</li>
                    <li>Role e escolha <strong>Adicionar à Tela de Início</strong></li>
                    <li>Toque em <strong>Adicionar</strong> no canto superior direito</li>
                  </ol>
                </div>

                <div className="rounded-xl border border-border bg-background/40 p-4">
                  <p className="text-sm font-semibold mb-2 flex items-center gap-2">🤖 Android (Chrome)</p>
                  <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                    <li>Toque nos <MoreVertical className="inline size-3" /> <strong>3 pontos</strong> no canto superior direito</li>
                    <li>Escolha <strong>Adicionar à tela inicial</strong></li>
                    <li>Confirme tocando em <strong>Adicionar</strong></li>
                  </ol>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Depois de instalado, abra o ScaleUp pelo ícone da tela inicial e volte aqui para ativar as notificações.
                </p>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <Card className="p-6 bg-gradient-card md:col-span-2">
      <div className="flex items-start gap-3 mb-4">
        <div className="size-10 rounded-xl bg-accent grid place-items-center">
          {enabled ? <Bell className="size-5 text-accent-foreground" /> : <BellOff className="size-5 text-accent-foreground" />}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-semibold">Notificações Push</h3>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              PWA
            </span>
            {enabled && <Volume2 className="size-4 text-primary" />}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {loading ? "Configurando..." : enabled ? "Alertas de vendas ativos" : "Clique para ativar alertas de vendas"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          <Switch
            checked={enabled}
            disabled={loading}
            onCheckedChange={(v) => (v ? enable() : disable())}
          />
        </div>
      </div>

      {enabled && (
        <>
          <button
            type="button"
            onClick={sendTest}
            disabled={sendingTest}
            className="mt-4 w-full rounded-lg border border-primary/40 bg-primary/10 hover:bg-primary/20 text-sm font-medium py-2.5 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {sendingTest ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {sendingTest ? "Enviando..." : "Enviar notificação de teste"}
          </button>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <button
              type="button"
              onClick={() => togglePref("per_sale", !prefs.per_sale)}
              className={`text-left rounded-lg border bg-background/40 p-3 flex items-center gap-3 transition ${prefs.per_sale ? "border-emerald-500/40" : "border-border opacity-60"}`}
            >
              <div className="size-9 rounded-lg bg-emerald-500/15 text-emerald-400 grid place-items-center">
                <DollarSign className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Vendas</p>
                <p className="text-[11px] text-muted-foreground">PIX aprovado</p>
              </div>
              <Switch checked={prefs.per_sale} onCheckedChange={(v) => togglePref("per_sale", v)} />
            </button>
            <button
              type="button"
              onClick={() => togglePref("bot_offline", !prefs.bot_offline)}
              className={`text-left rounded-lg border bg-background/40 p-3 flex items-center gap-3 transition ${prefs.bot_offline ? "border-emerald-500/40" : "border-border opacity-60"}`}
            >
              <div className="size-9 rounded-lg bg-rose-500/15 text-rose-400 grid place-items-center">
                <WifiOff className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Bot Offline</p>
                <p className="text-[11px] text-muted-foreground">Bot fora do ar</p>
              </div>
              <Switch checked={prefs.bot_offline} onCheckedChange={(v) => togglePref("bot_offline", v)} />
            </button>
          </div>

          <div className="mt-3 space-y-2 rounded-lg border border-border bg-background/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Outras preferências</p>
            {([
              { key: "daily_summary", label: "Resumo diário às 20h", desc: "Fechamento do dia com faturamento e ROI" },
              { key: "milestones", label: "Marcos conquistados", desc: "1ª venda, meta batida, 10 vendas/dia, R$ 1.000 no dia" },
            ] as const).map((row) => (
              <div key={row.key} className="flex items-center justify-between gap-3 py-1.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{row.label}</p>
                  <p className="text-xs text-muted-foreground">{row.desc}</p>
                </div>
                <Switch checked={prefs[row.key]} onCheckedChange={(v) => togglePref(row.key, v)} />
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
