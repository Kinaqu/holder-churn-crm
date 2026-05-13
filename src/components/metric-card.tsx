import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "neutral"
}: {
  label: string;
  value: string | number;
  detail: string;
  icon?: LucideIcon;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  return (
    <div className="panel rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
        </div>
        {Icon ? (
          <div
            className={cn(
              "rounded-md border p-2",
              tone === "good" && "border-signal-green/30 bg-signal-green/10 text-signal-green",
              tone === "warn" && "border-signal-amber/30 bg-signal-amber/10 text-signal-amber",
              tone === "bad" && "border-signal-rose/30 bg-signal-rose/10 text-signal-rose",
              tone === "neutral" && "border-signal-cyan/25 bg-signal-cyan/10 text-signal-cyan"
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </div>
      <p className="mt-3 text-sm text-slate-400">{detail}</p>
    </div>
  );
}
