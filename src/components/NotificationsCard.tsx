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
  }, []);

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
      ) : (
        <div className="flex items-center justify-between bg-background/40 rounded-lg p-4 border border-border">
          <div>
            <p className="text-sm font-medium">Ativar Notificações</p>
            <p className="text-xs text-muted-foreground">
              {permission === "denied"
                ? "Bloqueado. Ative manualmente nas configurações do navegador."
                : enabled
                ? "Você receberá alertas a cada nova venda."
                : "Receba alertas a cada nova venda."}
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
    </Card>
  );
}
