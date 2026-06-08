import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { brl } from "@/lib/format";
import { Activity, CheckCircle2, RotateCcw, ArrowDownCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type SyncpayTx = {
  id: string;
  transaction_id: string;
  type: string;
  status: string;
  amount: number;
  liquid_amount: number | null;
  client_name: string | null;
  beneficiary_name: string | null;
  data_registro: string | null;
  created_at: string;
};

const fmtDateTime = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};

export function VendasTempoReal() {
  const [items, setItems] = useState<SyncpayTx[]>([]);
  const [highlight, setHighlight] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("syncpay_transactions" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (mounted && data) setItems(data as any);
    })();

    const channel = supabase
      .channel("syncpay_transactions_rt")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "syncpay_transactions" },
        (payload) => {
          const tx = payload.new as SyncpayTx;
          setItems((prev) => [tx, ...prev].slice(0, 10));
          setHighlight(tx.id);
          setTimeout(() => setHighlight(null), 1500);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Card className="p-5 mt-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="size-5 text-primary" />
          <h3 className="font-display text-xl font-bold tracking-tight">Vendas em Tempo Real</h3>
        </div>
        <span className="text-xs text-muted-foreground">Últimas 10 transações</span>
      </div>

      {items.length === 0 ? (
        <div className="h-32 grid place-items-center text-sm text-muted-foreground">
          Aguardando webhooks da Syncpay…
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {items.map((tx) => {
              const isRefund = tx.type === "refund";
              const isCashout = tx.type === "cashout";
              const color = isRefund
                ? "text-destructive bg-destructive/10 border-destructive/30"
                : isCashout
                ? "text-warning bg-warning/10 border-warning/30"
                : "text-success bg-success/10 border-success/30";
              const Icon = isRefund ? RotateCcw : isCashout ? ArrowDownCircle : CheckCircle2;
              const label = isRefund ? "Reembolso" : isCashout ? "Saque" : "Pago";
              const name = tx.client_name || tx.beneficiary_name || "—";
              return (
                <motion.div
                  key={tx.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    boxShadow: highlight === tx.id ? "0 0 0 2px var(--color-primary)" : "0 0 0 0 transparent",
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`size-9 rounded-lg grid place-items-center border ${color}`}>
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{name}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmtDateTime(tx.data_registro || tx.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display font-bold tracking-tight">{brl(Number(tx.amount))}</p>
                    {tx.liquid_amount != null && (
                      <p className="text-xs text-muted-foreground">Líq: {brl(Number(tx.liquid_amount))}</p>
                    )}
                    <span className={`inline-block text-[10px] uppercase tracking-wider font-bold mt-0.5 px-1.5 py-0.5 rounded ${color}`}>
                      {label}
                    </span>
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
