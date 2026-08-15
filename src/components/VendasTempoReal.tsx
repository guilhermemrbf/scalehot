import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { brl } from "@/lib/format";
import { Activity, CheckCircle2, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";

type Tx = {
  id: string;
  gateway: string;
  transaction_id: string | null;
  type: string;
  status: string;
  amount: number;
  liquid_amount: number | null;
  client_name: string | null;
  client_email: string | null;
  created_at: string;
};

const fmtDateTime = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};

export function VendasTempoReal() {
  const { user } = useAuth();
  const [items, setItems] = useState<Tx[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    (async () => {
      let query = supabase
        .from("transactions" as any)
        .select("*")
        .order("created_at", { ascending: false });
      
      if (!showAll) {
        query = query.limit(10);
      }

      const { data } = await query;
      if (mounted && data) setItems(data as any);
    })();

    const channel = supabase
      .channel(`transactions_rt_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*", // Changed from INSERT to * to catch updates and deletions if needed, but primarily to ensure we catch everything
          schema: "public",
          table: "transactions",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Invalidate and refetch is safer than manual splicing for complex status changes
          (async () => {
            let query = supabase
              .from("transactions" as any)
              .select("*")
              .order("created_at", { ascending: false });
            
            if (!showAll) {
              query = query.limit(10);
            }

            const { data } = await query;
            if (mounted && data) setItems(data as any);
          })();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id, showAll]);

  return (
    <Card className="p-6 mt-8 bg-card/40 border-white/5 backdrop-blur-md shadow-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Activity className="size-6 text-primary animate-pulse" />
            <h3 className="font-display text-2xl font-bold tracking-tight">Fluxo de Transações</h3>
          </div>
          <p className="text-xs text-muted-foreground font-medium">Monitoramento em tempo real da sua operação digital.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant={showAll ? "default" : "outline"} 
            size="sm" 
            className="h-9 px-4 text-[10px] font-bold uppercase tracking-widest rounded-xl"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? "Ver Menos" : "Ver Tudo"}
          </Button>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
            {showAll ? "Arquivo" : "Live"}
          </span>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="h-40 grid place-items-center text-sm text-muted-foreground/60 text-center px-4 border border-dashed border-white/10 rounded-2xl">
          <div className="space-y-2">
            <p>Aguardando webhooks dos seus gateways...</p>
            <p className="text-[10px] uppercase tracking-widest">Conecte um gateway na aba Integrações</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {items.map((tx, idx) => {
              const isRefund = tx.type === "refund";
              const color = isRefund
                ? "text-destructive bg-destructive/10 border-destructive/20"
                : "text-success bg-success/10 border-success/20";
              const Icon = isRefund ? RotateCcw : CheckCircle2;
              const label = isRefund ? "Estorno" : "Aprovado";
              const name = tx.client_name || "Pagamento";
              
              return (
                <motion.div
                  key={tx.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    transition: { delay: idx * 0.05 }
                  }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/[0.08] transition-all duration-300 group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`size-12 rounded-xl grid place-items-center border shrink-0 transition-transform duration-500 group-hover:rotate-6 ${color}`}>
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="font-bold truncate text-sm sm:text-base">{name}</p>
                        <span className="text-[9px] uppercase tracking-widest font-black px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/20 shrink-0">
                          {tx.gateway}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                        {fmtDateTime(tx.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {(() => {
                      const bruto = Number(tx.amount) || 0;
                      const liq = tx.liquid_amount != null ? Number(tx.liquid_amount) : null;
                      const taxa = liq != null ? Math.max(0, bruto - liq) : null;
                      return (
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">BRUTO</span>
                            <span className="font-display font-bold tracking-tight tabular-nums text-foreground">{brl(bruto)}</span>
                          </div>
                          {liq != null && (
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] uppercase tracking-widest text-success/60 font-bold">LÍQUIDO</span>
                              <span className="text-sm font-bold tabular-nums text-success">{brl(liq)}</span>
                            </div>
                          )}
                          <div className={`text-[9px] uppercase tracking-widest font-black px-2 py-0.5 rounded-md border ${color}`}>
                            {label}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </Card>
  );
}
