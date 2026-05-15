import { getDemoDataset } from "@/lib/demo/demo-data";
import { getBirdeyeClient, type BirdeyeResult } from "@/lib/birdeye/client";
import { BIRDEYE_ENDPOINTS, type BirdeyeEndpointName, type BirdeyePackage } from "@/lib/birdeye/endpoints";
import { normalizeHolderPayload, type NormalizedTokenContext } from "@/lib/birdeye/normalizers";
import { classifyHolderSegments } from "@/lib/intelligence/segments";
import { calculateSnapshotScores } from "@/lib/intelligence/scoring";
import { generateAlerts } from "@/lib/intelligence/alerts";
import type { ApiCallLog, BirdeyeSource, HolderSegment, HolderSnapshot, PipelineRun, PipelineSourceStatus, Token, TokenDataset, TokenSnapshot } from "@/lib/types";

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

type SkippedOptionalSource = {
  ok: false;
  skipped: true;
  endpoint: BirdeyeEndpointName;
  sourceLabel: BirdeyeSource;
  detail: string;
  cacheHit: false;
  durationMs: number;
  calls: 0;
};

type OptionalSourceResult<T> = BirdeyeResult<T> | SkippedOptionalSource;

const capabilityCache = new Map<string, { expiresAt: number; detail: string }>();

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
      sources: [{ source: "Token Holder", status: "missing", detail: holdersResult.error, calls: holdersResult.calls }]
    };
    throw new SnapshotError("TOKEN_HOLDER_SOURCE_FAILED", `Token Holder is required for a live snapshot. ${holdersResult.error}`, 502, {
      pipelineRun,
      apiCallLogs: toApiCallLogs([holdersResult], pipelineRun.id, input.tokenId)
    });
  }

  const overview = await runOptionalSource("tokenOverview", chain, () => client.getTokenOverview(chain, address));
  const metadata = await runOptionalSource("tokenMetadata", chain, () => client.getTokenMetadata(chain, address));
  const totalSupplyFromContext = firstDefined(overview.ok ? overview.data.totalSupply : undefined, metadata.ok ? metadata.data.totalSupply : undefined);
  const holderPayload = normalizeHolderPayload(holdersResult.data, { chain, totalSupply: totalSupplyFromContext });
  const distribution = await runOptionalSource("holderDistribution", chain, () => client.getHolderDistribution(chain, address));
  const price = await runOptionalSource("priceStats", chain, () => client.getPriceStats(chain, address));
  const security = await runOptionalSource("tokenSecurity", chain, () => client.getTokenSecurity(chain, address));
  const transfers = await runOptionalSource("tokenTransfers", chain, () => client.getTokenTransfers(chain, address, { limit: 50 }));

  const holders = holderPayload.holders;
  const tokenContext = mergeTokenContext(overview.ok ? overview.data : undefined, metadata.ok ? metadata.data : undefined);
  const realHolderCount = firstDefined(holderPayload.holderCount, distribution.ok ? distribution.data.holderCount : undefined, tokenContext.holderCount);
  const top10SupplyPercent = firstDefined(distribution.ok ? distribution.data.top10SupplyPercent : undefined, tokenContext.top10SupplyPercent, sumHolderSupplyPercent(holders.slice(0, 10)));
  const top50SupplyPercent = firstDefined(distribution.ok ? distribution.data.top50SupplyPercent : undefined, tokenContext.top50SupplyPercent, sumHolderSupplyPercent(holders.slice(0, 50)));
  const previousHolders = input.previousHolders ?? [];
  const previousSnapshots = input.previousSnapshots ?? [];
  const segments = previousHolders.length ? classifyHolderSegments(previousHolders, holders) : createBaselineSegments(holders);
  const currentSnapshot = calculateSnapshotScores({
    previousTrackedWallets: previousHolders.length,
    currentTrackedWallets: holders.length,
    holderCount: realHolderCount,
    top10SupplyPercent,
    top50SupplyPercent,
    priceUsd: price.ok ? price.data.priceUsd : undefined,
    priceChange24h: price.ok ? price.data.priceChange24h : undefined,
    unresolvedHolders: holderPayload.unresolvedHolders,
    segments
  });

  const attemptedOptionalResults = [overview, metadata, distribution, price, security, transfers].filter(isAttemptedSource);

  const pipelineRun: PipelineRun = {
    id: input.runId ?? `run-${Date.now()}`,
    status: attemptedOptionalResults.some((result) => !result.ok) ? "partial" : "complete",
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
      { source: "Token Holder", status: "complete", detail: previousHolders.length ? `${holders.length} holders scanned` : `${holders.length} holders scanned; baseline snapshot`, calls: holdersResult.calls },
      sourceStatus(overview, "token identity and market totals checked"),
      sourceStatus(metadata, "token metadata checked"),
      sourceStatus(distribution, "concentration calculated"),
      sourceStatus(price, "market context added"),
      sourceStatus(security, "risk context added"),
      sourceStatus(transfers, "transfer context added"),
      { source: "Wallet Current Net Worth", status: "skipped", detail: "wallet enrichment deferred unless a high-priority wallet needs it", calls: 0 }
    ]
  };
  const apiCallLogs = toApiCallLogs([holdersResult, ...attemptedOptionalResults], pipelineRun.id, input.tokenId);

  return {
    token: {
      id: input.tokenId,
      chain,
      address,
      symbol: tokenContext.symbol ?? safeExistingSymbol(input.token?.symbol) ?? shortTokenSymbol(address),
      name: tokenContext.name ?? safeExistingName(input.token?.name) ?? "Unknown Solana Token",
      decimals: tokenContext.decimals ?? input.token?.decimals ?? 6,
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

async function runOptionalSource<T>(endpointName: BirdeyeEndpointName, chain: string, request: () => Promise<BirdeyeResult<T>>): Promise<OptionalSourceResult<T>> {
  const skipDetail = optionalSkipDetail(endpointName, chain);
  if (skipDetail) return skippedSource(endpointName, skipDetail);

  const result = await request();
  if (!result.ok && isCapabilityStatus(result.statusCode)) {
    const detail = `endpoint not available for current Birdeye key/package (${result.statusCode})`;
    rememberCapability(endpointName, chain, detail);
    return skippedSource(endpointName, detail, result.durationMs);
  }
  if (!result.ok && result.statusCode === 429 && isDeferrableOptionalSource(endpointName)) {
    return skippedSource(endpointName, rateLimitSkipDetail(result), result.durationMs);
  }

  return result;
}

function optionalSkipDetail(endpointName: BirdeyeEndpointName, chain: string) {
  const endpoint = BIRDEYE_ENDPOINTS[endpointName];
  const packageLabel = birdeyePackageLabel();
  if (endpoint.unavailableOnPackages?.includes(packageLabel)) {
    return `not available on Birdeye ${packageLabel} package`;
  }

  if (endpointName === "tokenSecurity" && process.env.BIRDEYE_TOKEN_SECURITY_ENABLED !== "true") {
    return "disabled unless BIRDEYE_TOKEN_SECURITY_ENABLED=true for a Birdeye package that includes Token Security";
  }

  const normalizedChain = chain.trim().toLowerCase();
  if (endpoint.supportedChains && !endpoint.supportedChains.includes(normalizedChain)) {
    return `only supported on ${endpoint.supportedChains.join(", ")}; current chain is ${normalizedChain || "unknown"}`;
  }

  const cached = capabilityCache.get(capabilityKey(endpointName, chain));
  if (cached && cached.expiresAt > Date.now()) return cached.detail;
  if (cached) capabilityCache.delete(capabilityKey(endpointName, chain));

  return undefined;
}

function sourceStatus<T>(result: OptionalSourceResult<T>, completeDetail: string): PipelineSourceStatus {
  if (isSkippedSource(result)) {
    return {
      source: result.sourceLabel,
      status: "skipped",
      detail: result.detail,
      calls: 0
    };
  }

  return {
    source: result.sourceLabel,
    status: result.ok ? "complete" : "missing",
    detail: result.ok ? completeDetail : result.error,
    calls: result.calls
  };
}

function isAttemptedSource<T>(result: OptionalSourceResult<T>): result is BirdeyeResult<T> {
  return !isSkippedSource(result);
}

function isSkippedSource<T>(result: OptionalSourceResult<T>): result is SkippedOptionalSource {
  return "skipped" in result && result.skipped;
}

function skippedSource(endpointName: BirdeyeEndpointName, detail: string, durationMs = 0): SkippedOptionalSource {
  return {
    ok: false,
    skipped: true,
    endpoint: endpointName,
    sourceLabel: BIRDEYE_ENDPOINTS[endpointName].label,
    detail,
    cacheHit: false,
    durationMs,
    calls: 0
  };
}

function isCapabilityStatus(statusCode?: number) {
  return statusCode === 401 || statusCode === 403;
}

function isDeferrableOptionalSource(endpointName: BirdeyeEndpointName) {
  return endpointName === "holderDistribution" || endpointName === "tokenTransfers";
}

function rateLimitSkipDetail(result: { retryAfterMs?: number }) {
  const retryText = result.retryAfterMs ? ` retry after ${Math.ceil(result.retryAfterMs / 1000)}s.` : "";
  return `deferred because Birdeye returned 429 for this optional source.${retryText}`;
}

function rememberCapability(endpointName: BirdeyeEndpointName, chain: string, detail: string) {
  capabilityCache.set(capabilityKey(endpointName, chain), {
    expiresAt: Date.now() + 6 * 60 * 60 * 1000,
    detail
  });
}

function capabilityKey(endpointName: BirdeyeEndpointName, chain: string) {
  return `${endpointName}:${birdeyePackageLabel()}:${chain.trim().toLowerCase()}`;
}

function birdeyePackageLabel(): BirdeyePackage {
  const value = String(process.env.BIRDEYE_PACKAGE ?? "standard").trim().toLowerCase();
  if (isBirdeyePackage(value)) return value;
  return "standard";
}

function isBirdeyePackage(value: string): value is BirdeyePackage {
  return new Set(["standard", "lite", "starter", "premium", "business", "enterprise"]).has(value);
}

function mergeTokenContext(...contexts: Array<NormalizedTokenContext | undefined>): NormalizedTokenContext {
  return contexts.reduce<NormalizedTokenContext>(
    (merged, context) => ({
      symbol: merged.symbol ?? context?.symbol,
      name: merged.name ?? context?.name,
      decimals: merged.decimals ?? context?.decimals,
      holderCount: merged.holderCount ?? context?.holderCount,
      totalSupply: merged.totalSupply ?? context?.totalSupply,
      top10SupplyPercent: merged.top10SupplyPercent ?? context?.top10SupplyPercent,
      top50SupplyPercent: merged.top50SupplyPercent ?? context?.top50SupplyPercent
    }),
    {}
  );
}

function firstDefined<T>(...values: Array<T | undefined>) {
  return values.find((value): value is T => value !== undefined);
}

function sumHolderSupplyPercent(holders: HolderSnapshot[]) {
  const values = holders.map((holder) => holder.supplyPercent).filter((value): value is number => value !== undefined);
  if (values.length === 0) return undefined;
  return values.reduce((sum, value) => sum + value, 0);
}

function safeExistingSymbol(symbol?: string) {
  return symbol && symbol !== "LIVE" ? symbol : undefined;
}

function safeExistingName(name?: string) {
  return name && name !== "Live Birdeye Token" ? name : undefined;
}

function shortTokenSymbol(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
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
