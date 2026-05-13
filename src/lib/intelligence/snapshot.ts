import { getDemoDataset } from "@/lib/demo/demo-data";
import { getBirdeyeClient } from "@/lib/birdeye/client";
import { normalizeHolders } from "@/lib/birdeye/normalizers";
import { classifyHolderSegments } from "@/lib/intelligence/segments";
import { calculateSnapshotScores } from "@/lib/intelligence/scoring";
import { generateAlerts } from "@/lib/intelligence/alerts";
import type { PipelineRun, TokenDataset } from "@/lib/types";

export async function runManualSnapshot(input: { tokenId?: string; chain?: string; address?: string }): Promise<TokenDataset> {
  if (isDemoMode()) {
    return getDemoDataset();
  }

  const startedAt = new Date();
  const client = getBirdeyeClient();
  const chain = input.chain ?? "solana";
  const address = input.address ?? "";

  const holdersResult = await client.getTokenHolders(chain, address, 100);
  if (!holdersResult.ok) {
    throw new Error("Token Holder is required for a live snapshot.");
  }

  const [distribution, price, security, transfers] = await Promise.all([
    client.getHolderDistribution(chain, address),
    client.getPriceStats(chain, address),
    client.getTokenSecurity(chain, address),
    client.getTokenTransfers(chain, address, { limit: 50 })
  ]);

  const holders = normalizeHolders(holdersResult.data);
  const previousHolders = getDemoDataset().previousHolders;
  const segments = classifyHolderSegments(previousHolders, holders);
  const currentSnapshot = calculateSnapshotScores({
    previousTrackedWallets: previousHolders.length,
    currentTrackedWallets: holders.length,
    top10SupplyPercent: distribution.ok ? distribution.data.top10SupplyPercent : undefined,
    top50SupplyPercent: distribution.ok ? distribution.data.top50SupplyPercent : undefined,
    priceUsd: price.ok ? price.data.priceUsd : undefined,
    priceChange24h: price.ok ? price.data.priceChange24h : undefined,
    segments
  });

  const pipelineRun: PipelineRun = {
    id: `run-${Date.now()}`,
    status: [distribution, price, security, transfers].some((result) => !result.ok) ? "partial" : "complete",
    mode: "live",
    apiCallsUsed: client.usage.calls,
    apiSafeBudget: 50,
    holdersScanned: holders.length,
    walletsEnriched: 0,
    cacheHits: client.usage.cacheHits,
    cacheMisses: client.usage.cacheMisses,
    durationMs: Date.now() - startedAt.getTime(),
    rateLimitBudgetUsed: Math.round((client.usage.calls / 50) * 100),
    stayedUnderLimit: client.usage.calls <= 50,
    startedAt: startedAt.toISOString(),
    completedAt: new Date().toISOString(),
    sources: [
      { source: "Token Holder", status: "complete", detail: `${holders.length} holders scanned`, calls: holdersResult.cacheHit ? 0 : 1 },
      { source: "Holder Distribution", status: distribution.ok ? "complete" : "missing", detail: distribution.ok ? "concentration calculated" : distribution.error, calls: 1 },
      { source: "Price Stats", status: price.ok ? "complete" : "missing", detail: price.ok ? "market context added" : price.error, calls: 1 },
      { source: "Token Security", status: security.ok ? "complete" : "missing", detail: security.ok ? "risk context added" : security.error, calls: 1 },
      { source: "Token Transfer", status: transfers.ok ? "complete" : "missing", detail: transfers.ok ? "transfer context added" : transfers.error, calls: 1 },
      { source: "Wallet Current Net Worth", status: "skipped", detail: "wallet enrichment deferred unless a high-priority wallet needs it", calls: 0 }
    ]
  };

  return {
    token: {
      id: input.tokenId ?? "live-token",
      chain,
      address,
      symbol: "LIVE",
      name: "Live Birdeye Token",
      decimals: 6,
      securityStatus: security.ok ? "clear" : "unknown",
      lastSnapshotAt: currentSnapshot.snapshotAt
    },
    snapshots: [...getDemoDataset().snapshots.slice(0, -1), currentSnapshot],
    holders,
    previousHolders,
    segments,
    alerts: generateAlerts(segments, currentSnapshot, getDemoDataset().snapshots.at(-1)),
    campaigns: getDemoDataset().campaigns,
    pipelineRun
  };
}

export function isDemoMode() {
  return process.env.DEMO_MODE === "true" || !process.env.DATABASE_URL || !process.env.BIRDEYE_API_KEY;
}
