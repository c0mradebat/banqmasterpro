import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  accent = "primary",
  hint,
}: {
  label: string;
  value: string | number;
  delta?: string;
  icon: LucideIcon;
  accent?: "primary" | "success" | "warning" | "danger";
  hint?: string;
}) {
  const ring = {
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    danger: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  }[accent];

  return (
    <div className="stat-card group">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight">{value}</div>
          {(delta || hint) && (
            <div className={cn("text-xs", delta ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
              {delta || hint}
            </div>
          )}
        </div>
        <div className={cn("rounded-lg p-2.5 transition-transform group-hover:scale-110", ring)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
