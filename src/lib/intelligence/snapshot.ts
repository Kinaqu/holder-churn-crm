import { getDemoDataset } from "@/lib/demo/demo-data";
import { getBirdeyeClient } from "@/lib/birdeye/client";
import { normalizeHolders } from "@/lib/birdeye/normalizers";
import { classifyHolderSegments } from "@/lib/intelligence/segments";
import { calculateSnapshotScores } from "@/lib/intelligence/scoring";
import { generateAlerts } from "@/lib/intelligence/alerts";
import type { ApiCallLog, HolderSegment, HolderSnapshot, PipelineRun, Token, TokenDataset, TokenSnapshot } from "@/lib/types";

export class SnapshotError extends Error {
  constructor(
    readonly code: "INVALID_TOKEN_ADDRESS" | "BIRDEYE_API_KEY_MISSING" | "TOKEN_HOLDER_SOURCE_FAILED" | "SNAPSHOT_FAILED",
    message: string,
    readonly status = 400,
    readonly details?: { pipelineRun?: PipelineRun; apiCallLogs?: ApiCallLog[] }
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
  runId?: string;
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
    const completedAt = new Date().toISOString();
    const pipelineRun: PipelineRun = {
      id: input.runId ?? `run-${Date.now()}`,
      status: "failed",
      mode: "live",
      apiCallsUsed: client.usage.calls,
      apiSafeBudget: 50,
      holdersScanned: 0,
      walletsEnriched: 0,
      cacheHits: client.usage.cacheHits,
      cacheMisses: client.usage.cacheMisses,
      durationMs: Date.now() - startedAt.getTime(),
      rateLimitBudgetUsed: Math.round((client.usage.calls / 50) * 100),
      stayedUnderLimit: client.usage.calls <= 50,
      startedAt: startedAt.toISOString(),
      completedAt,
      sources: [{ source: "Token Holder", status: "missing", detail: holdersResult.error, calls: holdersResult.cacheHit ? 0 : client.usage.calls }]
    };
    throw new SnapshotError("TOKEN_HOLDER_SOURCE_FAILED", `Token Holder is required for a live snapshot. ${holdersResult.error}`, 502, {
      pipelineRun,
      apiCallLogs: toApiCallLogs([holdersResult], pipelineRun.id, input.tokenId)
    });
  }

  const [distribution, price, security, transfers] = await Promise.all([
    client.getHolderDistribution(chain, address),
    client.getPriceStats(chain, address),
    isTokenSecurityAvailable() ? client.getTokenSecurity(chain, address) : Promise.resolve(null),
    client.getTokenTransfers(chain, address, { limit: 50 })
  ]);

  const holders = normalizeHolders(holdersResult.data);
  const previousHolders = input.previousHolders ?? [];
  const previousSnapshots = input.previousSnapshots ?? [];
  const segments = previousHolders.length ? classifyHolderSegments(previousHolders, holders) : createBaselineSegments(holders);
  const currentSnapshot = calculateSnapshotScores({
    previousTrackedWallets: previousHolders.length,
    currentTrackedWallets: holders.length,
    top10SupplyPercent: distribution.ok ? distribution.data.top10SupplyPercent : undefined,
    top50SupplyPercent: distribution.ok ? distribution.data.top50SupplyPercent : undefined,
    priceUsd: price.ok ? price.data.priceUsd : undefined,
    priceChange24h: price.ok ? price.data.priceChange24h : undefined,
    segments
  });

  const expectedOptionalResults = [distribution, price, transfers, ...(security ? [security] : [])];
  const tokenSecuritySource = security
    ? {
        source: "Token Security" as const,
        status: security.ok ? ("complete" as const) : ("missing" as const),
        detail: security.ok ? "risk context added" : security.error,
        calls: security.cacheHit ? 0 : 1
      }
    : {
        source: "Token Security" as const,
        status: "skipped" as const,
        detail: `not available on Birdeye ${birdeyePackageLabel()} package`,
        calls: 0
      };

  const pipelineRun: PipelineRun = {
    id: input.runId ?? `run-${Date.now()}`,
    status: expectedOptionalResults.some((result) => !result.ok) ? "partial" : "complete",
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
      { source: "Token Holder", status: "complete", detail: previousHolders.length ? `${holders.length} holders scanned` : `${holders.length} holders scanned; baseline snapshot`, calls: holdersResult.cacheHit ? 0 : 1 },
      { source: "Holder Distribution", status: distribution.ok ? "complete" : "missing", detail: distribution.ok ? "concentration calculated" : distribution.error, calls: distribution.cacheHit ? 0 : 1 },
      { source: "Price Stats", status: price.ok ? "complete" : "missing", detail: price.ok ? "market context added" : price.error, calls: price.cacheHit ? 0 : 1 },
      tokenSecuritySource,
      { source: "Token Transfer", status: transfers.ok ? "complete" : "missing", detail: transfers.ok ? "transfer context added" : transfers.error, calls: transfers.cacheHit ? 0 : 1 },
      { source: "Wallet Current Net Worth", status: "skipped", detail: "wallet enrichment deferred unless a high-priority wallet needs it", calls: 0 }
    ]
  };
  const apiCallLogs = toApiCallLogs([holdersResult, distribution, price, transfers, ...(security ? [security] : [])], pipelineRun.id, input.tokenId);

  return {
    token: {
      id: input.tokenId,
      chain,
      address,
      symbol: input.token?.symbol ?? "LIVE",
      name: input.token?.name ?? "Live Birdeye Token",
      decimals: input.token?.decimals ?? 6,
      securityStatus: security?.ok ? "clear" : "unknown",
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
    pipelineRun,
    apiCallLogs
  };
}

function toApiCallLogs(results: Array<{ sourceLabel: string; statusCode?: number; cacheHit: boolean; durationMs: number; ok: boolean; error?: string }>, runId: string, tokenId: string): ApiCallLog[] {
  const createdAt = new Date().toISOString();
  return results.map((result) => ({
    runId,
    endpoint: result.sourceLabel,
    tokenId,
    statusCode: result.statusCode,
    cacheHit: result.cacheHit,
    durationMs: result.durationMs,
    errorMessage: result.ok ? undefined : result.error,
    createdAt
  }));
}

export function isDemoMode() {
  return process.env.DEMO_MODE === "true";
}

function isTokenSecurityAvailable() {
  return new Set(["lite", "starter", "premium", "business", "enterprise"]).has(birdeyePackageLabel());
}

function birdeyePackageLabel() {
  return String(process.env.BIRDEYE_PACKAGE ?? "standard").trim().toLowerCase();
}

function createBaselineSegments(holders: HolderSnapshot[]): HolderSegment[] {
  return holders.map((holder) => ({
    walletAddress: holder.walletAddress,
    segment: "BASELINE_HOLDER",
    previousBalance: 0,
    currentBalance: holder.balance,
    changePercent: 0,
    currentRank: holder.holderRank,
    currentSupplyPercent: holder.supplyPercent,
    detectedAt: holder.snapshotAt,
    explanation: ["Baseline live snapshot. Run another snapshot to calculate churn and balance-change segments."],
    sourceEndpoints: ["Token Holder"]
  }));
}
