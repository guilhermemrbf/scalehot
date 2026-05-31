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
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ScaleHot — Gestor Financeiro Inteligente" },
      { name: "description", content: "Controle de faturamento, fechamento de caixa e análise de taxas em um só lugar." },
      { property: "og:title", content: "ScaleHot — Gestor Financeiro Inteligente" },
      { name: "twitter:title", content: "ScaleHot — Gestor Financeiro Inteligente" },
      { property: "og:description", content: "Controle de faturamento, fechamento de caixa e análise de taxas em um só lugar." },
      { name: "twitter:description", content: "Controle de faturamento, fechamento de caixa e análise de taxas em um só lugar." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/23389ff4-eb62-4dd9-b8bf-aa1dcbfb9e3f/id-preview-36d64601--e3968793-6951-43b6-8ee9-d636719809a5.lovable.app-1780121246214.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/23389ff4-eb62-4dd9-b8bf-aa1dcbfb9e3f/id-preview-36d64601--e3968793-6951-43b6-8ee9-d636719809a5.lovable.app-1780121246214.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
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

  useEffect(() => {
    if (loading) return;
    if (!user && pathname !== "/login") navigate({ to: "/login", replace: true });
  }, [user, loading, pathname, navigate]);

  useEffect(() => {
    queryClient.invalidateQueries();
    router.invalidate();
  }, [user?.id, queryClient, router]);

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Carregando...</div>;
  }
  if (!user && pathname !== "/login") return null;
  return <>{children}</>;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGate>
          <Outlet />
        </AuthGate>
        <Toaster position="top-right" theme="dark" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}
