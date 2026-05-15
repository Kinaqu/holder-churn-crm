import "server-only";

import { and, desc, eq, lt } from "drizzle-orm";
import { getDb, hasDatabase } from "@/lib/db/client";
import { d1Batch, d1Query, hasD1 } from "@/lib/db/d1-client";
import { alerts, apiCallLogs, campaignMarkers, holderSegments, holderSnapshots, pipelineRuns, tokenSnapshots, tokens } from "@/lib/db/schema";
import { createStableTokenId } from "@/lib/tokens";
import { classifyHolderSegments } from "@/lib/intelligence/segments";
import type { Alert, ApiCallLog, CampaignImpact, CampaignImpactMetrics, CampaignMarker, HolderSegment, HolderSnapshot, PipelineRun, Token, TokenDataset, TokenSnapshot } from "@/lib/types";

type TokenRow = {
  id: string;
  chain: string;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  security_status: Token["securityStatus"];
  created_at: string;
  updated_at: string;
};

type HolderRow = {
  id?: string;
  wallet_address: string;
  balance: number;
  balance_usd: number;
  supply_percent: number;
  holder_rank: number;
  snapshot_at: string;
  source_endpoint: string;
  source_run_id?: string;
};

type SegmentRow = {
  wallet_address: string;
  segment: HolderSegment["segment"];
  previous_balance: number;
  current_balance: number;
  change_percent: number;
  previous_rank: number | null;
  current_rank: number | null;
  previous_supply_percent: number | null;
  current_supply_percent: number | null;
  detected_at: string;
  explanation_json: string;
  source_endpoints_json: string;
};

type SnapshotRow = {
  snapshot_at: string;
  price_usd: number;
  price_change_24h: number;
  holder_count: number;
  top10_supply_percent: number;
  top50_supply_percent: number;
  concentration_score: number;
  holder_health_score: number;
  whale_confidence_score: number;
  churn_risk_score: number;
  distribution_risk_score: number;
  new_holders: number;
  likely_exited: number;
  churn_rate: number;
  score_breakdown_json: string;
};

type AlertRow = {
  id: string;
  type: string;
  severity: Alert["severity"];
  wallet_address: string | null;
  title: string;
  message: string;
  reason_json: string;
  next_best_actions_json: string;
  source_endpoints_json: string;
  confidence: number;
  status: Alert["status"];
  created_at: string;
};

type CampaignRow = {
  id: string;
  token_id: string;
  name: string;
  description: string;
  started_at: string;
  ended_at: string | null;
  created_at: string;
};

type PipelineRow = {
  id: string;
  status: PipelineRun["status"];
  mode: PipelineRun["mode"];
  api_calls_used: number;
  endpoints_used_json: string;
  holders_scanned: number;
  wallets_enriched: number;
  cache_hits: number;
  cache_misses: number;
  duration_ms: number;
  rate_limit_budget_used: number;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
};

export function hasPersistentStore() {
  return hasDatabase();
}

export async function listTokens(): Promise<Token[]> {
  if (!hasPersistentStore()) return [];

  if (hasDatabase()) {
    const rows = await getDb().select().from(tokens).orderBy(tokens.updatedAt).limit(100);
    return rows.map(mapPgToken).reverse();
  }

  const result = await d1Query<TokenRow>("SELECT * FROM tokens ORDER BY updated_at DESC LIMIT 100");
  return result.results?.map(mapToken) ?? [];
}

export async function listLiveTokensForSnapshotBatch(limit = 3): Promise<Token[]> {
  if (!hasDatabase()) return [];
  const rows = await getDb()
    .select()
    .from(tokens)
    .orderBy(tokens.updatedAt)
    .limit(Math.max(1, Math.min(3, limit)));
  return rows.map(mapPgToken);
}

export async function getToken(id: string): Promise<Token | null> {
  if (!hasPersistentStore()) return null;

  if (hasDatabase()) {
    const rows = await getDb().select().from(tokens).where(eq(tokens.id, id)).limit(1);
    return rows[0] ? mapPgToken(rows[0]) : null;
  }

  const result = await d1Query<TokenRow>("SELECT * FROM tokens WHERE id = ? LIMIT 1", [id]);
  const row = result.results?.[0];
  return row ? mapToken(row) : null;
}

export const getTokenById = getToken;

