import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, PlusCircle, Calculator, FileBarChart, History, Settings, Wallet, Menu, X, Moon, Sun, LogOut, Megaphone, User, Upload, Plug } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/registro", label: "Registro Diário", icon: PlusCircle },
  { to: "/anuncios", label: "Gastos c/ Anúncios", icon: Megaphone },
  { to: "/fechamento", label: "Fechamento", icon: Calculator },
  { to: "/integracoes", label: "Integrações", icon: Plug },
  { to: "/relatorios", label: "Relatórios", icon: FileBarChart },
  { to: "/historico", label: "Histórico", icon: History },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(true);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (error) return null;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("ff-theme") : null;
    const isDark = saved ? saved === "dark" : true;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("ff-theme", next ? "dark" : "light");
  };

  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="min-h-screen flex bg-background bg-gradient-hero">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-sidebar-border bg-sidebar/80 backdrop-blur-xl sticky top-0 h-screen">
        <Brand />
        <NavList pathname={pathname} />
        <ThemeToggle dark={dark} onClick={toggleTheme} profile={profile} />
      </aside>

      {/* Topbar mobile */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between px-4 h-14 border-b border-border bg-background/80 backdrop-blur-xl">
        <Brand compact />
        <div className="flex items-center gap-2">
           {profile?.avatar_url && (
            <img src={profile.avatar_url} alt="Profile" className="size-8 rounded-full object-cover border border-border" />
          )}
          <button onClick={() => setOpen(true)} className="p-2 rounded-lg hover:bg-muted">
            <Menu className="size-5" />
          </button>
        </div>
      </div>

      {/* Drawer mobile */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className="lg:hidden fixed left-0 top-0 bottom-0 z-50 w-72 bg-sidebar border-r border-sidebar-border flex flex-col"
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
            >
              <div className="flex items-center justify-between">
                <Brand />
                <button onClick={() => setOpen(false)} className="p-2 mr-3 rounded-lg hover:bg-muted">
                  <X className="size-5" />
                </button>
              </div>
              <NavList pathname={pathname} />
              <ThemeToggle dark={dark} onClick={toggleTheme} profile={profile} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 min-w-0 pt-14 lg:pt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-10">{children}</div>
      </main>
    </div>
  );
}

function Brand({ compact }: { compact?: boolean }) {
  const logoUrl = "https://ynvrijkuampxpsmshftm.supabase.co/storage/v1/object/public/prompt-images/uploads/1780550473717-76e036f0-c55c-4e17-acd2-d98b1b0f50d3.jpeg";
  
  return (
    <div className={`flex items-center gap-2.5 ${compact ? "" : "px-5 py-6"}`}>
      <div className="relative size-10 rounded-xl overflow-hidden shadow-glow bg-white flex items-center justify-center p-1">
        <img src={logoUrl} alt="ScaleUp Logo" className="w-full h-full object-contain" />
      </div>
      <div className="leading-tight">
        <div className="font-display font-bold text-lg tracking-tight text-foreground">ScaleHot</div>
        {!compact && <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium">Gestor Inteligente</div>}
      </div>
    </div>
  );
}

function NavList({ pathname }: { pathname: string }) {
  return (
    <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
      {nav.map((item) => {
        const active = pathname === item.to;
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
              active
                ? "bg-sidebar-accent text-accent-foreground"
                : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-muted/60"
            }`}
          >
            {active && (
              <motion.span
                layoutId="nav-pill"
                className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-full bg-primary"
                transition={{ type: "spring", damping: 22, stiffness: 280 }}
              />
            )}
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function ThemeToggle({ dark, onClick, profile }: { dark: boolean; onClick: () => void; profile: any }) {
  const { signOut } = useAuth();
  return (
    <div className="p-3 border-t border-sidebar-border space-y-1">
      <div className="flex items-center gap-3 px-3 py-2">
        <div className="size-8 rounded-full overflow-hidden bg-muted flex items-center justify-center border border-border">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <User className="size-4 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-sidebar-foreground truncate">{profile?.full_name || "Usuário"}</p>
          <p className="text-[10px] text-muted-foreground truncate">Membro Premium</p>
        </div>
      </div>
      
      <button
        onClick={onClick}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground/80 hover:bg-muted/60 transition"
      >
        {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        {dark ? "Modo Claro" : "Modo Escuro"}
      </button>
      
      <button
        onClick={() => signOut()}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground/80 hover:bg-destructive/10 hover:text-destructive transition"
      >
        <LogOut className="size-4" />
        Sair
      </button>
    </div>
  );
}
