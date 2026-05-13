import Link from "next/link";
import { Search } from "lucide-react";

export default function NewTokenPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="panel rounded-lg p-6">
        <p className="text-sm uppercase tracking-[0.22em] text-signal-cyan">Add token</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Start tracking holder retention</h1>
        <p className="mt-3 text-slate-400">
          In demo mode, this form routes to the deterministic Birdeye-powered demo token. In live mode, token creation stores the token and lets you run a manual partial snapshot.
        </p>
        <form action="/api/tokens" method="post" className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm text-slate-300">
            Chain
            <select name="chain" className="rounded-md border border-white/10 bg-graphite-950 px-3 py-2 text-white">
              <option value="solana">Solana</option>
              <option value="ethereum">Ethereum</option>
              <option value="base">Base</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm text-slate-300">
            Token address
            <input name="address" placeholder="Paste token address" className="rounded-md border border-white/10 bg-graphite-950 px-3 py-2 text-white placeholder:text-slate-600" />
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button className="inline-flex items-center justify-center gap-2 rounded-md bg-signal-cyan px-4 py-2.5 text-sm font-semibold text-graphite-950 hover:bg-white">
              <Search className="h-4 w-4" />
              Add token
            </button>
            <Link href="/dashboard" className="inline-flex items-center justify-center rounded-md border border-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/5">
              View demo dashboard
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
