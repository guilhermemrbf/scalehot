import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, action, className }: { title: string; subtitle?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-10 sm:mb-12 ${className || ""}`}>
      <div className="space-y-3">
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tighter text-foreground text-balance">
          {title}
        </h1>
        {subtitle && (
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl leading-relaxed font-medium">
            {subtitle}
          </p>
        )}
      </div>
      <div className="flex-shrink-0">
        {action}
      </div>
    </div>
  );
}
