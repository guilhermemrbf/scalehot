import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  getVapidPublicKey,
  savePushSubscription,
  removePushSubscription,
  sendTestNotification,
  getNotificationPreferences,
  saveNotificationPreferences,
} from "@/lib/push.functions";


function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function NotificationsCard() {
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inIframe, setInIframe] = useState(false);

  const fetchVapid = useServerFn(getVapidPublicKey);
  const saveSub = useServerFn(savePushSubscription);
  const removeSub = useServerFn(removePushSubscription);
  const testFn = useServerFn(sendTestNotification);
  const fetchPrefs = useServerFn(getNotificationPreferences);
  const savePrefs = useServerFn(saveNotificationPreferences);

  const [prefs, setPrefs] = useState({ daily_summary: true, milestones: true, per_sale: true });


  useEffect(() => {
    if (typeof window === "undefined") return;
    try { setInIframe(window.self !== window.top); } catch { setInIframe(true); }
    const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSupported(ok);
    if (!ok) return;
    setPermission(Notification.permission);
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setEnabled(!!sub))
      .catch(() => {});
    fetchPrefs().then((p) => setPrefs(p)).catch(() => {});
  }, []);

  async function togglePref(key: "daily_summary" | "milestones" | "per_sale", value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    try {
      await savePrefs({ data: next });
    } catch (e: any) {
      toast.error("Falha ao salvar preferência");
      setPrefs(prefs);
    }
  }


  async function enable() {
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        toast.error("Permissão negada. Ative as notificações nas configurações do navegador.");
        return;
      }
      const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/service-worker.js"));
      await navigator.serviceWorker.ready;
      const { publicKey } = await fetchVapid();
      if (!publicKey) throw new Error("Chave VAPID não configurada");
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }
      await saveSub({ data: { subscription: sub.toJSON() as any } });
      setEnabled(true);
      toast.success("Notificações ativadas com sucesso!");
      await testFn();
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
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      await removeSub({ data: undefined });
      setEnabled(false);
      toast.success("Notificações desativadas.");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao desativar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-6 bg-gradient-card md:col-span-2">
      <div className="flex items-start gap-3 mb-4">
        <div className="size-10 rounded-xl bg-accent grid place-items-center">
          {enabled ? <Bell className="size-5 text-accent-foreground" /> : <BellOff className="size-5 text-accent-foreground" />}
        </div>
        <div className="flex-1">
          <h3 className="font-display font-semibold">Notificações Push</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Ative as notificações para receber alertas de novas vendas em tempo real, mesmo com o app fechado.
          </p>
        </div>
      </div>

      {!supported ? (
        <p className="text-sm text-destructive">Seu navegador não suporta notificações push.</p>
      ) : inIframe ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
          <p className="font-medium">Você está vendo o preview do editor</p>
          <p className="mt-1 text-xs text-amber-200/80">
            As notificações push só funcionam no app publicado. Abra
            <span className="font-mono mx-1">scalehot.lovable.app</span>
            no celular, instale como PWA (Adicionar à tela inicial) e ative o toggle por lá.
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between bg-background/40 rounded-lg p-4 border border-border">
          <div className="flex-1 pr-4">
            <p className="text-sm font-medium">Ativar Notificações</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {permission === "denied"
                ? "Permissão bloqueada neste navegador. Toque no cadeado da barra de endereço → Notificações → Permitir."
                : enabled
                ? "✅ Ativado — você receberá alertas a cada nova venda."
                : "Toque no botão para receber alertas a cada nova venda."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            <Switch
              checked={enabled}
              disabled={loading || permission === "denied"}
              onCheckedChange={(v) => (v ? enable() : disable())}
            />
          </div>
        </div>
      )}

      {enabled && !inIframe && (
        <div className="mt-3 space-y-2 rounded-lg border border-border bg-background/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Preferências</p>
          {([
            { key: "per_sale", label: "Notificação a cada venda", desc: "Alerta imediato quando entra uma venda" },
            { key: "daily_summary", label: "Resumo diário às 20h", desc: "Fechamento do dia com faturamento e ROI" },
            { key: "milestones", label: "Alertas de marcos conquistados", desc: "1ª venda, meta batida, 10 vendas/dia, R$ 1.000 no dia" },
          ] as const).map((row) => (
            <div key={row.key} className="flex items-center justify-between gap-3 py-1.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{row.label}</p>
                <p className="text-xs text-muted-foreground">{row.desc}</p>
              </div>
              <Switch
                checked={prefs[row.key]}
                onCheckedChange={(v) => togglePref(row.key, v)}
              />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