export async function createToken(input: { chain: string; address: string; symbol?: string; name?: string; decimals?: number }) {
  const now = new Date().toISOString();
  const id = createStableTokenId(input.chain, input.address);
  const token: Token = {
    id,
    chain: input.chain,
    address: input.address,
    symbol: input.symbol || shortTokenSymbol(input.address),
    name: input.name || "Unknown Solana Token",
    decimals: input.decimals ?? 6,
    securityStatus: "unknown",
    lastSnapshotAt: now,
    createdAt: now,
    updatedAt: now
  };

  if (!hasPersistentStore()) return token;

  if (hasDatabase()) {
    const existing = await getDb()
      .select()
      .from(tokens)
      .where(and(eq(tokens.chain, token.chain), eq(tokens.address, token.address)))
      .limit(1);

    if (existing[0]) return mapPgToken(existing[0]);

    const inserted = await getDb()
      .insert(tokens)
      .values({
        id: token.id,
        chain: token.chain,
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        securityStatus: token.securityStatus,
        createdAt: new Date(now),
        updatedAt: new Date(now)
      })
      .returning();

    return inserted[0] ? mapPgToken(inserted[0]) : token;
  }

  const existing = await d1Query<TokenRow>("SELECT * FROM tokens WHERE chain = ? AND address = ? LIMIT 1", [token.chain, token.address]);
  if (existing.results?.[0]) return mapToken(existing.results[0]);

  await d1Query(
    `INSERT INTO tokens (id, chain, address, symbol, name, decimals, security_status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [token.id, token.chain, token.address, token.symbol, token.name, token.decimals, token.securityStatus, now, now]
  );

  return token;
}

export async function getLatestHolderSnapshots(tokenId: string): Promise<HolderSnapshot[]> {
  if (!hasPersistentStore()) return [];

  if (hasDatabase()) {
    const latest = await getDb()
      .select({ snapshotAt: holderSnapshots.snapshotAt })
      .from(holderSnapshots)
      .where(eq(holderSnapshots.tokenId, tokenId))
      .orderBy(desc(holderSnapshots.snapshotAt))
      .limit(1);
    const snapshotAt = latest[0]?.snapshotAt;
    if (!snapshotAt) return [];

    const rows = await getDb()
      .select()
      .from(holderSnapshots)
      .where(and(eq(holderSnapshots.tokenId, tokenId), eq(holderSnapshots.snapshotAt, snapshotAt)))
      .orderBy(holderSnapshots.holderRank);
    return rows.map(mapPgHolder);
  }

  const latest = await d1Query<{ snapshot_at: string }>(
    "SELECT snapshot_at FROM holder_snapshots WHERE token_id = ? GROUP BY snapshot_at ORDER BY snapshot_at DESC LIMIT 1",
    [tokenId]
  );
  const snapshotAt = latest.results?.[0]?.snapshot_at;
  if (!snapshotAt) return [];

  const rows = await d1Query<HolderRow>(
    `SELECT wallet_address, balance, balance_usd, supply_percent, holder_rank, snapshot_at, source_endpoint
     FROM holder_snapshots WHERE token_id = ? AND snapshot_at = ? ORDER BY holder_rank ASC`,
    [tokenId, snapshotAt]
  );

  return rows.results?.map(mapHolder) ?? [];
}

export async function getPreviousHolderSnapshots(
  tokenId: string,
  before?: string | { beforeSnapshotAt?: string; beforeRunId?: string }
): Promise<HolderSnapshot[]> {
  if (!hasPersistentStore()) return [];
  const beforeSnapshotAt = typeof before === "string" ? before : before?.beforeSnapshotAt;
  const beforeRunId = typeof before === "object" ? before.beforeRunId : undefined;
  if (!beforeSnapshotAt && !beforeRunId) return getLatestHolderSnapshots(tokenId);

  if (hasDatabase()) {
    const resolvedBeforeSnapshotAt = beforeSnapshotAt ?? (beforeRunId ? await getSnapshotAtForRun(tokenId, beforeRunId) : undefined);
    if (!resolvedBeforeSnapshotAt) return [];

    const beforeDate = new Date(resolvedBeforeSnapshotAt);
    const latest = await getDb()
      .select({ snapshotAt: holderSnapshots.snapshotAt })
      .from(holderSnapshots)
      .where(and(eq(holderSnapshots.tokenId, tokenId), lt(holderSnapshots.snapshotAt, beforeDate)))
      .orderBy(desc(holderSnapshots.snapshotAt))
      .limit(1);
    const snapshotAt = latest[0]?.snapshotAt;
    if (!snapshotAt) return [];

    const rows = await getDb()
      .select()
      .from(holderSnapshots)
      .where(and(eq(holderSnapshots.tokenId, tokenId), eq(holderSnapshots.snapshotAt, snapshotAt)))
      .orderBy(holderSnapshots.holderRank);
    return rows.map(mapPgHolder);
  }

  return getLatestHolderSnapshots(tokenId);
}

async function getSnapshotAtForRun(tokenId: string, runId: string) {
  const rows = await getDb()
    .select({ snapshotAt: holderSnapshots.snapshotAt })
    .from(holderSnapshots)
    .where(and(eq(holderSnapshots.tokenId, tokenId), eq(holderSnapshots.sourceRunId, runId)))
    .orderBy(desc(holderSnapshots.snapshotAt))
    .limit(1);
  return rows[0]?.snapshotAt?.toISOString();
}

export async function getHolderSnapshotHistory(tokenId: string): Promise<HolderSnapshot[]> {
  if (!hasPersistentStore()) return [];
  if (hasDatabase()) {
    const rows = await getDb()
      .select()
      .from(holderSnapshots)
      .where(eq(holderSnapshots.tokenId, tokenId))
      .orderBy(desc(holderSnapshots.snapshotAt), holderSnapshots.holderRank)
      .limit(5000);
    return rows.map(mapPgHolder);
  }
  return getLatestHolderSnapshots(tokenId);
}

export async function getTokenDataset(tokenId: string): Promise<TokenDataset | null> {
  if (!hasPersistentStore()) return null;

  const token = await getToken(tokenId);
  if (!token) return null;

  if (hasDatabase()) {
    const [snapshots, holders, segments, alerts, pipelineRun, pipelineRuns, campaignImpacts] = await Promise.all([
      getTokenSnapshotHistory(tokenId),
      getLatestHolderSnapshots(tokenId),
      getLatestHolderSegments(tokenId),
      getAlertsByToken(tokenId),
      getLatestPipelineRun(tokenId),
      getPipelineRunsByToken(tokenId),
      getCampaignImpactsByToken(tokenId)
    ]);
    const apiCallLogs = pipelineRun ? await getApiCallLogsByRun(pipelineRun.id) : [];

    return {
      token: { ...token, lastSnapshotAt: snapshots.at(-1)?.snapshotAt ?? token.lastSnapshotAt },
      snapshots: snapshots.length ? snapshots : [emptySnapshot()],
      holders,
      previousHolders: [],
      segments,
      alerts,
      campaigns: campaignImpacts,
      pipelineRun: pipelineRun ?? emptyPipelineRun(tokenId),
      pipelineRuns,
      apiCallLogs
    };
  }

  const [snapshots, holders, segments, alerts, campaigns, pipelineRun] = await Promise.all([
    getTokenSnapshots(tokenId),
    getLatestHolderSnapshots(tokenId),
    getLatestSegments(tokenId),
    getAlerts(tokenId),
    getCampaigns(tokenId),
    getLatestPipelineRun(tokenId)
  ]);

  return {
    token: { ...token, lastSnapshotAt: snapshots.at(-1)?.snapshotAt ?? token.lastSnapshotAt },
    snapshots: snapshots.length ? snapshots : [emptySnapshot()],
    holders,
    previousHolders: [],
    segments,
    alerts,
    campaigns,
    pipelineRun: pipelineRun ?? emptyPipelineRun(tokenId)
  };
}

export async function getStoredTokenSnapshots(tokenId: string): Promise<TokenSnapshot[]> {
  if (!hasPersistentStore()) return [];
  if (hasDatabase()) return getTokenSnapshotHistory(tokenId);
  return getTokenSnapshots(tokenId);
}

export async function getTokenSnapshotHistory(tokenId: string): Promise<TokenSnapshot[]> {
  if (!hasPersistentStore()) return [];
  if (hasDatabase()) {
    const rows = await getDb()
      .select()
      .from(tokenSnapshots)
      .where(eq(tokenSnapshots.tokenId, tokenId))
      .orderBy(tokenSnapshots.snapshotAt)
      .limit(30);
    return rows.map(mapPgSnapshot);
  }
  return getTokenSnapshots(tokenId);
}

export async function getLatestTokenSnapshot(tokenId: string): Promise<TokenSnapshot | null> {
  const snapshots = await getTokenSnapshotHistory(tokenId);
  return snapshots.at(-1) ?? null;
}

export async function getCampaignMarkersByToken(tokenId: string): Promise<CampaignMarker[]> {
  if (!hasPersistentStore()) return [];
  if (hasDatabase()) {
    const rows = await getDb()
      .select()
      .from(campaignMarkers)
      .where(eq(campaignMarkers.tokenId, tokenId))
      .orderBy(desc(campaignMarkers.startedAt))
      .limit(50);
    return rows.map(mapPgCampaign);
  }
  return getCampaigns(tokenId).then((items) => items.map((impact) => impact.campaign));
}

export async function getCampaignImpactsByToken(tokenId: string): Promise<CampaignImpact[]> {
  if (!hasPersistentStore()) return [];
  const campaigns = await getCampaignMarkersByToken(tokenId);
  if (campaigns.length === 0) return [];
  const [snapshots, holders] = await Promise.all([getTokenSnapshotHistory(tokenId), getHolderSnapshotHistory(tokenId)]);
  return campaigns.map((campaign) => calculateCampaignImpact(campaign, snapshots, holders));
}

export async function createCampaign(tokenId: string, input: { name: string; description?: string; startedAt: string; endedAt?: string | null }) {
  if (!hasDatabase()) {
    throw new RepositoryError("DATABASE_NOT_CONFIGURED", "DATABASE_URL is required to save live campaign markers.", 503);
  }

  const now = new Date().toISOString();
  const inserted = await getDb()
    .insert(campaignMarkers)
    .values({
      tokenId,
      name: input.name,
      description: input.description ?? "",
      startedAt: new Date(input.startedAt),
      endedAt: input.endedAt ? new Date(input.endedAt) : null,
      createdAt: new Date(now)
    })
    .returning();

  return inserted[0] ? mapPgCampaign(inserted[0]) : null;
}

export async function getLatestHolderSegments(tokenId: string): Promise<HolderSegment[]> {
  if (!hasPersistentStore()) return [];
  if (hasDatabase()) {
    const latest = await getDb()
      .select({ detectedAt: holderSegments.detectedAt })
      .from(holderSegments)
      .where(eq(holderSegments.tokenId, tokenId))
      .orderBy(desc(holderSegments.detectedAt))
      .limit(1);
    const detectedAt = latest[0]?.detectedAt;
    if (!detectedAt) return [];

    const rows = await getDb()
      .select()
      .from(holderSegments)
      .where(and(eq(holderSegments.tokenId, tokenId), eq(holderSegments.detectedAt, detectedAt)))
      .limit(500);
    return rows.map(mapPgSegment).sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
  }
  return getLatestSegments(tokenId);
}

export async function getAlertsByToken(tokenId: string): Promise<Alert[]> {
  if (!hasPersistentStore()) return [];
  if (hasDatabase()) {
    const rows = await getDb()
      .select()
      .from(alerts)
      .where(eq(alerts.tokenId, tokenId))
      .orderBy(desc(alerts.createdAt))
      .limit(100);
    return rows.map(mapPgAlert);
  }
  return getAlerts(tokenId);
}

export async function getPipelineRunsByToken(tokenId: string): Promise<PipelineRun[]> {
  if (!hasPersistentStore()) return [];
  if (hasDatabase()) {
    const rows = await getDb()
      .select()
      .from(pipelineRuns)
      .where(eq(pipelineRuns.tokenId, tokenId))
      .orderBy(desc(pipelineRuns.startedAt))
      .limit(50);
    return rows.map(mapPgPipelineRun);
  }
  const latest = await getLatestPipelineRun(tokenId);
  return latest ? [latest] : [];
}

export async function getLatestPipelineRun(tokenId: string): Promise<PipelineRun | null> {
  if (!hasPersistentStore()) return null;
  if (hasDatabase()) {
    const rows = await getDb()
      .select()
      .from(pipelineRuns)
      .where(eq(pipelineRuns.tokenId, tokenId))
      .orderBy(desc(pipelineRuns.startedAt))
      .limit(1);
    return rows[0] ? mapPgPipelineRun(rows[0]) : null;
  }
  const rows = await d1Query<PipelineRow>("SELECT * FROM pipeline_runs WHERE token_id = ? ORDER BY started_at DESC LIMIT 1", [tokenId]);
  const row = rows.results?.[0];
  return row ? mapPipelineRun(row) : null;
}

export async function getApiCallLogsByRun(runId: string): Promise<ApiCallLog[]> {
  if (!hasPersistentStore()) return [];
  if (hasDatabase()) {
    const rows = await getDb()
      .select()
      .from(apiCallLogs)
      .where(eq(apiCallLogs.runId, runId))
      .orderBy(apiCallLogs.createdAt)
      .limit(100);
    return rows.map(mapPgApiCallLog);
  }
  return [];
}

export async function createPipelineRun(input: { id?: string; tokenId: string; mode?: PipelineRun["mode"] }) {
  const now = new Date().toISOString();
  const run: PipelineRun = {
    id: input.id ?? crypto.randomUUID(),
    tokenId: input.tokenId,
    status: "running",
    mode: input.mode ?? "live",
    apiCallsUsed: 0,
    apiSafeBudget: 50,
    holdersScanned: 0,
    walletsEnriched: 0,
    cacheHits: 0,
    cacheMisses: 0,
    durationMs: 0,
    rateLimitBudgetUsed: 0,
    stayedUnderLimit: true,
    startedAt: now,
    sources: []
  } as PipelineRun & { tokenId: string };

  if (hasDatabase()) {
    await getDb().insert(pipelineRuns).values({
      id: run.id,
      tokenId: input.tokenId,
      status: run.status,
      mode: run.mode,
      apiCallsUsed: 0,
      endpointsUsedJson: [],
      holdersScanned: 0,
      walletsEnriched: 0,
      cacheHits: 0,
      cacheMisses: 0,
      durationMs: 0,
      rateLimitBudgetUsed: 0,
      startedAt: new Date(now),
      completedAt: null,
      errorMessage: null
    });
  }

  return run;
}

export async function updatePipelineRun(tokenId: string, run: PipelineRun, errorMessage?: string | null) {
  if (!hasDatabase()) return;
  await getDb()
    .update(pipelineRuns)
    .set({
      status: run.status,
      mode: run.mode,
      apiCallsUsed: run.apiCallsUsed,
      endpointsUsedJson: run.sources,
      holdersScanned: run.holdersScanned,
      walletsEnriched: run.walletsEnriched,
      cacheHits: run.cacheHits,
      cacheMisses: run.cacheMisses,
      durationMs: run.durationMs,
      rateLimitBudgetUsed: run.rateLimitBudgetUsed,
      completedAt: run.completedAt ? new Date(run.completedAt) : null,
      errorMessage: errorMessage ?? null,
      tokenId
    })
    .where(eq(pipelineRuns.id, run.id));
}

export async function markPipelineRunFailed(input: { tokenId: string; runId: string; startedAt: string; errorMessage: string }) {
  const completedAt = new Date().toISOString();
  const run: PipelineRun = {
    id: input.runId,
    status: "failed",
    mode: "live",
    apiCallsUsed: 0,
    apiSafeBudget: 50,
    holdersScanned: 0,
    walletsEnriched: 0,
    cacheHits: 0,
    cacheMisses: 0,
    durationMs: Date.now() - new Date(input.startedAt).getTime(),
    rateLimitBudgetUsed: 0,
    stayedUnderLimit: true,
    startedAt: input.startedAt,
    completedAt,
    sources: [{ source: "Token Holder", status: "missing", detail: input.errorMessage, calls: 0 }]
  };
  await updatePipelineRun(input.tokenId, run, input.errorMessage);
  return run;
}

export async function saveHolderSnapshots(tokenId: string, runId: string, holders: HolderSnapshot[], snapshotAt: string) {
  if (!hasDatabase() || holders.length === 0) return;
  await getDb().insert(holderSnapshots).values(
    holders.map((holder) => ({
      tokenId,
      walletAddress: holder.walletAddress,
      balance: decimal(holder.balance),
      balanceUsd: decimal(holder.balanceUsd),
      supplyPercent: decimal(holder.supplyPercent ?? 0),
      holderRank: holder.holderRank,
      snapshotAt: new Date(snapshotAt),
      sourceEndpoint: holder.sourceEndpoint,
      sourceRunId: runId
    }))
  );
}

export async function saveHolderSegments(tokenId: string, runId: string, segments: HolderSegment[]) {
  if (!hasDatabase() || segments.length === 0) return;
  await getDb().insert(holderSegments).values(
    segments.map((segment) => ({
      tokenId,
      walletAddress: segment.walletAddress,
      segment: segment.segment,
      previousBalance: decimal(segment.previousBalance),
      currentBalance: decimal(segment.currentBalance),
      changePercent: decimal(segment.changePercent),
      previousRank: segment.previousRank ?? null,
      currentRank: segment.currentRank ?? null,
      previousSupplyPercent: segment.previousSupplyPercent === undefined ? null : decimal(segment.previousSupplyPercent),
      currentSupplyPercent: segment.currentSupplyPercent === undefined ? null : decimal(segment.currentSupplyPercent),
      detectedAt: new Date(segment.detectedAt),
      explanationJson: segment.explanation,
      sourceEndpointsJson: segment.sourceEndpoints,
      sourceRunId: runId
    }))
  );
}

export async function saveTokenSnapshot(tokenId: string, runId: string, snapshot: TokenSnapshot) {
  if (!hasDatabase()) return;
  await getDb().insert(tokenSnapshots).values({
    tokenId,
    priceUsd: decimal(snapshot.priceUsd),
    priceChange24h: decimal(snapshot.priceChange24h),
    holderCount: snapshot.holderCount ?? snapshot.trackedHolderCount ?? 0,
    top10SupplyPercent: decimal(snapshot.top10SupplyPercent ?? 0),
    top50SupplyPercent: decimal(snapshot.top50SupplyPercent ?? 0),
    concentrationScore: snapshot.concentrationScore,
    holderHealthScore: snapshot.holderHealthScore,
    whaleConfidenceScore: snapshot.whaleConfidenceScore,
    churnRiskScore: snapshot.churnRiskScore,
    distributionRiskScore: snapshot.distributionRiskScore,
    newHolders: snapshot.newHolders,
    likelyExited: snapshot.likelyExited,
    churnRate: decimal(snapshot.churnRate),
    scoreBreakdownJson: snapshot.scoreBreakdown,
    snapshotAt: new Date(snapshot.snapshotAt),
    sourceRunId: runId
  });
}

export async function saveAlerts(tokenId: string, runId: string, items: Alert[]) {
  if (!hasDatabase() || items.length === 0) return;
  for (const alert of items) {
    await getDb()
      .insert(alerts)
      .values({
        id: alert.id,
        tokenId,
        type: alert.type,
        severity: alert.severity,
        walletAddress: alert.walletAddress ?? null,
        title: alert.title,
        message: alert.message,
        reasonJson: alert.reason,
        nextBestActionsJson: alert.nextBestActions,
        sourceEndpointsJson: alert.sourceEndpoints,
        confidence: alert.confidence,
        status: alert.status,
        createdAt: new Date(alert.createdAt),
        sourceRunId: runId
      })
      .onConflictDoUpdate({
        target: alerts.id,
        set: {
          tokenId,
          type: alert.type,
          severity: alert.severity,
          walletAddress: alert.walletAddress ?? null,
          title: alert.title,
          message: alert.message,
          reasonJson: alert.reason,
          nextBestActionsJson: alert.nextBestActions,
          sourceEndpointsJson: alert.sourceEndpoints,
          confidence: alert.confidence,
          status: alert.status,
          createdAt: new Date(alert.createdAt),
          sourceRunId: runId
        }
      });
  }
}

export async function saveApiCallLogs(logs: ApiCallLog[]) {
  if (!hasDatabase() || logs.length === 0) return;
  await getDb().insert(apiCallLogs).values(
    logs.map((log) => ({
      runId: log.runId,
      endpoint: String(log.endpoint),
      tokenId: log.tokenId ?? null,
      walletAddress: log.walletAddress ?? null,
      statusCode: log.statusCode ?? null,
      cacheHit: log.cacheHit,
      durationMs: log.durationMs,
      errorMessage: log.errorMessage ?? null,
      createdAt: new Date(log.createdAt)
    }))
  );
}

export async function saveSnapshotDataset(dataset: TokenDataset) {
  if (hasDatabase()) {
    try {
      const token = dataset.token;
      const run = dataset.pipelineRun;
      const latestSnapshot = dataset.snapshots.at(-1);
      if (!latestSnapshot) return;

      await getDb()
        .update(tokens)
        .set({
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          securityStatus: token.securityStatus,
          updatedAt: new Date(latestSnapshot.snapshotAt)
        })
        .where(eq(tokens.id, token.id));

      await saveHolderSnapshots(token.id, run.id, dataset.holders, latestSnapshot.snapshotAt);
      await saveHolderSegments(token.id, run.id, dataset.segments);
      await saveTokenSnapshot(token.id, run.id, latestSnapshot);
      await saveAlerts(token.id, run.id, dataset.alerts);
      await saveApiCallLogs(dataset.apiCallLogs ?? []);
      await updatePipelineRun(token.id, run);
      return;
    } catch (error) {
      console.error("Failed to persist snapshot dataset", error);
      throw new RepositoryError("PERSISTENCE_WRITE_FAILED", "Snapshot completed but could not be written to the database.");
    }
  }

  if (!hasD1()) return;

  const token = dataset.token;
  const run = dataset.pipelineRun;
  const latestSnapshot = dataset.snapshots.at(-1);
  if (!latestSnapshot) return;

  const batch: Array<{ sql: string; params?: Array<string | number | boolean | null> }> = [
    {
      sql: `UPDATE tokens SET symbol = ?, name = ?, decimals = ?, security_status = ?, updated_at = ? WHERE id = ?`,
      params: [token.symbol, token.name, token.decimals, token.securityStatus, latestSnapshot.snapshotAt, token.id]
    },
    {
      sql: `INSERT INTO pipeline_runs (id, token_id, status, mode, api_calls_used, endpoints_used_json, holders_scanned, wallets_enriched, cache_hits, cache_misses, duration_ms, rate_limit_budget_used, started_at, completed_at, error_message)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        run.id,
        token.id,
        run.status,
        run.mode,
        run.apiCallsUsed,
        JSON.stringify(run.sources),
        run.holdersScanned,
        run.walletsEnriched,
        run.cacheHits,
        run.cacheMisses,
        run.durationMs,
        run.rateLimitBudgetUsed,
        run.startedAt,
        run.completedAt ?? null,
        null
      ]
    },
    {
      sql: `INSERT INTO token_snapshots (id, token_id, price_usd, price_change_24h, holder_count, top10_supply_percent, top50_supply_percent, concentration_score, holder_health_score, whale_confidence_score, churn_risk_score, distribution_risk_score, new_holders, likely_exited, churn_rate, score_breakdown_json, snapshot_at, source_run_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        crypto.randomUUID(),
        token.id,
        latestSnapshot.priceUsd,
        latestSnapshot.priceChange24h,
        latestSnapshot.holderCount ?? latestSnapshot.trackedHolderCount ?? 0,
        latestSnapshot.top10SupplyPercent ?? 0,
        latestSnapshot.top50SupplyPercent ?? 0,
        latestSnapshot.concentrationScore,
        latestSnapshot.holderHealthScore,
        latestSnapshot.whaleConfidenceScore,
        latestSnapshot.churnRiskScore,
        latestSnapshot.distributionRiskScore,
        latestSnapshot.newHolders,
        latestSnapshot.likelyExited,
        latestSnapshot.churnRate,
        JSON.stringify(latestSnapshot.scoreBreakdown),
        latestSnapshot.snapshotAt,
        run.id
      ]
    }
  ];

  for (const holder of dataset.holders) {
    batch.push({
      sql: `INSERT INTO holder_snapshots (id, token_id, wallet_address, balance, balance_usd, supply_percent, holder_rank, snapshot_at, source_endpoint, source_run_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        crypto.randomUUID(),
        token.id,
        holder.walletAddress,
        holder.balance,
        holder.balanceUsd,
        holder.supplyPercent ?? 0,
        holder.holderRank,
        latestSnapshot.snapshotAt,
        holder.sourceEndpoint,
        run.id
      ]
    });
  }

  for (const segment of dataset.segments) {
    batch.push({
      sql: `INSERT INTO holder_segments (id, token_id, wallet_address, segment, previous_balance, current_balance, change_percent, previous_rank, current_rank, previous_supply_percent, current_supply_percent, detected_at, explanation_json, source_endpoints_json, source_run_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        crypto.randomUUID(),
        token.id,
        segment.walletAddress,
        segment.segment,
        segment.previousBalance,
        segment.currentBalance,
        segment.changePercent,
        segment.previousRank ?? null,
        segment.currentRank ?? null,
        segment.previousSupplyPercent ?? null,
        segment.currentSupplyPercent ?? null,
        segment.detectedAt,
        JSON.stringify(segment.explanation),
        JSON.stringify(segment.sourceEndpoints),
        run.id
      ]
    });
  }

  for (const alert of dataset.alerts) {
    batch.push({
      sql: `INSERT OR REPLACE INTO alerts (id, token_id, type, severity, wallet_address, title, message, reason_json, next_best_actions_json, source_endpoints_json, confidence, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        alert.id,
        token.id,
        alert.type,
        alert.severity,
        alert.walletAddress ?? null,
        alert.title,
        alert.message,
        JSON.stringify(alert.reason),
        JSON.stringify(alert.nextBestActions),
        JSON.stringify(alert.sourceEndpoints),
        alert.confidence,
        alert.status,
        alert.createdAt
      ]
    });
  }

  await d1Batch(batch);
}

