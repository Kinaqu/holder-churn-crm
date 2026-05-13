import { DataLimitationsNotice } from "@/components/data-limitations-notice";

export default function MethodologyPage() {
  const sections = [
    ["Holder Churn", "Wallets missing from the current tracked holder snapshot are labeled likely exited or dropped below tracked threshold. The app avoids claiming full exits when only top-holder snapshots are available."],
    ["Holder Health", "A transparent heuristic combines retention stability, whale confidence, distribution health, returning activity, new holder quality, churn penalty, and security context when available."],
    ["Whale Confidence", "Starts at 50, adds points for whale accumulation, subtracts points for whale reduction, and clamps to 0-100."],
    ["Distribution Risk", "Top 10 concentration below 25% is low risk, 25-50% is medium, and 50% or above is high."],
    ["Campaign Impact", "Campaign reports compare before and after snapshots. If history is insufficient, live mode shows Needs more snapshots instead of invented retention."],
    ["Birdeye Dependency", "Birdeye supplies holders, distribution, transfers, price stats, wallet context, and token security so this app can focus on retention intelligence and action."]
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-sm uppercase tracking-[0.22em] text-signal-cyan">Methodology</p>
      <h1 className="mt-2 text-4xl font-semibold text-white">How Holder Churn CRM interprets Birdeye data</h1>
      <p className="mt-4 text-slate-400">The MVP uses deterministic, explainable rules instead of fake ML. Every complex metric should be inspectable and source-backed.</p>
      <div className="mt-8">
        <DataLimitationsNotice />
      </div>
      <div className="mt-8 space-y-4">
        {sections.map(([title, body]) => (
          <section key={title} className="panel rounded-lg p-5">
            <h2 className="text-xl font-semibold text-white">{title}</h2>
            <p className="mt-2 text-slate-400">{body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
