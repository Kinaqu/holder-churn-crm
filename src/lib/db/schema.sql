CREATE TABLE IF NOT EXISTS tokens (
  id TEXT PRIMARY KEY,
  chain TEXT NOT NULL,
  address TEXT NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  decimals INTEGER NOT NULL DEFAULT 6,
  security_status TEXT NOT NULL DEFAULT 'unknown',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS tokens_chain_address_idx ON tokens(chain, address);

CREATE TABLE IF NOT EXISTS holder_snapshots (
  id TEXT PRIMARY KEY,
  token_id TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  balance REAL NOT NULL,
  balance_usd REAL NOT NULL DEFAULT 0,
  supply_percent REAL NOT NULL DEFAULT 0,
  holder_rank INTEGER NOT NULL,
  snapshot_at TEXT NOT NULL,
  source_endpoint TEXT NOT NULL,
  source_run_id TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS holder_snapshots_token_snapshot_idx ON holder_snapshots(token_id, snapshot_at);

CREATE TABLE IF NOT EXISTS holder_segments (
  id TEXT PRIMARY KEY,
  token_id TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  segment TEXT NOT NULL,
  previous_balance REAL NOT NULL DEFAULT 0,
  current_balance REAL NOT NULL DEFAULT 0,
  change_percent REAL NOT NULL DEFAULT 0,
  previous_rank INTEGER,
  current_rank INTEGER,
  previous_supply_percent REAL,
  current_supply_percent REAL,
  detected_at TEXT NOT NULL,
  explanation_json TEXT NOT NULL,
  source_endpoints_json TEXT NOT NULL,
  source_run_id TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS holder_segments_token_detected_idx ON holder_segments(token_id, detected_at);

CREATE TABLE IF NOT EXISTS token_snapshots (
  id TEXT PRIMARY KEY,
  token_id TEXT NOT NULL,
  price_usd REAL NOT NULL DEFAULT 0,
  price_change_24h REAL NOT NULL DEFAULT 0,
  holder_count INTEGER NOT NULL DEFAULT 0,
  top10_supply_percent REAL NOT NULL DEFAULT 0,
  top50_supply_percent REAL NOT NULL DEFAULT 0,
  concentration_score INTEGER NOT NULL DEFAULT 0,
  holder_health_score INTEGER NOT NULL DEFAULT 0,
  whale_confidence_score INTEGER NOT NULL DEFAULT 0,
  churn_risk_score INTEGER NOT NULL DEFAULT 0,
  distribution_risk_score INTEGER NOT NULL DEFAULT 0,
  new_holders INTEGER NOT NULL DEFAULT 0,
  likely_exited INTEGER NOT NULL DEFAULT 0,
  churn_rate REAL NOT NULL DEFAULT 0,
  score_breakdown_json TEXT NOT NULL,
  snapshot_at TEXT NOT NULL,
  source_run_id TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS token_snapshots_token_snapshot_idx ON token_snapshots(token_id, snapshot_at);

CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  token_id TEXT NOT NULL,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  wallet_address TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  reason_json TEXT NOT NULL,
  next_best_actions_json TEXT NOT NULL,
  source_endpoints_json TEXT NOT NULL,
  confidence INTEGER NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS alerts_token_created_idx ON alerts(token_id, created_at);

CREATE TABLE IF NOT EXISTS campaign_markers (
  id TEXT PRIMARY KEY,
  token_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  started_at TEXT NOT NULL,
  ended_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS campaign_markers_token_idx ON campaign_markers(token_id);

CREATE TABLE IF NOT EXISTS pipeline_runs (
  id TEXT PRIMARY KEY,
  token_id TEXT,
  status TEXT NOT NULL,
  mode TEXT NOT NULL,
  api_calls_used INTEGER NOT NULL,
  endpoints_used_json TEXT NOT NULL,
  holders_scanned INTEGER NOT NULL,
  wallets_enriched INTEGER NOT NULL,
  cache_hits INTEGER NOT NULL,
  cache_misses INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  rate_limit_budget_used INTEGER NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS pipeline_runs_token_started_idx ON pipeline_runs(token_id, started_at);

CREATE TABLE IF NOT EXISTS api_call_logs (
  id TEXT PRIMARY KEY,
  run_id TEXT,
  endpoint TEXT NOT NULL,
  token_id TEXT,
  wallet_address TEXT,
  status_code INTEGER,
  cache_hit INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  error_message TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS api_call_logs_run_idx ON api_call_logs(run_id);
