import { getDemoDataset } from "@/lib/demo/demo-data";
import { getBirdeyeClient } from "@/lib/birdeye/client";
import { normalizeHolders } from "@/lib/birdeye/normalizers";
import { classifyHolderSegments } from "@/lib/intelligence/segments";
import { calculateSnapshotScores } from "@/lib/intelligence/scoring";
import { generateAlerts } from "@/lib/intelligence/alerts";
import type { HolderSnapshot, PipelineRun, Token, TokenDataset, TokenSnapshot } from "@/lib/types";

export class SnapshotError extends Error {
  constructor(
    readonly code: "INVALID_TOKEN_ADDRESS" | "BIRDEYE_API_KEY_MISSING" | "SNAPSHOT_FAILED",
    message: string,
    readonly status = 400
  ) {
    super(message);
  }
}

export async function runManualSnapshot(input: {
  tokenId: string;
  chain: string;
  address: string;
  token?: Token;
  mode?: "demo" | "live";
  previousHolders?: HolderSnapshot[];
  previousSnapshots?: TokenSnapshot[];
}): Promise<TokenDataset> {
  if (input.mode === "demo") {
    return getDemoDataset();
  }

  const startedAt = new Date();
  const client = getBirdeyeClient();
  const chain = input.chain;
  const address = input.address;

  if (!address) {
    throw new SnapshotError("INVALID_TOKEN_ADDRESS", "Live snapshot requires a token address.");
  }

  if (!process.env.BIRDEYE_API_KEY) {
    throw new SnapshotError("BIRDEYE_API_KEY_MISSING", "BIRDEYE_API_KEY is required to run a live Birdeye snapshot.", 503);
  }

  const holdersResult = await client.getTokenHolders(chain, address, 100);
  if (!holdersResult.ok) {
    throw new SnapshotError("SNAPSHOT_FAILED", `Token Holder is required for a live snapshot. ${holdersResult.error}`, 502);
  }

  const [distribution, price, security, transfers] = await Promise.all([
    client.getHolderDistribution(chain, address),
    client.getPriceStats(chain, address),
    client.getTokenSecurity(chain, address),
    client.getTokenTransfers(chain, address, { limit: 50 })
  ]);

  const holders = normalizeHolders(holdersResult.data);
  const previousHolders = input.previousHolders ?? [];
  const previousSnapshots = input.previousSnapshots ?? [];
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
      id: input.tokenId,
      chain,
      address,
      symbol: input.token?.symbol ?? "LIVE",
      name: input.token?.name ?? "Live Birdeye Token",
      decimals: input.token?.decimals ?? 6,
      securityStatus: security.ok ? "clear" : "unknown",
      lastSnapshotAt: currentSnapshot.snapshotAt,
      createdAt: input.token?.createdAt,
      updatedAt: currentSnapshot.snapshotAt
    },
    snapshots: [...previousSnapshots, currentSnapshot],
    holders,
    previousHolders,
    segments,
    alerts: generateAlerts(segments, currentSnapshot, previousSnapshots.at(-1)),
    campaigns: [],
    pipelineRun
  };
}

export function isDemoMode() {
  return process.env.DEMO_MODE === "true";
}
