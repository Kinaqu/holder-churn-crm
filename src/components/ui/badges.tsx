import type { BirdeyeSource, SegmentType, Severity } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

export function SourceBadge({ source }: { source: BirdeyeSource }) {
  return <span className="rounded-full border border-signal-cyan/25 bg-signal-cyan/10 px-2 py-1 text-xs text-signal-cyan">{source}</span>;
}

export function RiskBadge({ severity }: { severity: Severity | "clear" | "caution" | "unknown" }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-1 text-xs capitalize",
        severity === "critical" || severity === "high"
          ? "border-signal-rose/35 bg-signal-rose/10 text-signal-rose"
          : severity === "medium" || severity === "caution"
            ? "border-signal-amber/35 bg-signal-amber/10 text-signal-amber"
            : "border-signal-green/35 bg-signal-green/10 text-signal-green"
      )}
    >
      {severity}
    </span>
  );
}

export function SegmentBadge({ segment }: { segment: SegmentType }) {
  const label = segment.toLowerCase().replaceAll("_", " ");
  const risky = ["WHALE_REDUCED", "LIKELY_EXITED", "RETAIL_CHURN", "CONCENTRATION_SHOCK"].includes(segment);
  const positive = ["WHALE_ACCUMULATED", "NEW_HOLDER", "RETURNING_HOLDER", "LOYAL_HOLDER"].includes(segment);
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-1 text-xs capitalize",
        risky
          ? "border-signal-rose/30 bg-signal-rose/10 text-signal-rose"
          : positive
            ? "border-signal-green/30 bg-signal-green/10 text-signal-green"
            : "border-slate-500/30 bg-white/5 text-slate-300"
      )}
    >
      {label}
    </span>
  );
}
