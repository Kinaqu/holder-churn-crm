import Link from "next/link";
import { ArrowRight, BarChart3, CheckCircle2, Database, ShieldCheck, Target, Users, WalletCards } from "lucide-react";
import { TokenScanner } from "@/components/token-scanner";

const signals = [
  { label: "Holder churn", value: "exits", icon: Users },
  { label: "Whale pressure", value: "top wallets", icon: WalletCards },
  { label: "Distribution risk", value: "supply", icon: BarChart3 },
  { label: "Source status", value: "Birdeye", icon: Database }
];

const features = [
  {
    title: "Scan a mint",
    body: "Start from a Solana token address and open the workspace.",
    icon: ShieldCheck
  },
  {
    title: "Read holder movement",
    body: "Turn snapshots into churn, accumulation, and concentration signals.",
    icon: Users
  },
  {
    title: "Act on alerts",
    body: "See which wallet changes need attention before the next campaign.",
    icon: Target
  }
];

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[680px] grid-overlay opacity-70" />

      <section className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[0.94fr_1.06fr] lg:px-8">
        <div className="fade-in">
          <div className="inline-flex items-center gap-2 rounded-full border border-signal-cyan/25 bg-signal-cyan/10 px-3 py-1 text-xs font-medium text-signal-cyan">
            <span className="h-1.5 w-1.5 rounded-full bg-signal-cyan" />
            Solana holder intelligence
          </div>
          <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-[1.02] text-white sm:text-6xl">
            Scan token holder churn
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
            Paste a Solana mint or choose SOL, BONK, WIF, or JUP to open live retention analytics.
          </p>
          <div className="mt-8 max-w-2xl">
            <TokenScanner />
          </div>
          <p className="mt-4 text-xs text-slate-500">Analytics software only. Not financial advice.</p>
        </div>

        <div className="fade-in relative">
          <div className="panel rounded-lg p-4">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Token workspace</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Holder Health</h2>
              </div>
              <span className="rounded-md border border-signal-green/30 bg-signal-green/10 px-2.5 py-1 text-xs font-medium text-signal-green">Solana only</span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {signals.map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-md border border-white/10 bg-white/[0.035] p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-400">{label}</p>
                    <Icon className="h-4 w-4 text-signal-cyan" />
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-md border border-white/10 bg-graphite-950/70 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-white">Snapshot pipeline</p>
                  <p className="mt-1 text-sm text-slate-400">Holder, distribution, price, metadata, security.</p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-signal-green" />
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-4/5 rounded-full bg-gradient-to-r from-signal-cyan via-signal-green to-signal-blue" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {features.map(({ title, body, icon: Icon }) => (
            <article key={title} className="panel rounded-lg p-5">
              <Icon className="h-5 w-5 text-signal-cyan" />
              <h3 className="mt-4 font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.025]">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 px-4 py-8 sm:px-6 md:flex-row md:items-center lg:px-8">
          <div>
            <h2 className="text-2xl font-semibold text-white">Ready for a token scan?</h2>
            <p className="mt-1 text-sm text-slate-400">Use a verified Solana mint address and open the dashboard.</p>
          </div>
          <Link href="/tokens/new" className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-signal-cyan/45 hover:bg-signal-cyan/10">
            Open scanner
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="px-4 py-8 text-center text-sm text-slate-500">
        Holder Churn CRM is analytics software, not financial advice.
      </footer>
    </div>
  );
}
