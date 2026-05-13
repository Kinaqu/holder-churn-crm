"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { Search } from "lucide-react";
import type { Token } from "@/lib/types";

type CreateTokenResponse =
  | {
      ok: true;
      token: Token;
      demo: boolean;
      persistent: boolean;
      warning?: { code: string; message: string };
    }
  | {
      ok: false;
      code: string;
      message: string;
    };

export default function NewTokenPage() {
  const router = useRouter();
  const [chain, setChain] = useState("solana");
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const response = await fetch("/api/tokens", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chain, address })
      });
      const payload = (await response.json()) as CreateTokenResponse;

      if (!response.ok || !payload.ok) {
        setError(payload.ok ? "Token creation failed." : `${payload.code}: ${payload.message}`);
        return;
      }

      if (payload.warning) setMessage(`${payload.warning.code}: ${payload.warning.message}`);
      router.push(`/tokens/${payload.token.id}`);
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="panel rounded-lg p-6">
        <p className="text-sm uppercase tracking-[0.22em] text-signal-cyan">Add token</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Start tracking holder retention</h1>
        <p className="mt-3 text-slate-400">
          In demo mode, this form routes to the deterministic Birdeye-powered demo token. In live mode, token creation stores the token and lets you run a manual partial snapshot.
        </p>
        <form onSubmit={submit} className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm text-slate-300">
            Chain
            <select value={chain} onChange={(event) => setChain(event.target.value)} className="rounded-md border border-white/10 bg-graphite-950 px-3 py-2 text-white">
              <option value="solana">Solana</option>
              <option value="ethereum">Ethereum</option>
              <option value="base">Base</option>
              <option value="bsc">BNB Chain</option>
              <option value="arbitrum">Arbitrum</option>
              <option value="optimism">Optimism</option>
              <option value="polygon">Polygon</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm text-slate-300">
            Token address
            <input
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Paste token address"
              className="rounded-md border border-white/10 bg-graphite-950 px-3 py-2 text-white placeholder:text-slate-600"
            />
          </label>
          {error ? <div className="rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">{error}</div> : null}
          {message ? <div className="rounded-md border border-signal-amber/30 bg-signal-amber/10 px-3 py-2 text-sm text-signal-amber">{message}</div> : null}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              disabled={isPending}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-signal-cyan px-4 py-2.5 text-sm font-semibold text-graphite-950 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Search className="h-4 w-4" />
              {isPending ? "Adding token..." : "Add token"}
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
