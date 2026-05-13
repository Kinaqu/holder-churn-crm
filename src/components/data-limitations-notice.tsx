import { Info } from "lucide-react";

export function DataLimitationsNotice() {
  return (
    <div className="rounded-lg border border-signal-amber/25 bg-signal-amber/10 p-4 text-sm text-slate-200">
      <div className="flex gap-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-signal-amber" />
        <div>
          <p className="font-medium text-white">Data limitations are shown by design.</p>
          <p className="mt-1 text-slate-300">
            Holder tracking is based on Birdeye top-holder snapshots. A missing wallet means likely exited or dropped below the tracked threshold. Campaign retention needs enough historical snapshots, and wallet enrichment is selective to stay under the safe API budget.
          </p>
        </div>
      </div>
    </div>
  );
}
