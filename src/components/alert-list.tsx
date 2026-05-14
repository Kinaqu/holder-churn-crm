import type { Alert } from "@/lib/types";
import { RiskBadge, SourceBadge } from "@/components/ui/badges";
import { WalletAddress } from "@/components/ui/address";

export function AlertList({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
        <h3 className="font-semibold text-white">No source-backed alerts yet</h3>
        <p className="mt-1 text-sm text-slate-400">Alerts appear after snapshots produce meaningful churn, whale, distribution, or price-quality signals.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <article key={alert.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <RiskBadge severity={alert.severity} />
                {alert.walletAddress ? <WalletAddress value={alert.walletAddress} /> : null}
              </div>
              <h3 className="mt-3 text-base font-semibold text-white">{alert.title}</h3>
              <p className="mt-1 text-sm text-slate-300">{alert.message}</p>
            </div>
            <span className="text-sm text-slate-400">{alert.confidence}% confidence</span>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Why</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-300">
                {alert.reason.map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Next actions</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-300">
                {alert.nextBestActions.map((action) => <li key={action}>{action}</li>)}
              </ul>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {alert.sourceEndpoints.map((source) => <SourceBadge key={source} source={source} />)}
          </div>
        </article>
      ))}
    </div>
  );
}
