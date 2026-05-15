import { ShieldCheck } from "lucide-react";
import { TokenScanner } from "@/components/token-scanner";

export default function NewTokenPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <section>
          <div className="inline-flex items-center gap-2 rounded-full border border-signal-cyan/25 bg-signal-cyan/10 px-3 py-1 text-xs font-medium text-signal-cyan">
            <ShieldCheck className="h-3.5 w-3.5" />
            Solana only
          </div>
          <h1 className="mt-5 text-4xl font-semibold leading-tight text-white">Scan a token</h1>
          <p className="mt-3 max-w-xl text-slate-400">
            Paste a Solana mint address or choose one of the supported tokens: SOL, BONK, WIF, or JUP.
          </p>
        </section>

        <TokenScanner />
      </div>
    </div>
  );
}
