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
    <Card className="p-5 mt-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Activity className="size-5 text-primary" />
            <h3 className="font-display text-xl font-bold tracking-tight">Últimas Vendas</h3>
          </div>
          <p className="text-xs text-muted-foreground">Mostrando transações de vendas e reembolsos em tempo real.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant={showAll ? "default" : "outline"} 
            size="sm" 
            className="h-8 text-xs font-bold uppercase tracking-wider"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? "Ocultar" : "Mostrar Todas"}
          </Button>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 bg-muted px-2 py-1 rounded">
            {showAll ? "Histórico Completo" : "Tempo real"}
          </span>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="h-32 grid place-items-center text-sm text-muted-foreground text-center px-4">
          Aguardando webhooks dos seus gateways… Conecte um gateway na aba Integrações.
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {items.map((tx) => {
              const isRefund = tx.type === "refund";
              const isPending = tx.status === "PENDING";
              if (isPending) return null; // Não mostrar pendentes no painel

              const color = isRefund
                ? "text-destructive bg-destructive/10 border-destructive/30"
                : "text-success bg-success/10 border-success/30";
              const Icon = isRefund ? RotateCcw : CheckCircle2;
              const label = isRefund ? "Reembolso" : "Pago";
              const name = tx.client_name || "Cliente";
              return (
                <motion.div
                  key={tx.id}
                  layout
                  initial={{ opacity: 0, y: -10, scale: 0.98 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    boxShadow:
                      highlight === tx.id
                        ? "0 0 0 2px var(--color-primary)"
                        : "0 0 0 0 transparent",
                  }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`size-9 rounded-lg grid place-items-center border shrink-0 ${color}`}>
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{name}</p>
                        <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                          {tx.gateway}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
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
                        <div className="space-y-0.5">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Bruto</span>
                            <span className="font-display font-bold tracking-tight tabular-nums">{brl(bruto)}</span>
                          </div>
                          {liq != null && (
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-[10px] uppercase tracking-wider text-success/80">Líquido</span>
                              <span className="text-sm font-semibold tabular-nums text-success">{brl(liq)}</span>
                            </div>
                          )}
                          {taxa != null && (
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-[10px] uppercase tracking-wider text-destructive/80">Taxa</span>
                              <span className="text-sm font-semibold tabular-nums text-destructive">− {brl(taxa)}</span>
                            </div>
                          )}
                          <span className={`inline-block text-[10px] uppercase tracking-wider font-bold mt-1 px-1.5 py-0.5 rounded ${color}`}>
                            {label}
                          </span>
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