async function getTokenSnapshots(tokenId: string): Promise<TokenSnapshot[]> {
  const rows = await d1Query<SnapshotRow>(
    `SELECT * FROM token_snapshots WHERE token_id = ? ORDER BY snapshot_at ASC LIMIT 30`,
    [tokenId]
  );
  return rows.results?.map(mapSnapshot) ?? [];
}

async function getLatestSegments(tokenId: string): Promise<HolderSegment[]> {
  const latest = await d1Query<{ detected_at: string }>(
    "SELECT detected_at FROM holder_segments WHERE token_id = ? GROUP BY detected_at ORDER BY detected_at DESC LIMIT 1",
    [tokenId]
  );
  const detectedAt = latest.results?.[0]?.detected_at;
  if (!detectedAt) return [];

  const rows = await d1Query<SegmentRow>(
    `SELECT * FROM holder_segments WHERE token_id = ? AND detected_at = ? ORDER BY ABS(change_percent) DESC LIMIT 500`,
    [tokenId, detectedAt]
  );
  return rows.results?.map(mapSegment) ?? [];
}

async function getAlerts(tokenId: string): Promise<Alert[]> {
  const rows = await d1Query<AlertRow>("SELECT * FROM alerts WHERE token_id = ? ORDER BY created_at DESC LIMIT 100", [tokenId]);
  return rows.results?.map(mapAlert) ?? [];
}

