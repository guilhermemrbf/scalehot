import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useLocation,
  useNavigate,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/lib/auth";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">A página que você procura não existe.</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Erro ao carregar a página</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Tentar novamente</button>
          <a href="/" className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent">Início</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" },
      { title: "ScaleUp — Infraestrutura para crescimento digital" },
      { name: "description", content: "Toda venda conta. Toda decisão importa." },
      { name: "application-name", content: "ScaleUp" },
      { name: "theme-color", content: "#000000" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "ScaleUp" },
      { property: "og:title", content: "ScaleUp — Infraestrutura para crescimento digital" },
      { name: "twitter:title", content: "ScaleUp — Infraestrutura para crescimento digital" },
      { property: "og:description", content: "Toda venda conta. Toda decisão importa." },
      { name: "twitter:description", content: "Toda venda conta. Toda decisão importa." },
      { property: "og:image", content: "/icon-512.png" },
      { name: "twitter:image", content: "/icon-512.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "manifest", href: "/manifest.json" },
      { rel: "icon", type: "image/png", href: "/icon-192.png" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { pathname } = useLocation();

  const isPanelRoute = pathname === "/painel" || pathname === "/painel/" || pathname.startsWith("/painel/");
  const isPublicRoute = pathname === "/login" || pathname === "/cadastro" || pathname.startsWith("/checkout") || pathname.startsWith("/pagamento") || isPanelRoute;


  useEffect(() => {
    if (loading) return;
    // Se estiver em uma rota administrativa e não estiver logado, vai pro login
    if (!user && !isPublicRoute) {
      navigate({ to: "/login", replace: true });
    }

  }, [user, loading, isPublicRoute, navigate]);

  useEffect(() => {
    queryClient.invalidateQueries();
    router.invalidate();
  }, [user?.id, queryClient, router]);

  if (loading && !isPublicRoute) {
    return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Carregando...</div>;
  }
  if (!user && !isPublicRoute) return null;
  return <>{children}</>;
}

function OneSignalBootstrap() {
  const { user } = useAuth();
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    (async () => {
      const { loadOneSignal, loginOneSignal, logoutOneSignal } = await import("@/lib/onesignal");
      const { installSaleSoundListener, playSaleSound } = await import("@/lib/sale-sound");
      installSaleSoundListener();
      const OneSignal = await loadOneSignal();
      if (cancelled) return;
      try {
        OneSignal.Notifications.addEventListener("foregroundWillDisplay", () => {
          playSaleSound();
        });
      } catch {
        // ignora
      }
      if (user?.id) await loginOneSignal(user.id);
      else await logoutOneSignal();
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user?.id]);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // Limpa qualquer service worker antigo (VAPID); OneSignal gerencia o seu próprio
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => {
        const url = r.active?.scriptURL ?? "";
        if (url.endsWith("/sw.js") || url.endsWith("/service-worker.js")) r.unregister();
      });
    });
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OneSignalBootstrap />
        <AuthGate>
          <Outlet />
        </AuthGate>
        <Toaster position="top-right" theme="dark" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}
