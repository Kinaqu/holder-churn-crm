"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, BarChart3, Bell, Copy, Database, Play, Settings, Target, Users } from "lucide-react";
import type { CampaignImpact, TokenDataset } from "@/lib/types";
import { AlertList } from "@/components/alert-list";
import { ChurnChart, DistributionChart, HealthVsPriceChart, HolderTrendChart, WhaleConfidenceChart } from "@/components/charts/product-charts";
import { DataLimitationsNotice } from "@/components/data-limitations-notice";
import { HolderChangeTable } from "@/components/holder-table";
import { MetricCard } from "@/components/metric-card";
import { NextBestActionPanel } from "@/components/next-best-action-panel";
import { BirdeyePipelineCard } from "@/components/pipeline-card";
import { ScoreBreakdown } from "@/components/score-breakdown";
import { RiskBadge } from "@/components/ui/badges";
import { TokenAddress } from "@/components/ui/address";
import { formatPercent, relativeTimeLabel } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type Tab = "overview" | "holders" | "alerts" | "campaigns" | "pipeline" | "settings";

const tabs: { id: Tab; label: string; icon: typeof BarChart3 }[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "holders", label: "Holders", icon: Users },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "campaigns", label: "Campaigns", icon: Target },
  { id: "pipeline", label: "Pipeline", icon: Database },
  { id: "settings", label: "Settings", icon: Settings }
];