async function getCampaigns(tokenId: string): Promise<CampaignImpact[]> {
  const rows = await d1Query<CampaignRow>("SELECT * FROM campaign_markers WHERE token_id = ? ORDER BY started_at DESC LIMIT 50", [tokenId]);
  return rows.results?.map((row) => calculateCampaignImpact(mapCampaign(row), [], [])) ?? [];
}

function mapToken(row: TokenRow): Token {
  return {
    id: row.id,
    chain: row.chain,
    address: row.address,
    symbol: row.symbol,
    name: row.name,
    decimals: row.decimals,
    securityStatus: row.security_status,
    lastSnapshotAt: row.updated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

type PgTokenRow = typeof tokens.$inferSelect;
type PgHolderRow = typeof holderSnapshots.$inferSelect;
type PgSegmentRow = typeof holderSegments.$inferSelect;
type PgSnapshotRow = typeof tokenSnapshots.$inferSelect;
type PgAlertRow = typeof alerts.$inferSelect;
type PgCampaignRow = typeof campaignMarkers.$inferSelect;
type PgPipelineRow = typeof pipelineRuns.$inferSelect;
type PgApiCallLogRow = typeof apiCallLogs.$inferSelect;

function mapPgToken(row: PgTokenRow): Token {
  const updatedAt = toIso(row.updatedAt);
  return {
    id: row.id,
    chain: row.chain,
    address: row.address,
    symbol: row.symbol,
    name: row.name,
    decimals: row.decimals,
    securityStatus: row.securityStatus as Token["securityStatus"],
    lastSnapshotAt: updatedAt,
    createdAt: toIso(row.createdAt),
    updatedAt
  };
}

function mapPgHolder(row: PgHolderRow): HolderSnapshot {
  return {
    id: row.id,
    sourceRunId: row.sourceRunId ?? undefined,
    walletAddress: row.walletAddress,
    balance: Number(row.balance),
    balanceUsd: Number(row.balanceUsd ?? 0),
    supplyPercent: Number(row.supplyPercent ?? 0),
    holderRank: row.holderRank ?? 0,
    snapshotAt: toIso(row.snapshotAt),
    sourceEndpoint: "Token Holder"
  };
}

function mapPgSegment(row: PgSegmentRow): HolderSegment {
  return {
    walletAddress: row.walletAddress,
    segment: row.segment as HolderSegment["segment"],
    previousBalance: Number(row.previousBalance ?? 0),
    currentBalance: Number(row.currentBalance ?? 0),
    changePercent: Number(row.changePercent ?? 0),
    previousRank: row.previousRank ?? undefined,
    currentRank: row.currentRank ?? undefined,
    previousSupplyPercent: row.previousSupplyPercent === null ? undefined : Number(row.previousSupplyPercent),
    currentSupplyPercent: row.currentSupplyPercent === null ? undefined : Number(row.currentSupplyPercent),
    detectedAt: toIso(row.detectedAt),
    explanation: Array.isArray(row.explanationJson) ? row.explanationJson.map(String) : [],
    sourceEndpoints: Array.isArray(row.sourceEndpointsJson) ? (row.sourceEndpointsJson as HolderSegment["sourceEndpoints"]) : ["Token Holder"]
  };
}

function mapPgSnapshot(row: PgSnapshotRow): TokenSnapshot {
  return {
    id: row.id,
    sourceRunId: row.sourceRunId,
    snapshotAt: toIso(row.snapshotAt),
    priceUsd: Number(row.priceUsd ?? 0),
    priceChange24h: Number(row.priceChange24h ?? 0),
    holderCount: row.holderCount ?? undefined,
    trackedHolderCount: row.holderCount ?? undefined,
    top10SupplyPercent: Number(row.top10SupplyPercent ?? 0),
    top50SupplyPercent: Number(row.top50SupplyPercent ?? 0),
    concentrationScore: row.concentrationScore ?? 0,
    holderHealthScore: row.holderHealthScore ?? 0,
    whaleConfidenceScore: row.whaleConfidenceScore ?? 0,
    churnRiskScore: row.churnRiskScore ?? 0,
    distributionRiskScore: row.distributionRiskScore ?? 0,
    newHolders: row.newHolders,
    likelyExited: row.likelyExited,
    churnRate: Number(row.churnRate),
    scoreBreakdown: Array.isArray(row.scoreBreakdownJson) ? (row.scoreBreakdownJson as TokenSnapshot["scoreBreakdown"]) : []
  };
}

function mapPgCampaign(row: PgCampaignRow): CampaignMarker {
  return {
    id: row.id,
    tokenId: row.tokenId,
    name: row.name,
    description: row.description ?? "",
    startedAt: toIso(row.startedAt),
    endedAt: row.endedAt ? toIso(row.endedAt) : undefined,
    createdAt: toIso(row.createdAt),
    mode: "live"
  };
}

function mapPgAlert(row: PgAlertRow): Alert {
  return {
    id: row.id,
    type: row.type,
    severity: row.severity as Alert["severity"],
    walletAddress: row.walletAddress ?? undefined,
    title: row.title,
    message: row.message,
    reason: Array.isArray(row.reasonJson) ? row.reasonJson.map(String) : [],
    nextBestActions: Array.isArray(row.nextBestActionsJson) ? row.nextBestActionsJson.map(String) : [],
    sourceEndpoints: Array.isArray(row.sourceEndpointsJson) ? (row.sourceEndpointsJson as Alert["sourceEndpoints"]) : ["Token Holder"],
    confidence: row.confidence,
    status: row.status as Alert["status"],
    createdAt: toIso(row.createdAt)
  };
}

function mapPgPipelineRun(row: PgPipelineRow): PipelineRun {
  return {
    id: row.id,
    status: row.status as PipelineRun["status"],
    mode: row.mode as PipelineRun["mode"],
    apiCallsUsed: row.apiCallsUsed,
    apiSafeBudget: 50,
    holdersScanned: row.holdersScanned,
    walletsEnriched: row.walletsEnriched,
    cacheHits: row.cacheHits,
    cacheMisses: row.cacheMisses,
    durationMs: row.durationMs,
    rateLimitBudgetUsed: row.rateLimitBudgetUsed,
    stayedUnderLimit: row.apiCallsUsed <= 50,
    startedAt: toIso(row.startedAt),
    completedAt: row.completedAt ? toIso(row.completedAt) : undefined,
    sources: Array.isArray(row.endpointsUsedJson) ? (row.endpointsUsedJson as PipelineRun["sources"]) : []
  };
}

function mapPgApiCallLog(row: PgApiCallLogRow): ApiCallLog {
  return {
    id: row.id,
    runId: row.runId ?? "",
    endpoint: row.endpoint,
    tokenId: row.tokenId ?? undefined,
    walletAddress: row.walletAddress ?? undefined,
    statusCode: row.statusCode ?? undefined,
    cacheHit: row.cacheHit,
    durationMs: row.durationMs ?? 0,
    errorMessage: row.errorMessage ?? undefined,
    createdAt: toIso(row.createdAt)
  };
}

function mapHolder(row: HolderRow): HolderSnapshot {
  return {
    id: row.id,
    sourceRunId: row.source_run_id,
    walletAddress: row.wallet_address,
    balance: Number(row.balance),
    balanceUsd: Number(row.balance_usd),
    supplyPercent: Number(row.supply_percent),
    holderRank: Number(row.holder_rank),
    snapshotAt: row.snapshot_at,
    sourceEndpoint: "Token Holder"
  };
}

function mapSnapshot(row: SnapshotRow): TokenSnapshot {
  return {
    id: "id" in row ? String(row.id) : undefined,
    snapshotAt: row.snapshot_at,
    priceUsd: Number(row.price_usd),
    priceChange24h: Number(row.price_change_24h),
    holderCount: Number(row.holder_count) || undefined,
    trackedHolderCount: Number(row.holder_count) || undefined,
    top10SupplyPercent: Number(row.top10_supply_percent),
    top50SupplyPercent: Number(row.top50_supply_percent),
    concentrationScore: Number(row.concentration_score),
    holderHealthScore: Number(row.holder_health_score),
    whaleConfidenceScore: Number(row.whale_confidence_score),
    churnRiskScore: Number(row.churn_risk_score),
    distributionRiskScore: Number(row.distribution_risk_score),
    newHolders: Number(row.new_holders),
    likelyExited: Number(row.likely_exited),
    churnRate: Number(row.churn_rate),
    scoreBreakdown: JSON.parse(row.score_breakdown_json)
  };
}

function mapSegment(row: SegmentRow): HolderSegment {
  return {
    walletAddress: row.wallet_address,
    segment: row.segment,
    previousBalance: Number(row.previous_balance),
    currentBalance: Number(row.current_balance),
    changePercent: Number(row.change_percent),
    previousRank: row.previous_rank ?? undefined,
    currentRank: row.current_rank ?? undefined,
    previousSupplyPercent: row.previous_supply_percent ?? undefined,
    currentSupplyPercent: row.current_supply_percent ?? undefined,
    detectedAt: row.detected_at,
    explanation: JSON.parse(row.explanation_json),
    sourceEndpoints: JSON.parse(row.source_endpoints_json)
  };
}

function mapAlert(row: AlertRow): Alert {
  return {
    id: row.id,
    type: row.type,
    severity: row.severity,
    walletAddress: row.wallet_address ?? undefined,
    title: row.title,
    message: row.message,
    reason: JSON.parse(row.reason_json),
    nextBestActions: JSON.parse(row.next_best_actions_json),
    sourceEndpoints: JSON.parse(row.source_endpoints_json),
    confidence: row.confidence,
    status: row.status,
    createdAt: row.created_at
  };
}

function mapCampaign(row: CampaignRow): CampaignMarker {
  return {
    id: row.id,
    tokenId: row.token_id,
    name: row.name,
    description: row.description,
    startedAt: row.started_at,
    endedAt: row.ended_at ?? undefined,
    createdAt: row.created_at,
    mode: "live",
    status: "needs_more_snapshots"
  };
}

function mapPipelineRun(row: PipelineRow): PipelineRun {
  return {
    id: row.id,
    status: row.status,
    mode: row.mode,
    apiCallsUsed: row.api_calls_used,
    apiSafeBudget: 50,
    holdersScanned: row.holders_scanned,
    walletsEnriched: row.wallets_enriched,
    cacheHits: row.cache_hits,
    cacheMisses: row.cache_misses,
    durationMs: row.duration_ms,
    rateLimitBudgetUsed: row.rate_limit_budget_used,
    stayedUnderLimit: row.api_calls_used <= 50,
    startedAt: row.started_at,
    completedAt: row.completed_at ?? undefined,
    sources: JSON.parse(row.endpoints_used_json)
  };
}

function emptySnapshot(): TokenSnapshot {
  return {
    snapshotAt: new Date().toISOString(),
    priceUsd: 0,
    priceChange24h: 0,
    holderCount: 0,
    top10SupplyPercent: 0,
    top50SupplyPercent: 0,
    concentrationScore: 0,
    holderHealthScore: 0,
    whaleConfidenceScore: 0,
    churnRiskScore: 0,
    distributionRiskScore: 0,
    newHolders: 0,
    likelyExited: 0,
    churnRate: 0,
    scoreBreakdown: []
  };
}

function emptyPipelineRun(tokenId: string): PipelineRun {
  return {
    id: `empty-${tokenId}`,
    status: "partial",
    mode: "live",
    apiCallsUsed: 0,
    apiSafeBudget: 50,
    holdersScanned: 0,
    walletsEnriched: 0,
    cacheHits: 0,
    cacheMisses: 0,
    durationMs: 0,
    rateLimitBudgetUsed: 0,
    stayedUnderLimit: true,
    startedAt: new Date().toISOString(),
    sources: [
      { source: "Token Holder", status: "skipped", detail: "Run a snapshot to load live Birdeye holder data.", calls: 0 },
      { source: "Holder Distribution", status: "skipped", detail: "Waiting for snapshot.", calls: 0 },
      { source: "Price Stats", status: "skipped", detail: "Waiting for snapshot.", calls: 0 },
      { source: "Token Security", status: "skipped", detail: "Waiting for snapshot.", calls: 0 },
      { source: "Token Transfer", status: "skipped", detail: "Waiting for snapshot.", calls: 0 }
    ]
  };
}

function toIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}

function decimal(value: number | null | undefined) {
  return String(value ?? 0);
}

function shortTokenSymbol(address: string) {
  return address.length > 10 ? `${address.slice(0, 4)}...${address.slice(-4)}` : address;
}

export class RepositoryError extends Error {
  constructor(
    readonly code: "PERSISTENCE_WRITE_FAILED" | "DATABASE_NOT_CONFIGURED",
    message: string,
    readonly status = 500
  ) {
    super(message);
  }
}

function calculateCampaignImpact(campaign: CampaignMarker, snapshots: TokenSnapshot[], holderHistory: HolderSnapshot[]): CampaignImpact {
  const startedAt = new Date(campaign.startedAt);
  const endedAt = campaign.endedAt ? new Date(campaign.endedAt) : undefined;
  const targetAt = endedAt ?? startedAt;
  const snapshotGroups = groupHoldersBySnapshot(holderHistory);
  const beforeGroup = [...snapshotGroups].reverse().find((group) => new Date(group.snapshotAt).getTime() < startedAt.getTime());
  const afterGroup =
    snapshotGroups.find((group) => new Date(group.snapshotAt).getTime() >= targetAt.getTime()) ??
    snapshotGroups.find((group) => new Date(group.snapshotAt).getTime() > startedAt.getTime());
  const beforeToken = findNearestSnapshotBefore(snapshots, startedAt);
  const afterToken = findNearestSnapshotAfter(snapshots, targetAt) ?? findNearestSnapshotAfter(snapshots, startedAt);
  const missingRequirements: string[] = [];

  if (!beforeGroup) missingRequirements.push("Needs a holder snapshot before campaign start.");
  if (!afterGroup) missingRequirements.push("Needs a holder snapshot after campaign start or end.");

  if (!beforeGroup || !afterGroup) {
    return {
      campaign,
      status: "needs_more_snapshots",
      metrics: emptyCampaignMetrics(),
      missingRequirements,
      sourceSnapshotIds: []
    };
  }

  const segments = classifyHolderSegments(beforeGroup.holders, afterGroup.holders);
  const beforeWallets = new Set(beforeGroup.holders.map((holder) => holder.walletAddress));
  const afterWallets = new Set(afterGroup.holders.map((holder) => holder.walletAddress));
  const retainedHolders = [...beforeWallets].filter((wallet) => afterWallets.has(wallet)).length;
  const after24h = findHolderGroupAfter(snapshotGroups, addMs(startedAt, 24 * 60 * 60 * 1000));
  const after7d = findHolderGroupAfter(snapshotGroups, addMs(startedAt, 7 * 24 * 60 * 60 * 1000));

  if (!after24h) missingRequirements.push("24h retention needs a snapshot at least 24 hours after campaign start.");
  if (!after7d) missingRequirements.push("7d retention needs a snapshot at least 7 days after campaign start.");
  if (!beforeToken || !afterToken) missingRequirements.push("Holder quality change needs token snapshots before and after the campaign.");

  const newHolders = segments.filter((segment) => segment.segment === "NEW_HOLDER").length;
  const likelyExited = segments.filter((segment) => segment.segment === "LIKELY_EXITED" || segment.segment === "RETAIL_CHURN").length;
  const whaleEntries = segments.filter((segment) => segment.segment === "NEW_HOLDER" && ((segment.currentRank ?? 999) <= 50 || (segment.currentSupplyPercent ?? 0) >= 1)).length;
  const whaleReduced = segments.filter((segment) => segment.segment === "WHALE_REDUCED").length;
  const holderQualityChange = beforeToken && afterToken ? afterToken.holderHealthScore - beforeToken.holderHealthScore : 0;
  const metrics: CampaignImpactMetrics = {
    newHolders,
    likelyExited,
    retainedHolders,
    retained24h: after24h ? countRetained(beforeGroup.holders, after24h.holders) : undefined,
    retained7d: after7d ? countRetained(beforeGroup.holders, after7d.holders) : undefined,
    whaleEntries,
    whaleReduced,
    holderQualityChange,
    campaignImpactScore: campaignImpactScore({ newHolders, likelyExited, retainedHolders, whaleEntries, whaleReduced, holderQualityChange }, beforeGroup.holders.length)
  };

  return {
    campaign,
    status: missingRequirements.length > 0 ? "preview" : "complete",
    metrics,
    missingRequirements,
    sourceSnapshotIds: [
      beforeGroup.sourceRunId ?? beforeGroup.snapshotAt,
      afterGroup.sourceRunId ?? afterGroup.snapshotAt,
      beforeToken?.id ?? beforeToken?.snapshotAt,
      afterToken?.id ?? afterToken?.snapshotAt
    ].filter(Boolean) as string[]
  };
}

function groupHoldersBySnapshot(holders: HolderSnapshot[]) {
  const groups = new Map<string, HolderSnapshot[]>();
  for (const holder of holders) {
    const current = groups.get(holder.snapshotAt) ?? [];
    current.push(holder);
    groups.set(holder.snapshotAt, current);
  }
  return [...groups.entries()]
    .map(([snapshotAt, items]) => ({ snapshotAt, holders: items, sourceRunId: items[0]?.sourceRunId }))
    .sort((a, b) => new Date(a.snapshotAt).getTime() - new Date(b.snapshotAt).getTime());
}

function findNearestSnapshotBefore(snapshots: TokenSnapshot[], date: Date) {
  return [...snapshots].reverse().find((snapshot) => new Date(snapshot.snapshotAt).getTime() < date.getTime());
}

function findNearestSnapshotAfter(snapshots: TokenSnapshot[], date: Date) {
  return snapshots.find((snapshot) => new Date(snapshot.snapshotAt).getTime() >= date.getTime());
}

function findHolderGroupAfter(groups: Array<{ snapshotAt: string; holders: HolderSnapshot[]; sourceRunId?: string }>, date: Date) {
  return groups.find((group) => new Date(group.snapshotAt).getTime() >= date.getTime());
}

function countRetained(before: HolderSnapshot[], after: HolderSnapshot[]) {
  const afterWallets = new Set(after.map((holder) => holder.walletAddress));
  return before.filter((holder) => afterWallets.has(holder.walletAddress)).length;
}

function addMs(date: Date, ms: number) {
  return new Date(date.getTime() + ms);
}

function emptyCampaignMetrics(): CampaignImpactMetrics {
  return {
    newHolders: 0,
    likelyExited: 0,
    retainedHolders: 0,
    whaleEntries: 0,
    whaleReduced: 0,
    holderQualityChange: 0
  };
}

function campaignImpactScore(metrics: Omit<CampaignImpactMetrics, "campaignImpactScore" | "retained24h" | "retained7d">, baselineHolders: number) {
  if (baselineHolders <= 0) return undefined;
  const retentionScore = (metrics.retainedHolders / baselineHolders) * 45;
  const acquisitionScore = Math.min(25, metrics.newHolders * 2);
  const whaleScore = metrics.whaleEntries * 8 - metrics.whaleReduced * 10;
  const qualityScore = metrics.holderQualityChange * 2;
  const churnPenalty = (metrics.likelyExited / baselineHolders) * 35;
  return Math.max(0, Math.min(100, Math.round(35 + retentionScore + acquisitionScore + whaleScore + qualityScore - churnPenalty)));
}
