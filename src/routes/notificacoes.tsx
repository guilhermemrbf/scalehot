import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Bell,
  BellRing,
  DollarSign,
  WifiOff,
  Smartphone,
  Share,
  MoreVertical,
  X,
  Loader2,
  Send,
  Sparkles,
  CheckCircle2,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  sendTestNotification,
  getNotificationPreferences,
  saveNotificationPreferences,
  registerPushSubscription,
  deactivatePushSubscription,
} from "@/lib/push.functions";
import { getOneSignal } from "@/lib/onesignal";

export const Route = createFileRoute("/notificacoes")({
  head: () => ({
    meta: [
      { title: "Notificações — ScaleUp" },
      {
        name: "description",
        content:
          "Ative e personalize as notificações de venda do ScaleUp no seu dispositivo.",
      },
    ],
  }),
  component: NotificacoesPage,
});

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

async function waitForPushSubscription(OneSignal: any) {
  const read = () => ({
    id: OneSignal.User?.PushSubscription?.id as string | undefined,
    token: OneSignal.User?.PushSubscription?.token as string | undefined,
    optedIn: !!OneSignal.User?.PushSubscription?.optedIn,
  });
  const current = read();
  if (current.id && current.token && current.optedIn) return current;
  return new Promise<ReturnType<typeof read>>((resolve) => {
    const timeout = window.setTimeout(() => {
      OneSignal.User?.PushSubscription?.removeEventListener?.("change", listener);
      resolve(read());
    }, 8000);
    function listener(event: any) {
      const next = {
        id: event?.current?.id as string | undefined,
        token: event?.current?.token as string | undefined,
        optedIn: !!event?.current?.optedIn,
      };
      if (next.id && next.token && next.optedIn) {
        window.clearTimeout(timeout);
        OneSignal.User?.PushSubscription?.removeEventListener?.("change", listener);
        resolve(next);
      }
    }
    OneSignal.User?.PushSubscription?.addEventListener?.("change", listener);
  });
}

const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

async function prepareOneSignalDevice(OneSignal: any, userId?: string) {
  if (userId) await OneSignal.login(userId);
  if (!OneSignal.Notifications.permission) {
    await OneSignal.Notifications.requestPermission?.();
  }
  await OneSignal.User.PushSubscription.optIn();
  const subscription = await waitForPushSubscription(OneSignal);
  await navigator.serviceWorker
    ?.getRegistration?.("/")
    .then((r) => r?.update())
    .catch(() => {});
  await wait(2000);
  return subscription;
}

type PrefKey = "daily_summary" | "milestones" | "per_sale" | "bot_offline";

