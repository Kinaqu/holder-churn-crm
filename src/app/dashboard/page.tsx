import Link from "next/link";
import { ArrowRight, BarChart3, Clock, Database, ShieldCheck, WalletCards } from "lucide-react";
import { TokenScanner } from "@/components/token-scanner";
import { TokenAddress } from "@/components/ui/address";
import { listTokens } from "@/lib/db/repository";
import { relativeTimeLabel } from "@/lib/utils/format";

export default async function DashboardPage() {
  const tokens = (await listTokens()).filter((token) => token.chain === "solana");
  const latestToken = tokens[0];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-signal-cyan/25 bg-signal-cyan/10 px-3 py-1 text-xs font-medium text-signal-cyan">
            <ShieldCheck className="h-3.5 w-3.5" />
            Solana workspace
          </div>
          <h1 className="mt-4 text-3xl font-semibold text-white">Holder retention dashboard</h1>
          <p className="mt-2 max-w-2xl text-slate-400">
            Open a scanned token or start a new Solana holder snapshot.
          </p>
        </div>
        {latestToken ? (
          <Link href={`/tokens/${latestToken.id}`} className="inline-flex items-center justify-center gap-2 rounded-md bg-signal-cyan px-4 py-2.5 text-sm font-semibold text-graphite-950 transition hover:bg-white">
            Open latest token
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>

      {tokens.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <section className="panel rounded-lg p-5">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Scanned tokens</h2>
                <p className="mt-1 text-sm text-slate-400">Solana tokens available in this workspace.</p>
              </div>
              <span className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-slate-300">{tokens.length} total</span>
            </div>
            <div className="mt-4 grid gap-3">
              {tokens.map((token) => (
                <Link
                  key={token.id}
                  href={`/tokens/${token.id}`}
                  className="group grid gap-4 rounded-lg border border-white/10 bg-white/[0.035] p-4 transition hover:border-signal-cyan/40 hover:bg-signal-cyan/10 md:grid-cols-[1fr_auto] md:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-white">{token.name}</h3>
                      <span className="rounded border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs text-slate-300">{token.symbol}</span>
                      <span className="rounded border border-signal-cyan/25 bg-signal-cyan/10 px-2 py-0.5 text-xs text-signal-cyan">Solana</span>
                    </div>
                    <div className="mt-2 text-sm text-slate-400">
                      <TokenAddress value={token.address} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Clock className="h-4 w-4" />
                    {relativeTimeLabel(token.lastSnapshotAt)}
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:text-white" />
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <aside className="space-y-4">
            <TokenScanner compact />
            <div className="panel rounded-lg p-5">
              <h2 className="text-sm font-semibold text-white">Workspace coverage</h2>
              <div className="mt-4 grid gap-3">
                <DashboardStat icon={WalletCards} label="Chain" value="Solana" />
                <DashboardStat icon={BarChart3} label="Signals" value="Retention, churn, whales" />
                <DashboardStat icon={Database} label="Sources" value="Birdeye snapshots" />
              </div>
            </div>
          </aside>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <section className="panel rounded-lg p-6">
            <h2 className="text-2xl font-semibold text-white">No scanned tokens yet</h2>
            <p className="mt-2 max-w-xl text-slate-400">
              Start with one of the supported Solana tokens or paste a mint address. The dashboard opens after the token is stored.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <DashboardStat icon={WalletCards} label="Chain" value="Solana" />
              <DashboardStat icon={BarChart3} label="Preset tokens" value="SOL, BONK, WIF, JUP" />
              <DashboardStat icon={Database} label="Snapshot data" value="Birdeye" />
            </div>
          </section>
          <TokenScanner />
        </div>
      )}
    </div>
  );
}

function DashboardStat({ icon: Icon, label, value }: { icon: typeof BarChart3; label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Icon className="h-3.5 w-3.5 text-signal-cyan" />
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
