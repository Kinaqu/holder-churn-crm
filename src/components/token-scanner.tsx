"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Search, ShieldCheck } from "lucide-react";
import type { Token } from "@/lib/types";
import { SOLANA_PRESET_TOKENS, type SolanaPresetToken } from "@/lib/solana-presets";
import { cn } from "@/lib/utils/cn";

type CreateTokenResponse =
  | {
      ok: true;
      data?: { token: Token; warning?: { code: string; message: string } };
      token?: Token;
      warning?: { code: string; message: string };
    }
  | {
      ok: false;
      code?: string;
      message?: string;
      error?: { code: string; message: string };
    };

export function TokenScanner({ compact = false, className }: { compact?: boolean; className?: string }) {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    scanToken(address);
  }

  function choosePreset(token: SolanaPresetToken) {
    setAddress(token.address);
    setSelectedSymbol(token.symbol);
    scanToken(token.address, token);
  }

  function scanToken(nextAddress: string, preset?: SolanaPresetToken) {
    const cleanAddress = nextAddress.trim();
    setError(null);

    if (!cleanAddress) {
      setError("Paste a Solana token mint address or choose one of the presets.");
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/tokens", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chain: "solana",
          address: cleanAddress,
          symbol: preset?.symbol,
          name: preset?.name,
          decimals: preset?.decimals
        })
      });
      const payload = (await response.json()) as CreateTokenResponse;

      if (!response.ok || !payload.ok) {
        const code = payload.ok ? undefined : payload.error?.code ?? payload.code;
        const message = payload.ok ? "Token scan could not start." : payload.error?.message ?? payload.message ?? "Token scan could not start.";
        setError(code ? `${code}: ${message}` : message);
        return;
      }

      const token = payload.data?.token ?? payload.token;
      if (!token) {
        setError("Live token storage is not configured, so scanning cannot start yet.");
        return;
      }

      router.push(`/tokens/${token.id}`);
    });
  }

  return (
    <div className={cn("rounded-lg border border-white/10 bg-graphite-900/75 p-3 shadow-panel backdrop-blur", className)}>
      <form onSubmit={submit} className="grid gap-3">
        <div className="flex items-center gap-2 rounded-md border border-white/10 bg-graphite-950/80 px-3 py-2 focus-within:border-signal-cyan/70">
          <Search className="h-4 w-4 shrink-0 text-slate-500" />
          <input
            suppressHydrationWarning
            value={address}
            onChange={(event) => {
              setAddress(event.target.value);
              setSelectedSymbol(null);
            }}
            placeholder="Paste Solana token mint address"
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
          />
          <span className="hidden rounded border border-signal-cyan/25 bg-signal-cyan/10 px-2 py-1 text-xs font-medium text-signal-cyan sm:inline-flex">Solana</span>
        </div>

        <div className="grid gap-2 sm:grid-cols-4">
          {SOLANA_PRESET_TOKENS.map((token) => (
            <button
              key={token.symbol}
              type="button"
              onClick={() => choosePreset(token)}
              disabled={isPending}
              className={cn(
                "group min-h-20 rounded-md border border-white/10 bg-white/[0.035] p-3 text-left transition hover:border-white/20 hover:bg-white/[0.065] focus:outline-none focus:ring-2 focus:ring-signal-cyan/60 disabled:cursor-not-allowed disabled:opacity-60",
                selectedSymbol === token.symbol && "border-signal-cyan/50 bg-signal-cyan/10"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-base font-semibold text-white">{token.symbol}</span>
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: token.accent }} />
              </div>
              <p className="mt-1 truncate text-xs text-slate-500">{token.address}</p>
              {!compact ? <p className="mt-2 text-xs text-slate-400">{token.description}</p> : null}
            </button>
          ))}
        </div>

        {error ? <div className="rounded-md border border-signal-rose/30 bg-signal-rose/10 px-3 py-2 text-sm text-red-200">{error}</div> : null}

        <button
          disabled={isPending}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-signal-cyan px-4 py-2.5 text-sm font-semibold text-graphite-950 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-signal-cyan/70 focus:ring-offset-2 focus:ring-offset-graphite-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {isPending ? "Starting scan..." : "Scan token"}
          {!isPending ? <ArrowRight className="h-4 w-4" /> : null}
        </button>
      </form>
    </div>
  );
}
