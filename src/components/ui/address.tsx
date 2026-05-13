import { shortAddress } from "@/lib/utils/format";

export function WalletAddress({ value }: { value: string }) {
  return <span className="font-mono text-xs text-slate-200">{shortAddress(value)}</span>;
}

export function TokenAddress({ value }: { value: string }) {
  return <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-xs text-slate-300">{shortAddress(value)}</span>;
}
