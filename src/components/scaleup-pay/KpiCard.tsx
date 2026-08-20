import { Card } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { motion } from "framer-motion";

export function KpiCard({
  title,
  value,
  variation,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string;
  variation?: string;
  icon: any;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <Card className="p-6 bg-gradient-card border-none shadow-card hover:shadow-glow transition-all">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{title}</p>
          <p className="font-display text-3xl font-bold tracking-tight text-foreground">{value}</p>
          {variation && (
            <div className={`flex items-center gap-1 text-xs font-medium ${trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "text-muted-foreground"}`}>
              {trend === "up" ? <ArrowUpRight className="size-3" /> : trend === "down" ? <ArrowDownRight className="size-3" /> : null}
              {variation}
            </div>
          )}
        </div>
        <div className="size-12 rounded-xl bg-muted/50 flex items-center justify-center border border-border/50">
          <Icon className="size-6 text-primary" />
        </div>
      </div>
    </Card>
  );
}
