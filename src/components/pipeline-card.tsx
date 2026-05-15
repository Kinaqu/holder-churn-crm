import { CheckCircle2, CircleDashed, Database, ShieldAlert } from "lucide-react";
import type { PipelineRun } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

export function BirdeyePipelineCard({ run, large = false }: { run: PipelineRun; large?: boolean }) {
  return (
    <section className={cn("panel relative overflow-hidden rounded-lg p-5", large && "p-6")}>
      <div className="absolute inset-0 grid-overlay opacity-60" />
      <div className="relative">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-signal-cyan">Birdeye Intelligence Pipeline</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Snapshot source coverage</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Birdeye provides holder, transfer, distribution, price, wallet, and security primitives. Holder Churn CRM turns them into retention cohorts, risk signals, and actions.
            </p>
          </div>
            <div className="w-fit rounded-md border border-signal-cyan/25 bg-signal-cyan/10 px-3 py-2 text-sm text-signal-cyan">
              {run.status === "partial" ? "Partial snapshot success" : run.status}
            </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {run.sources.map((source) => (
            <div key={source.source} className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-graphite-950/55 p-3">
              <div className="flex items-center gap-3">
                <div className={cn("rounded-md border p-2", source.status === "complete" ? "border-signal-green/30 bg-signal-green/10 text-signal-green" : source.status === "missing" ? "border-signal-rose/30 bg-signal-rose/10 text-signal-rose" : "border-signal-amber/30 bg-signal-amber/10 text-signal-amber")}>
                  {source.status === "complete" ? <CheckCircle2 className="h-4 w-4" /> : source.status === "missing" ? <ShieldAlert className="h-4 w-4" /> : <CircleDashed className="h-4 w-4" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{source.source}</p>
                  <p className="text-xs text-slate-400">{source.detail}</p>
                </div>
              </div>
              <span className="font-mono text-xs text-slate-400">{source.calls} calls</span>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <PipelineStat label="API calls" value={`${run.apiCallsUsed} / ${run.apiSafeBudget}`} />
          <PipelineStat label="Cache hit rate" value={`${Math.round((run.cacheHits / Math.max(1, run.cacheHits + run.cacheMisses)) * 100)}%`} />
          <PipelineStat label="Holders scanned" value={run.holdersScanned.toLocaleString()} />
          <PipelineStat label="Rate-limit mode" value={run.stayedUnderLimit ? "Efficient" : "Warning"} />
        </div>
      </div>
    </section>
  );
}

function PipelineStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Database className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
