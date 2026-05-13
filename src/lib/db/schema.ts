import { boolean, index, integer, jsonb, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const tokens = pgTable("tokens", {
  id: text("id").primaryKey(),
  chain: text("chain").notNull(),
  address: text("address").notNull(),
  symbol: text("symbol").notNull(),
  name: text("name").notNull(),
  securityStatus: text("security_status").default("unknown").notNull(),
  decimals: integer("decimals").default(6).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const holderSnapshots = pgTable(
  "holder_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tokenId: text("token_id").notNull(),
    walletAddress: text("wallet_address").notNull(),
    balance: numeric("balance").notNull(),
    balanceUsd: numeric("balance_usd"),
    supplyPercent: numeric("supply_percent"),
    holderRank: integer("holder_rank"),
    snapshotAt: timestamp("snapshot_at", { withTimezone: true }).notNull(),
    sourceEndpoint: text("source_endpoint").notNull(),
    sourceRunId: text("source_run_id")
  },
  (table) => ({
    tokenSnapshotIdx: index("holder_snapshots_token_snapshot_idx").on(table.tokenId, table.snapshotAt)
  })
);

export const holderSegments = pgTable("holder_segments", {
  id: uuid("id").defaultRandom().primaryKey(),
  tokenId: text("token_id").notNull(),
  walletAddress: text("wallet_address").notNull(),
  segment: text("segment").notNull(),
  previousBalance: numeric("previous_balance"),
  currentBalance: numeric("current_balance"),
  changePercent: numeric("change_percent"),
  previousRank: integer("previous_rank"),
  currentRank: integer("current_rank"),
  previousSupplyPercent: numeric("previous_supply_percent"),
  currentSupplyPercent: numeric("current_supply_percent"),
  detectedAt: timestamp("detected_at", { withTimezone: true }).notNull(),
  explanationJson: jsonb("explanation_json").notNull(),
  sourceEndpointsJson: jsonb("source_endpoints_json").notNull(),
  sourceRunId: text("source_run_id").notNull()
});

export const tokenSnapshots = pgTable("token_snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  tokenId: text("token_id").notNull(),
  priceUsd: numeric("price_usd"),
  priceChange24h: numeric("price_change_24h"),
  holderCount: integer("holder_count"),
  top10SupplyPercent: numeric("top10_supply_percent"),
  top50SupplyPercent: numeric("top50_supply_percent"),
  concentrationScore: integer("concentration_score"),
  holderHealthScore: integer("holder_health_score"),
  whaleConfidenceScore: integer("whale_confidence_score"),
  churnRiskScore: integer("churn_risk_score"),
  distributionRiskScore: integer("distribution_risk_score"),
  newHolders: integer("new_holders").default(0).notNull(),
  likelyExited: integer("likely_exited").default(0).notNull(),
  churnRate: numeric("churn_rate").default("0").notNull(),
  scoreBreakdownJson: jsonb("score_breakdown_json").notNull(),
  snapshotAt: timestamp("snapshot_at", { withTimezone: true }).notNull(),
  sourceRunId: text("source_run_id").notNull()
});

export const alerts = pgTable("alerts", {
  id: text("id").primaryKey(),
  tokenId: text("token_id").notNull(),
  type: text("type").notNull(),
  severity: text("severity").notNull(),
  walletAddress: text("wallet_address"),
  title: text("title").notNull(),
  message: text("message").notNull(),
  reasonJson: jsonb("reason_json").notNull(),
  nextBestActionsJson: jsonb("next_best_actions_json").notNull(),
  sourceEndpointsJson: jsonb("source_endpoints_json").notNull(),
  confidence: integer("confidence").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  sourceRunId: text("source_run_id").notNull()
});

export const campaignMarkers = pgTable("campaign_markers", {
  id: uuid("id").defaultRandom().primaryKey(),
  tokenId: text("token_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const pipelineRuns = pgTable("pipeline_runs", {
  id: text("id").primaryKey(),
  tokenId: text("token_id"),
  status: text("status").notNull(),
  mode: text("mode").notNull(),
  apiCallsUsed: integer("api_calls_used").notNull(),
  endpointsUsedJson: jsonb("endpoints_used_json").notNull(),
  holdersScanned: integer("holders_scanned").notNull(),
  walletsEnriched: integer("wallets_enriched").notNull(),
  cacheHits: integer("cache_hits").notNull(),
  cacheMisses: integer("cache_misses").notNull(),
  durationMs: integer("duration_ms").notNull(),
  rateLimitBudgetUsed: integer("rate_limit_budget_used").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  errorMessage: text("error_message")
});

export const apiCallLogs = pgTable("api_call_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: text("run_id"),
  endpoint: text("endpoint").notNull(),
  tokenId: text("token_id"),
  walletAddress: text("wallet_address"),
  statusCode: integer("status_code"),
  cacheHit: boolean("cache_hit").notNull(),
  durationMs: integer("duration_ms"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
