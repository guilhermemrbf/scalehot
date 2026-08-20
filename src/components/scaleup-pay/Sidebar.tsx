import { Link } from "@tanstack/react-router";
import { LayoutDashboard, Receipt, Link2, Wallet, Key, Settings, LogOut, ShieldCheck, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";
import { useRouterState } from "@tanstack/react-router";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/vendas", label: "Minhas Vendas", icon: Receipt },
  { to: "/links-pagamento", label: "Links de Pagamento", icon: Link2 },
  { to: "/saques", label: "Saques", icon: Wallet },
  { to: "/api-keys", label: "Chaves de API", icon: Key },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

export function Sidebar() {
  const { user, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-sidebar-border bg-sidebar/80 backdrop-blur-xl sticky top-0 h-screen z-50">
      <div className="px-6 py-8">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary flex items-center justify-center shadow-glow">
            <ShieldCheck className="size-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg tracking-tight">ScaleUp Pay</h1>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Fintech Solutions</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
                active
                  ? "bg-sidebar-accent text-primary"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className={`size-4 shrink-0 ${active ? "text-primary" : "group-hover:text-foreground"}`} />
                {item.label}
              </div>
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full bg-primary"
                  transition={{ type: "spring", damping: 20, stiffness: 200 }}
                />
              )}
              {active && <ChevronRight className="size-3 text-primary/50" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-3 mb-2 rounded-xl bg-muted/30 border border-border/50">
          <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
            <span className="text-xs font-bold text-primary">{user?.email?.[0].toUpperCase()}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold truncate">{user?.email}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Merchant</p>
          </div>
        </div>
        
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="size-4" />
          Sair da Conta
        </button>
      </div>
    </aside>
  );
}
