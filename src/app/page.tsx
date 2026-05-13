import Link from "next/link";
import { ArrowRight, BarChart3, CheckCircle2, Database, ShieldCheck, Target, Users } from "lucide-react";
import { BirdeyePipelineCard } from "@/components/pipeline-card";
import { MetricCard } from "@/components/metric-card";
import { getDemoDataset } from "@/lib/demo/demo-data";
import { formatPercent } from "@/lib/utils/format";

const featureCards = [
  { title: "Holder Churn", body: "Detect likely exits and reduction waves.", icon: Users },
  { title: "Whale Confidence", body: "Track top-holder accumulation and reduction.", icon: ShieldCheck },
  { title: "Campaign Impact", body: "Measure retained holders after campaigns.", icon: Target },
  { title: "API Efficiency", body: "Snapshot-first and designed for 60 RPM.", icon: Database }
];

export default function LandingPage() {
  const dataset = getDemoDataset();
  const latest = dataset.snapshots.at(-1)!;

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[740px] grid-overlay opacity-70" />
      <section className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <div className="fade-in">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-signal-cyan">Birdeye-native holder intelligence</p>
          <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-[1.02] text-white sm:text-6xl">
            Birdeye-powered retention analytics for tokenized communities
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Turn Birdeye holder, wallet, transfer, price, and security data into churn analytics, whale confidence, and campaign attribution without running your own indexer.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/tokens/new" className="inline-flex items-center justify-center gap-2 rounded-md bg-signal-cyan px-5 py-3 text-sm font-semibold text-graphite-950 transition hover:bg-white">
              Start tracking a token
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 rounded-md border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/5">
              View demo dashboard
            </Link>
          </div>
          <p className="mt-5 text-xs text-slate-500">Analytics software only. Not financial advice.</p>
        </div>

        <div className="fade-in rounded-xl border border-white/10 bg-graphite-950/60 p-3 shadow-panel backdrop-blur">
          <div className="rounded-lg border border-white/10 bg-graphite-900 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Demo token dashboard</p>
                <h2 className="font-semibold text-white">{dataset.token.symbol} Holder Health</h2>
              </div>
              <span className="rounded-full border border-signal-green/30 bg-signal-green/10 px-2 py-1 text-xs text-signal-green">Demo</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard label="Holder Health" value={latest.holderHealthScore} detail="Explainable score" icon={Users} tone="good" />
              <MetricCard label="Churn" value={formatPercent(latest.churnRate)} detail="Likely exited thresholded" icon={BarChart3} tone="warn" />
            </div>
            <div className="mt-3">
              <BirdeyePipelineCard run={dataset.pipelineRun} />
            </div>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <ComparisonCard
            title="Without Birdeye"
            items={["custom blockchain indexer", "transfer parser", "holder extraction", "wallet enrichment", "price history database", "security/risk layer", "infrastructure maintenance"]}
            muted
          />
          <ComparisonCard
            title="With Birdeye"
            items={["Token Holder API", "Holder Distribution", "Token Transfer context", "wallet-level enrichment", "Price Stats", "Token Security", "fast SaaS interpretation layer"]}
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm uppercase tracking-[0.22em] text-signal-cyan">Action, not just vision</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Most dashboards show what happened. Holder Churn CRM tells teams what to do next.</h2>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {featureCards.map(({ title, body, icon: Icon }) => (
            <div key={title} className="panel rounded-lg p-5">
              <Icon className="h-5 w-5 text-signal-cyan" />
              <h3 className="mt-4 font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm text-slate-400">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-3">
          {["Free", "Pro", "Team"].map((tier) => (
            <div key={tier} className="panel rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white">{tier}</h3>
              <p className="mt-2 text-sm text-slate-400">Hackathon pricing placeholder.</p>
              <div className="mt-6 flex items-center gap-2 text-sm text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-signal-green" />
                Birdeye-powered retention analytics
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 px-4 py-8 text-center text-sm text-slate-500">
        Holder Churn CRM is analytics software, not financial advice.
      </footer>
    </div>
  );
}

function ComparisonCard({ title, items, muted = false }: { title: string; items: string[]; muted?: boolean }) {
  return (
    <div className="panel rounded-lg p-6">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <div className="mt-5 grid gap-3">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-3 text-sm text-slate-300">
            <span className={muted ? "h-2 w-2 rounded-full bg-slate-600" : "h-2 w-2 rounded-full bg-signal-cyan"} />
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