export function TokenDetailClient({ initialDataset }: { initialDataset: TokenDataset }) {
  const [dataset, setDataset] = useState(initialDataset);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [snapshotMessage, setSnapshotMessage] = useState<string | null>(null);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const latest = dataset.snapshots.at(-1)!;
  const isBaselineSnapshot = dataset.pipelineRun.mode === "live" && dataset.holders.length > 0 && dataset.segments.every((segment) => segment.segment === "BASELINE_HOLDER");

  const modeLabel = dataset.pipelineRun.mode === "demo" ? "Demo mode: data is deterministic and not persisted" : "Live mode";

  function runSnapshot() {
    setSnapshotMessage(null);
    setSnapshotError(null);
    startTransition(async () => {
      const response = await fetch(`/api/tokens/${dataset.token.id}/snapshot`, { method: "POST" });
      const payload = (await response.json()) as { ok?: boolean; code?: string; message?: string; dataset?: TokenDataset; partial?: boolean };
      if (!response.ok || payload.ok === false || !payload.dataset) {
        setSnapshotError(payload.code ? `${payload.code}: ${payload.message ?? "Snapshot failed."}` : "Snapshot failed.");
        setActiveTab("pipeline");
        return;
      }
      setDataset(payload.dataset);
      setSnapshotMessage(payload.partial ? "PARTIAL_SNAPSHOT_COMPLETED: Required holder data loaded. One or more optional Birdeye sources were unavailable." : "SNAPSHOT_COMPLETED: Live snapshot completed.");
      setActiveTab("pipeline");
    });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-5 rounded-lg border border-signal-cyan/25 bg-signal-cyan/10 px-4 py-3 text-sm text-signal-cyan">{modeLabel}</div>
      {isBaselineSnapshot ? <div className="mb-5 rounded-lg border border-signal-amber/30 bg-signal-amber/10 px-4 py-3 text-sm text-signal-amber">Baseline snapshot - run another snapshot to calculate churn.</div> : null}
      {snapshotError ? <div className="mb-5 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{snapshotError}</div> : null}
      {snapshotMessage ? <div className="mb-5 rounded-lg border border-signal-amber/30 bg-signal-amber/10 px-4 py-3 text-sm text-signal-amber">{snapshotMessage}</div> : null}
      <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold text-white">{dataset.token.name}</h1>
            <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-sm text-slate-300">{dataset.token.symbol}</span>
            <RiskBadge severity={dataset.token.securityStatus} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-400">
            <span className="capitalize">{dataset.token.chain}</span>
            <TokenAddress value={dataset.token.address} />
            <button className="flex items-center gap-1 text-slate-300 transition hover:text-white" onClick={() => navigator.clipboard.writeText(dataset.token.address)}>
              <Copy className="h-3.5 w-3.5" />
              Copy
            </button>
            <span>Last snapshot {relativeTimeLabel(dataset.token.lastSnapshotAt)}</span>
          </div>
        </div>
        <button
          onClick={runSnapshot}
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-signal-cyan px-4 py-2.5 text-sm font-semibold text-graphite-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Play className="h-4 w-4" />
          {isPending ? "Running snapshot..." : "Run Snapshot"}
        </button>
      </header>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Holder Health" value={latest.holderHealthScore} detail="Retention-weighted score with source-backed breakdown." icon={Users} tone="good" />
        <MetricCard label="Holder Churn" value={formatPercent(latest.churnRate)} detail={`${latest.likelyExited} likely exited or dropped below threshold.`} icon={AlertTriangle} tone="warn" />
        <MetricCard label="Whale Confidence" value={latest.whaleConfidenceScore} detail="Whale accumulation minus whale reduction pressure." icon={BarChart3} tone={latest.whaleConfidenceScore >= 60 ? "good" : "bad"} />
        <MetricCard label="Distribution Risk" value={latest.distributionRiskScore} detail={`Top 10 supply: ${formatPercent(latest.top10SupplyPercent)}`} icon={Database} tone={latest.distributionRiskScore > 65 ? "bad" : "warn"} />
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto border-b border-white/10">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={cn("flex items-center gap-2 border-b-2 px-3 py-3 text-sm transition", activeTab === tab.id ? "border-signal-cyan text-white" : "border-transparent text-slate-400 hover:text-white")}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {activeTab === "overview" ? <Overview dataset={dataset} /> : null}
        {activeTab === "holders" ? <Holders dataset={dataset} /> : null}
        {activeTab === "alerts" ? <Alerts dataset={dataset} /> : null}
        {activeTab === "campaigns" ? <Campaigns dataset={dataset} onDatasetChange={setDataset} /> : null}
        {activeTab === "pipeline" ? <Pipeline dataset={dataset} /> : null}
        {activeTab === "settings" ? <SettingsTab /> : null}
      </div>
    </div>
  );
}

function Overview({ dataset }: { dataset: TokenDataset }) {
  const latest = dataset.snapshots.at(-1)!;
  return (
    <div className="space-y-6">
      <BirdeyePipelineCard run={dataset.pipelineRun} large />
      <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <NextBestActionPanel alerts={dataset.alerts} />
        <ScoreBreakdown score={latest.holderHealthScore} items={latest.scoreBreakdown} />
      </div>
      <DataLimitationsNotice />
      <div className="grid gap-6 lg:grid-cols-2">
        <HolderTrendChart snapshots={dataset.snapshots} />
        <ChurnChart snapshots={dataset.snapshots} />
        <WhaleConfidenceChart snapshots={dataset.snapshots} />
        <DistributionChart snapshots={dataset.snapshots} />
        <HealthVsPriceChart snapshots={dataset.snapshots} />
      </div>
    </div>
  );
}

function Holders({ dataset }: { dataset: TokenDataset }) {
  return (
    <div className="space-y-6">
      <DataLimitationsNotice />
      <section className="panel rounded-lg p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Holder Segments</h2>
            <p className="mt-1 text-sm text-slate-400">Snapshot diffing converts Birdeye holder data into retention cohorts.</p>
          </div>
          <button className="rounded-md border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/5">Export CSV</button>
        </div>
        <HolderChangeTable segments={dataset.segments} />
      </section>
    </div>
  );
}

function Alerts({ dataset }: { dataset: TokenDataset }) {
  return (
    <section className="panel rounded-lg p-5">
      <h2 className="text-xl font-semibold text-white">Source-verifiable Alerts</h2>
      <p className="mt-1 text-sm text-slate-400">Each alert includes sources, reasons, confidence, and next actions.</p>
      <div className="mt-5">
        <AlertList alerts={dataset.alerts} />
      </div>
    </section>
  );
}

function Campaigns({ dataset, onDatasetChange }: { dataset: TokenDataset; onDatasetChange: (dataset: TokenDataset) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startedAt, setStartedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [endedAt, setEndedAt] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  function createMarker() {
    setMessage(null);
    startSaving(async () => {
      const response = await fetch(`/api/tokens/${dataset.token.id}/campaigns`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          startedAt: localDateTimeToIso(startedAt),
          endedAt: endedAt ? localDateTimeToIso(endedAt) : undefined
        })
      });
      const payload = (await response.json()) as { ok?: boolean; code?: string; message?: string; campaigns?: CampaignImpact[] };
      if (!response.ok || payload.ok === false || !payload.campaigns) {
        setMessage(payload.code ? `${payload.code}: ${payload.message ?? "Campaign marker was not saved."}` : "Campaign marker was not saved.");
        return;
      }
      onDatasetChange({ ...dataset, campaigns: payload.campaigns });
      setName("");
      setDescription("");
      setEndedAt("");
      setMessage("Campaign marker saved. Impact updates as more snapshots are collected.");
    });
  }

  return (
    <section className="panel rounded-lg p-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-xl font-semibold text-white">Campaign Impact</h2>
          <p className="mt-1 text-sm text-slate-400">Measure campaign quality by retained holders, not vanity impressions.</p>
        </div>
      </div>
      {dataset.pipelineRun.mode === "live" ? (
        <div className="mt-5 grid gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4 lg:grid-cols-[1fr_1fr_1fr_auto]">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Campaign name"
            className="rounded-md border border-white/10 bg-graphite-950 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-signal-cyan"
          />
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Description"
            className="rounded-md border border-white/10 bg-graphite-950 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-signal-cyan"
          />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <input
              type="datetime-local"
              value={startedAt}
              onChange={(event) => setStartedAt(event.target.value)}
              className="rounded-md border border-white/10 bg-graphite-950 px-3 py-2 text-sm text-white outline-none transition focus:border-signal-cyan"
            />
            <input
              type="datetime-local"
              value={endedAt}
              onChange={(event) => setEndedAt(event.target.value)}
              className="rounded-md border border-white/10 bg-graphite-950 px-3 py-2 text-sm text-white outline-none transition focus:border-signal-cyan"
            />
          </div>
          <button onClick={createMarker} disabled={isSaving || !name || !startedAt} className="rounded-md bg-white px-3 py-2 text-sm font-medium text-graphite-950 disabled:cursor-not-allowed disabled:opacity-60">
            {isSaving ? "Saving..." : "Create marker"}
          </button>
        </div>
      ) : null}
      {message ? <div className="mt-4 rounded-lg border border-signal-amber/30 bg-signal-amber/10 px-4 py-3 text-sm text-signal-amber">{message}</div> : null}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {dataset.campaigns.map((impact) => (
          <article key={impact.campaign.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-white">{impact.campaign.name}</h3>
                <p className="mt-1 text-sm text-slate-400">{impact.campaign.description}</p>
              </div>
              <span className={cn("rounded-full border px-2 py-1 text-xs", impact.status === "complete" ? "border-signal-green/30 bg-signal-green/10 text-signal-green" : "border-signal-amber/30 bg-signal-amber/10 text-signal-amber")}>
                {impact.status === "needs_more_snapshots" ? "Needs more snapshots" : impact.status}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <CampaignStat label="New holders" value={impact.metrics.newHolders} />
              <CampaignStat label="Likely exited" value={impact.metrics.likelyExited} />
              <CampaignStat label="Retained 24h" value={impact.metrics.retained24h ?? "Pending"} />
              <CampaignStat label="Impact score" value={impact.metrics.campaignImpactScore ?? "Preview"} />
            </div>
            {impact.missingRequirements.length > 0 ? <p className="mt-3 text-sm text-slate-400">{impact.missingRequirements[0]}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function Pipeline({ dataset }: { dataset: TokenDataset }) {
  const callRows = useMemo(
    () =>
      dataset.pipelineRun.sources.map((source) => ({
        endpoint: source.source,
        status: source.status,
        calls: source.calls,
        detail: source.detail
      })),
    [dataset.pipelineRun.sources]
  );

  return (
    <div className="space-y-6">
      <BirdeyePipelineCard run={dataset.pipelineRun} large />
      <section className="panel rounded-lg p-5">
        <h2 className="text-xl font-semibold text-white">Run Log</h2>
        <div className="mt-4 overflow-hidden rounded-lg border border-white/10">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Endpoint</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Calls</th>
                <th className="px-4 py-3">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {callRows.map((row) => (
                <tr key={row.endpoint}>
                  <td className="px-4 py-3 text-white">{row.endpoint}</td>
                  <td className="px-4 py-3 capitalize text-slate-300">{row.status}</td>
                  <td className="px-4 py-3 font-mono text-slate-300">{row.calls}</td>
                  <td className="px-4 py-3 text-slate-400">{row.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {dataset.pipelineRuns && dataset.pipelineRuns.length > 1 ? (
        <section className="panel rounded-lg p-5">
          <h2 className="text-xl font-semibold text-white">Pipeline History</h2>
          <div className="mt-4 overflow-hidden rounded-lg border border-white/10">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Run</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Started</th>
                  <th className="px-4 py-3">Calls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {dataset.pipelineRuns.slice(0, 8).map((run) => (
                  <tr key={run.id}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">{run.id.slice(0, 12)}</td>
                    <td className="px-4 py-3 capitalize text-slate-300">{run.status}</td>
                    <td className="px-4 py-3 text-slate-400">{relativeTimeLabel(run.startedAt)}</td>
                    <td className="px-4 py-3 font-mono text-slate-300">{run.apiCallsUsed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function localDateTimeToIso(value: string) {
  return new Date(value).toISOString();
}

function SettingsTab() {
  return (
    <section className="panel rounded-lg p-5">
      <h2 className="text-xl font-semibold text-white">Snapshot Settings</h2>
      <p className="mt-1 text-sm text-slate-400">MVP defaults are conservative and Birdeye API-limit aware.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {[
          ["Whale rank threshold", "Top 50"],
          ["Whale supply threshold", "1%"],
          ["Reduction threshold", "10% whales, 20% holders"],
          ["Safe API budget", "50 requests/minute"]
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <p className="text-sm text-slate-400">{label}</p>
            <p className="mt-2 font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CampaignStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-white/10 bg-graphite-950/55 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-white">{value}</p>
    </div>
  );
}