function NotificacoesPage() {
  const { user } = useAuth();
  const [pwa, setPwa] = useState({ isInstalled: false, isSupported: false, isBrowser: true });
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [prefs, setPrefs] = useState({
    daily_summary: true,
    milestones: true,
    per_sale: true,
    bot_offline: true,
  });

  const testFn = useServerFn(sendTestNotification);
  const fetchPrefs = useServerFn(getNotificationPreferences);
  const savePrefs = useServerFn(saveNotificationPreferences);
  const registerSubscription = useServerFn(registerPushSubscription);
  const deactivateSubscription = useServerFn(deactivatePushSubscription);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const status = getPWAStatus();
    setPwa(status);
    fetchPrefs().then((p) => setPrefs(p)).catch(() => {});
    if (!status.isSupported || !status.isInstalled) return;
    (async () => {
      try {
        const OneSignal = await getOneSignal();
        const isOptedIn = !!OneSignal.User?.PushSubscription?.optedIn;
        setEnabled(isOptedIn);
        const subscriptionId = OneSignal.User?.PushSubscription?.id as string | undefined;
        const token = OneSignal.User?.PushSubscription?.token as string | undefined;
        if (isOptedIn && subscriptionId && user?.id) {
          await registerSubscription({ data: { subscriptionId, token } });
        }
      } catch (e) {
        console.warn("[push] failed to read OneSignal state", e);
      }
    })();
  }, [user?.id]);

  async function togglePref(key: PrefKey, value: boolean) {
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
      const subscription = await prepareOneSignalDevice(OneSignal, user?.id);
      if (!OneSignal.Notifications.permission || !subscription.optedIn || !subscription.id) {
        toast.error("Permissão negada. Ative nas configurações do dispositivo.");
        return;
      }
      await registerSubscription({ data: { subscriptionId: subscription.id, token: subscription.token } });
      setEnabled(true);
      toast.success("Notificações ativadas!");
      const result = await testFn({ data: { subscriptionId: subscription.id } });
      if (!result?.ok) {
        toast.error(`Ativado, mas teste falhou: ${result?.reason ?? "erro"}`);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao ativar");
    } finally {
      setLoading(false);
    }
  }

  async function disable() {
    setLoading(true);
    try {
      const OneSignal = await getOneSignal();
      const subscriptionId = OneSignal.User?.PushSubscription?.id as string | undefined;
      await OneSignal.User.PushSubscription.optOut();
      if (subscriptionId) await deactivateSubscription({ data: { subscriptionId } });
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
      const subscription = await prepareOneSignalDevice(OneSignal, user?.id);
      if (!subscription.id) {
        toast.error("Assinatura não encontrada. Desative e ative novamente.");
        return;
      }
      await registerSubscription({ data: { subscriptionId: subscription.id, token: subscription.token } });
      const result = await testFn({ data: { subscriptionId: subscription.id } });
      if (result?.ok) toast.success("Notificação de teste enviada!");
      else toast.error(`Falha: ${result?.reason ?? "erro"}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao enviar teste");
    } finally {
      setSendingTest(false);
    }
  }

  const mainPrefs: { key: PrefKey; label: string; desc: string; Icon: any; tone: string }[] = [
    { key: "per_sale", label: "Cada venda aprovada", desc: "Alerta imediato a cada PIX aprovado", Icon: DollarSign, tone: "emerald" },
    { key: "bot_offline", label: "Bot offline", desc: "Avisa quando o bot sai do ar", Icon: WifiOff, tone: "rose" },
    { key: "milestones", label: "Marcos conquistados", desc: "1ª venda, meta batida, R$ 1k no dia", Icon: Sparkles, tone: "amber" },
    { key: "daily_summary", label: "Resumo diário 20h", desc: "Fechamento com faturamento e ROI", Icon: BellRing, tone: "sky" },
  ];

  const toneMap: Record<string, string> = {
    emerald: "bg-emerald-500/15 text-emerald-400",
    rose: "bg-rose-500/15 text-rose-400",
    amber: "bg-amber-500/15 text-amber-400",
    sky: "bg-sky-500/15 text-sky-400",
  };

  return (
    <AppLayout>
      <PageHeader
        title="Notificações"
        subtitle="Ative os alertas de venda no seu celular e personalize o que você quer receber"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl">
        {/* Status / activation card */}
        <Card className="lg:col-span-2 p-6 bg-gradient-card relative overflow-hidden">
          <div className="absolute -top-16 -right-16 size-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="flex items-start gap-4">
              <div className={`size-12 rounded-2xl grid place-items-center shrink-0 ${enabled ? "bg-emerald-500/15 text-emerald-400" : "bg-primary/15 text-primary"}`}>
                {enabled ? <BellRing className="size-6" /> : <Bell className="size-6" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-display font-semibold text-lg">
                    {enabled ? "Notificações ativas" : "Ative as notificações"}
                  </h3>
                  {enabled && <Volume2 className="size-4 text-primary" />}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {pwa.isBrowser
                    ? "Instale o ScaleUp na tela inicial para receber alertas em tempo real."
                    : enabled
                      ? "Você será avisado a cada venda aprovada, direto no seu celular."
                      : "Toque no botão abaixo para permitir alertas neste dispositivo."}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {pwa.isBrowser ? (
                <button
                  onClick={() => setShowHowTo(true)}
                  className="w-full rounded-xl bg-gradient-primary text-primary-foreground text-sm font-semibold py-3.5 hover:opacity-90 shadow-glow transition flex items-center justify-center gap-2"
                >
                  <Smartphone className="size-4" />
                  Instalar o app para ativar as notificações
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={enabled ? disable : enable}
                    disabled={loading}
                    className={`flex-1 rounded-xl text-sm font-semibold py-3.5 transition flex items-center justify-center gap-2 disabled:opacity-50 ${
                      enabled
                        ? "border border-border bg-background/40 hover:bg-background/60"
                        : "bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
                    }`}
                  >
                    {loading ? <Loader2 className="size-4 animate-spin" /> : enabled ? <CheckCircle2 className="size-4" /> : <Bell className="size-4" />}
                    {loading ? "Configurando..." : enabled ? "Notificações ativas" : "Ativar notificações"}
                  </button>
                  {enabled && (
                    <button
                      onClick={sendTest}
                      disabled={sendingTest}
                      className="rounded-xl border border-primary/40 bg-primary/10 hover:bg-primary/20 text-sm font-medium py-3.5 px-4 transition flex items-center gap-2 disabled:opacity-50"
                    >
                      {sendingTest ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                      <span className="hidden sm:inline">Testar</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Info card */}
        <Card className="p-6 bg-gradient-card">
          <div className="size-10 rounded-xl bg-accent grid place-items-center mb-3">
            <Sparkles className="size-5 text-accent-foreground" />
          </div>
          <h3 className="font-display font-semibold mb-2">Por que ativar?</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex gap-2"><CheckCircle2 className="size-4 text-emerald-400 shrink-0 mt-0.5" /><span>Alerta em tempo real a cada venda aprovada</span></li>
            <li className="flex gap-2"><CheckCircle2 className="size-4 text-emerald-400 shrink-0 mt-0.5" /><span>Aviso instantâneo se o bot sair do ar</span></li>
            <li className="flex gap-2"><CheckCircle2 className="size-4 text-emerald-400 shrink-0 mt-0.5" /><span>Resumo do dia sem precisar abrir o app</span></li>
          </ul>
        </Card>

        {/* Personalization */}
        <Card className="lg:col-span-3 p-6 bg-gradient-card">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="font-display font-semibold text-lg">Personalizar alertas</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Escolha o que você quer receber. Suas preferências ficam salvas neste dispositivo e nos próximos.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {mainPrefs.map(({ key, label, desc, Icon, tone }) => {
              const on = prefs[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => togglePref(key, !on)}
                  className={`text-left rounded-xl border p-4 flex items-center gap-3 transition ${
                    on ? "border-primary/40 bg-primary/5" : "border-border bg-background/40 opacity-75 hover:opacity-100"
                  }`}
                >
                  <div className={`size-10 rounded-lg grid place-items-center shrink-0 ${toneMap[tone]}`}>
                    <Icon className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{desc}</p>
                  </div>
                  <Switch checked={on} onCheckedChange={(v) => togglePref(key, v)} />
                </button>
              );
            })}
          </div>
          {!enabled && !pwa.isBrowser && (
            <p className="text-[11px] text-muted-foreground mt-4 text-center">
              Suas preferências serão aplicadas assim que você ativar as notificações acima.
            </p>
          )}
        </Card>
      </div>

      {showHowTo && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setShowHowTo(false)}
        >
          <div
            className="bg-card border border-border rounded-2xl max-w-md w-full p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowHowTo(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-muted"
            >
              <X className="size-4" />
            </button>
            <h3 className="font-display font-semibold text-lg mb-4">Como instalar o ScaleUp</h3>
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-background/40 p-4">
                <p className="text-sm font-semibold mb-2">📱 iPhone (Safari)</p>
                <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                  <li>Toque em <Share className="inline size-3" /> <strong>Compartilhar</strong> na barra inferior</li>
                  <li>Escolha <strong>Adicionar à Tela de Início</strong></li>
                  <li>Confirme em <strong>Adicionar</strong></li>
                </ol>
              </div>
              <div className="rounded-xl border border-border bg-background/40 p-4">
                <p className="text-sm font-semibold mb-2">🤖 Android (Chrome)</p>
                <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                  <li>Toque nos <MoreVertical className="inline size-3" /> <strong>3 pontos</strong> superiores</li>
                  <li>Escolha <strong>Adicionar à tela inicial</strong></li>
                  <li>Confirme em <strong>Adicionar</strong></li>
                </ol>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Depois de instalar, abra o ScaleUp pelo ícone e volte aqui para ativar.
              </p>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
