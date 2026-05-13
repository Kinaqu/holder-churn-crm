import type { HolderSegment } from "@/lib/types";
import { SegmentBadge, SourceBadge } from "@/components/ui/badges";
import { WalletAddress } from "@/components/ui/address";
import { formatPercent } from "@/lib/utils/format";

export function HolderChangeTable({ segments }: { segments: HolderSegment[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-white/10">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.16em] text-slate-500">
          <tr>
            <th className="px-4 py-3">Wallet</th>
            <th className="px-4 py-3">Segment</th>
            <th className="px-4 py-3">Change</th>
            <th className="px-4 py-3">Rank</th>
            <th className="px-4 py-3">Supply</th>
            <th className="px-4 py-3">Sources</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {segments.map((segment) => (
            <tr key={`${segment.walletAddress}-${segment.segment}`} className="bg-graphite-950/35">
              <td className="px-4 py-3"><WalletAddress value={segment.walletAddress} /></td>
              <td className="px-4 py-3"><SegmentBadge segment={segment.segment} /></td>
              <td className={segment.changePercent < 0 ? "px-4 py-3 text-signal-rose" : "px-4 py-3 text-signal-green"}>
                {formatPercent(segment.changePercent)}
              </td>
              <td className="px-4 py-3 text-slate-300">#{segment.currentRank ?? segment.previousRank ?? "-"}</td>
              <td className="px-4 py-3 text-slate-300">{formatPercent(segment.currentSupplyPercent ?? segment.previousSupplyPercent ?? 0)}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  {segment.sourceEndpoints.map((source) => <SourceBadge key={source} source={source} />)}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
