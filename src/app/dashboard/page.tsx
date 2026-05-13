import { AlertTriangle, BarChart3, Clock, Database, Users, WalletCards } from "lucide-react";
import Link from "next/link";
import { AlertList } from "@/components/alert-list";
import { HealthVsPriceChart, HolderTrendChart } from "@/components/charts/product-charts";
import { DataLimitationsNotice } from "@/components/data-limitations-notice";
import { MetricCard } from "@/components/metric-card";
import { NextBestActionPanel } from "@/components/next-best-action-panel";
import { BirdeyePipelineCard } from "@/components/pipeline-card";
import { getDemoDataset } from "@/lib/demo/demo-data";
import { formatPercent } from "@/lib/utils/format";

export default function DashboardPage() {
  const dataset = getDemoDataset();
  const latest = dataset.snapshots.at(-1)!;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-signal-cyan">Demo dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Holder retention command center</h1>
          <p className="mt-2 max-w-2xl text-slate-400">Birdeye data infrastructure transformed into churn signals, whale confidence, campaign quality, and recommended actions.</p>
        </div>
        <Link href={`/tokens/${dataset.token.id}`} className="rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-graphite-950 hover:bg-signal-cyan">
          Open token detail
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Holder Health Score" value={latest.holderHealthScore} detail="Transparent retention score." icon={Users} tone="good" />
        <MetricCard label="Holder Churn Rate" value={formatPercent(latest.churnRate)} detail={`${latest.likelyExited} likely exited.`} icon={AlertTriangle} tone="warn" />
        <MetricCard label="Whale Confidence" value={latest.whaleConfidenceScore} detail="Whales reducing faster than accumulating." icon={WalletCards} tone="bad" />
        <MetricCard label="API Calls Used" value={`${dataset.pipelineRun.apiCallsUsed}/50`} detail="Safe Birdeye budget stayed intact." icon={Database} tone="good" />
        <MetricCard label="Distribution Risk" value={latest.distributionRiskScore} detail={`Top 10: ${formatPercent(latest.top10SupplyPercent)}`} icon={BarChart3} tone="warn" />
        <MetricCard label="New Holders" value={latest.newHolders} detail="Campaign-attributed demo cohort." icon={Users} tone="good" />
        <MetricCard label="Likely Exited" value={latest.likelyExited} detail="Thresholded top-holder interpretation." icon={AlertTriangle} tone="bad" />
        <MetricCard label="Last Snapshot" value="24m" detail="Fresh demo run." icon={Clock} tone="neutral" />
      </div>

      <div className="mt-6">
        <BirdeyePipelineCard run={dataset.pipelineRun} large />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
        <NextBestActionPanel alerts={dataset.alerts} />
        <div className="panel rounded-lg p-5">
          <h2 className="text-xl font-semibold text-white">Recent Alerts</h2>
          <div className="mt-5">
            <AlertList alerts={dataset.alerts.slice(0, 2)} />
          </div>
        </div>
      </div>

      <div className="mt-6">
        <DataLimitationsNotice />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <HolderTrendChart snapshots={dataset.snapshots} />
        <HealthVsPriceChart snapshots={dataset.snapshots} />
      </div>
    </div>
  );
}
