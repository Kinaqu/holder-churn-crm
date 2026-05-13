import { ArrowRight, ListChecks } from "lucide-react";
import type { Alert } from "@/lib/types";
import { RiskBadge, SourceBadge } from "@/components/ui/badges";

export function NextBestActionPanel({ alerts }: { alerts: Alert[] }) {
  const primary = alerts[0];
  if (!primary) return null;

  return (
    <section className="panel rounded-lg p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-signal-green">Next Best Actions</p>
          <h2 className="mt-2 text-xl font-semibold text-white">{primary.title}</h2>
        </div>
        <RiskBadge severity={primary.severity} />
      </div>
      <p className="mt-3 text-sm text-slate-300">{primary.message}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {primary.sourceEndpoints.map((source) => <SourceBadge key={source} source={source} />)}
      </div>
      <div className="mt-5 space-y-3">
        {primary.nextBestActions.map((action, index) => (
          <div key={action} className="flex gap-3 rounded-md border border-white/10 bg-white/[0.04] p-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-signal-green/15 text-xs text-signal-green">{index + 1}</span>
            <p className="text-sm text-slate-200">{action}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-2 text-sm text-slate-400">
        <ListChecks className="h-4 w-4 text-signal-green" />
        <span>{primary.confidence}% confidence from source-backed rules</span>
        <ArrowRight className="h-4 w-4" />
      </div>
    </section>
  );
}
