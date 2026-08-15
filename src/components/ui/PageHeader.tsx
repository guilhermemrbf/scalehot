import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, action, className }: { title: string; subtitle?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8 sm:mb-10 ${className || ""}`}>
      <div className="space-y-1.5">
        <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground text-balance">
          {title}
        </h1>
        {subtitle && (
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl leading-relaxed">
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
