import "server-only";

import { d1Batch, d1Query, hasD1 } from "@/lib/db/d1-client";
import { getDemoDataset } from "@/lib/demo/demo-data";
import type { Alert, CampaignMarker, HolderSegment, HolderSnapshot, PipelineRun, Token, TokenDataset, TokenSnapshot } from "@/lib/types";

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
  wallet_address: string;
  balance: number;
  balance_usd: number;
  supply_percent: number;
  holder_rank: number;
  snapshot_at: string;
  source_endpoint: string;
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
  return hasD1();
}

export async function listTokens(): Promise<Token[]> {
  if (!hasD1()) return [getDemoDataset().token];
  const result = await d1Query<TokenRow>("SELECT * FROM tokens ORDER BY updated_at DESC LIMIT 100");
  return result.results?.map(mapToken) ?? [];
}

export async function getToken(id: string): Promise<Token | null> {
  if (!hasD1()) return id === getDemoDataset().token.id ? getDemoDataset().token : null;
  const result = await d1Query<TokenRow>("SELECT * FROM tokens WHERE id = ? LIMIT 1", [id]);
  const row = result.results?.[0];
  return row ? mapToken(row) : null;
}

export async function createToken(input: { chain: string; address: string; symbol?: string; name?: string; decimals?: number }) {
  const now = new Date().toISOString();
  const id = `${input.chain}-${input.address.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 24)}-${Date.now().toString(36)}`;
  const token: Token = {
    id,
    chain: input.chain,
    address: input.address,
    symbol: input.symbol || "LIVE",
    name: input.name || "Live Birdeye Token",
    decimals: input.decimals ?? 6,
    securityStatus: "unknown",
    lastSnapshotAt: now
  };

  if (!hasD1()) return token;

  await d1Query(
    `INSERT INTO tokens (id, chain, address, symbol, name, decimals, security_status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [token.id, token.chain, token.address, token.symbol, token.name, token.decimals, token.securityStatus, now, now]
  );

  return token;
}

export async function getLatestHolderSnapshots(tokenId: string): Promise<HolderSnapshot[]> {
  if (!hasD1()) return getDemoDataset().previousHolders;

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

export async function getTokenDataset(tokenId: string): Promise<TokenDataset> {
  if (!hasD1() || tokenId === getDemoDataset().token.id) return getDemoDataset();

  const token = await getToken(tokenId);
  if (!token) return getDemoDataset();

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

export async function saveSnapshotDataset(dataset: TokenDataset) {
  if (!hasD1()) return;

  const token = dataset.token;
  const run = dataset.pipelineRun;
  const latestSnapshot = dataset.snapshots.at(-1);
  if (!latestSnapshot) return;

  const batch: Array<{ sql: string; params?: Array<string | number | boolean | null> }> = [
    {
      sql: `UPDATE tokens SET symbol = ?, name = ?, security_status = ?, updated_at = ? WHERE id = ?`,
      params: [token.symbol, token.name, token.securityStatus, latestSnapshot.snapshotAt, token.id]
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
        latestSnapshot.holderCount,
        latestSnapshot.top10SupplyPercent,
        latestSnapshot.top50SupplyPercent,
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
        holder.supplyPercent,
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

export async function createCampaign(tokenId: string, input: { name: string; description?: string; startedAt?: string; endedAt?: string | null }) {
  const now = new Date().toISOString();
  const campaign: CampaignMarker = {
    id: crypto.randomUUID(),
    name: input.name,
    description: input.description ?? "",
    startedAt: input.startedAt ?? now,
    endedAt: input.endedAt ?? undefined,
    mode: hasD1() ? "live" : "demo",
    newHolders: 0,
    likelyExited: 0,
    whaleEntries: 0,
    holderQualityChange: 0,
    status: "needs_more_snapshots"
  };

  if (hasD1()) {
    await d1Query(
      `INSERT INTO campaign_markers (id, token_id, name, description, started_at, ended_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [campaign.id, tokenId, campaign.name, campaign.description, campaign.startedAt, campaign.endedAt ?? null, now]
    );
  }

  return campaign;
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

async function getCampaigns(tokenId: string): Promise<CampaignMarker[]> {
  const rows = await d1Query<CampaignRow>("SELECT * FROM campaign_markers WHERE token_id = ? ORDER BY started_at DESC LIMIT 50", [tokenId]);
  return rows.results?.map(mapCampaign) ?? [];
}

async function getLatestPipelineRun(tokenId: string): Promise<PipelineRun | null> {
  const rows = await d1Query<PipelineRow>("SELECT * FROM pipeline_runs WHERE token_id = ? ORDER BY started_at DESC LIMIT 1", [tokenId]);
  const row = rows.results?.[0];
  return row ? mapPipelineRun(row) : null;
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
    lastSnapshotAt: row.updated_at
  };
}

function mapHolder(row: HolderRow): HolderSnapshot {
  return {
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
    snapshotAt: row.snapshot_at,
    priceUsd: Number(row.price_usd),
    priceChange24h: Number(row.price_change_24h),
    holderCount: Number(row.holder_count),
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
    name: row.name,
    description: row.description,
    startedAt: row.started_at,
    endedAt: row.ended_at ?? undefined,
    mode: "live",
    newHolders: 0,
    likelyExited: 0,
    whaleEntries: 0,
    holderQualityChange: 0,
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
