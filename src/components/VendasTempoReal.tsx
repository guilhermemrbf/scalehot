import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { brl } from "@/lib/format";
import { Activity, CheckCircle2, RotateCcw, Wallet } from "lucide-react";
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
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
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
    <Card className="p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--color-primary),0.8)]" />
          <h3 className="font-display text-xl font-bold tracking-tight uppercase">Conversão</h3>
        </div>
        <div className="size-10 rounded-xl bg-muted/50 border border-white/5 grid place-items-center text-muted-foreground">
          <Wallet className="size-5" />
        </div>
      </div>
      
      <div className="flex flex-col items-center justify-center py-16 relative border-b border-white/5 mb-8">
        <div className="size-56 rounded-full border-[14px] border-white/5 flex items-center justify-center relative shadow-inner">
          <div className="absolute inset-0 rounded-full border-[14px] border-primary border-t-transparent border-r-transparent -rotate-45 shadow-[0_0_20px_rgba(var(--color-primary),0.4)]" />
          <div className="flex flex-col items-center">
            <span className="text-5xl font-display font-bold tracking-tighter text-foreground">0.0<span className="text-2xl text-primary ml-0.5">%</span></span>
            <span className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground font-bold mt-1">Conversão</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h4 className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Últimas Atividades</h4>
        <div className="flex items-center gap-2">
           <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 text-[9px] font-bold uppercase tracking-wider"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? "Ocultar" : "Ver Todas"}
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="h-24 grid place-items-center text-[10px] uppercase tracking-wider text-muted-foreground text-center px-4">
          Sem atividades recentes.
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
          <AnimatePresence initial={false}>
            {items.map((tx) => {
              const isRefund = tx.type === "refund";
              const color = isRefund
                ? "text-destructive"
                : "text-success";
              const Icon = isRefund ? RotateCcw : CheckCircle2;
              const name = tx.client_name || "Cliente";
              return (
                <motion.div
                  key={tx.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`size-8 rounded-lg grid place-items-center bg-muted/30 border border-white/5 shrink-0 ${color}`}>
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate uppercase tracking-tight">{name}</p>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-widest">
                        {fmtDateTime(tx.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold tracking-tight">{brl(tx.amount)}</p>
                    <p className={`text-[9px] font-bold uppercase tracking-widest ${color}`}>
                      {isRefund ? "Reembolso" : "Aprovado"}
                    </p>
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
