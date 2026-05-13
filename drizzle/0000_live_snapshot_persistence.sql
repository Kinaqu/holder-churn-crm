CREATE TABLE IF NOT EXISTS tokens (
  id text PRIMARY KEY,
  chain text NOT NULL,
  address text NOT NULL,
  symbol text NOT NULL,
  name text NOT NULL,
  security_status text NOT NULL DEFAULT 'unknown',
  decimals integer NOT NULL DEFAULT 6,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS tokens_chain_address_idx ON tokens(chain, address);

CREATE TABLE IF NOT EXISTS holder_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id text NOT NULL,
  wallet_address text NOT NULL,
  balance numeric NOT NULL,
  balance_usd numeric,
  supply_percent numeric,
  holder_rank integer,
  snapshot_at timestamptz NOT NULL,
  source_endpoint text NOT NULL,
  source_run_id text
);

CREATE INDEX IF NOT EXISTS holder_snapshots_token_snapshot_idx ON holder_snapshots(token_id, snapshot_at);

CREATE TABLE IF NOT EXISTS holder_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id text NOT NULL,
  wallet_address text NOT NULL,
  segment text NOT NULL,
  previous_balance numeric,
  current_balance numeric,
  change_percent numeric,
  previous_rank integer,
  current_rank integer,
  previous_supply_percent numeric,
  current_supply_percent numeric,
  detected_at timestamptz NOT NULL,
  explanation_json jsonb NOT NULL,
  source_endpoints_json jsonb NOT NULL,
  source_run_id text NOT NULL
);

CREATE INDEX IF NOT EXISTS holder_segments_token_detected_idx ON holder_segments(token_id, detected_at);

CREATE TABLE IF NOT EXISTS token_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id text NOT NULL,
  price_usd numeric,
  price_change_24h numeric,
  holder_count integer,
  top10_supply_percent numeric,
  top50_supply_percent numeric,
  concentration_score integer,
  holder_health_score integer,
  whale_confidence_score integer,
  churn_risk_score integer,
  distribution_risk_score integer,
  new_holders integer NOT NULL DEFAULT 0,
  likely_exited integer NOT NULL DEFAULT 0,
  churn_rate numeric NOT NULL DEFAULT 0,
  score_breakdown_json jsonb NOT NULL,
  snapshot_at timestamptz NOT NULL,
  source_run_id text NOT NULL
);

CREATE INDEX IF NOT EXISTS token_snapshots_token_snapshot_idx ON token_snapshots(token_id, snapshot_at);

CREATE TABLE IF NOT EXISTS alerts (
  id text PRIMARY KEY,
  token_id text NOT NULL,
  type text NOT NULL,
  severity text NOT NULL,
  wallet_address text,
  title text NOT NULL,
  message text NOT NULL,
  reason_json jsonb NOT NULL,
  next_best_actions_json jsonb NOT NULL,
  source_endpoints_json jsonb NOT NULL,
  confidence integer NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  source_run_id text NOT NULL
);

CREATE INDEX IF NOT EXISTS alerts_token_created_idx ON alerts(token_id, created_at);

CREATE TABLE IF NOT EXISTS pipeline_runs (
  id text PRIMARY KEY,
  token_id text,
  status text NOT NULL,
  mode text NOT NULL,
  api_calls_used integer NOT NULL,
  endpoints_used_json jsonb NOT NULL,
  holders_scanned integer NOT NULL,
  wallets_enriched integer NOT NULL,
  cache_hits integer NOT NULL,
  cache_misses integer NOT NULL,
  duration_ms integer NOT NULL,
  rate_limit_budget_used integer NOT NULL,
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  error_message text
);

CREATE INDEX IF NOT EXISTS pipeline_runs_token_started_idx ON pipeline_runs(token_id, started_at);

CREATE TABLE IF NOT EXISTS api_call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id text,
  endpoint text NOT NULL,
  token_id text,
  wallet_address text,
  status_code integer,
  cache_hit boolean NOT NULL,
  duration_ms integer,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS api_call_logs_run_idx ON api_call_logs(run_id);
