# Holder Churn CRM

Birdeye-powered retention intelligence for tokenized communities.

Holder Churn CRM is not a token scanner, trading bot, or generic crypto dashboard. Birdeye is the data infrastructure. Holder Churn CRM is the retention intelligence and action layer on top: holder churn, whale confidence, campaign quality, explainable alerts, and Next Best Actions.

This is analytics software, not financial advice.

## What It Does

- Holder churn: identifies likely exits and reduced positions from consecutive holder snapshots.
- Whale confidence: tracks top-holder accumulation and reduction pressure.
- Distribution risk: uses holder concentration to explain fragility risk.
- Campaign impact: compares persisted snapshots around campaign markers without inventing retention.
- Source-verifiable alerts: attaches Birdeye sources, reasons, confidence, and Next Best Actions.

## Demo Walkthrough

1. Open `/dashboard`.
2. Show the Birdeye Intelligence Pipeline centerpiece.
3. Open the Whale Reduced alert.
4. Show Birdeye sources plus Next Best Actions.
5. Open `/tokens/demo-birdeye` and review holder segments.
6. Open the Campaigns tab.
7. Show live “Needs more snapshots” behavior versus full labeled demo campaign data.
8. Click `Run Snapshot` and show partial snapshot success in the Pipeline tab.

## Why this is only possible with Birdeye

Holder Churn CRM is built around Birdeye as the core data infrastructure.

Without Birdeye, the app would need to maintain its own blockchain indexer, token holder extractor, transfer parser, price history database, wallet enrichment pipeline, token security checks, and holder distribution analytics.

Birdeye provides the primitives that make this product possible:

- Token Holder API -> holder snapshots
- Holder Distribution -> concentration and distribution risk
- Token Transfer -> churn and whale movement context
- Wallet Balance Change -> selected wallet deep analysis
- Wallet Net Worth -> holder quality context
- Price Stats / Historical Price -> market context around churn
- Token Security -> risk-adjusted holder health scoring

Holder Churn CRM turns these primitives into retention analytics, whale confidence, campaign attribution, explainable churn alerts, and source-backed actions.

## Architecture

```text
Birdeye Data API
  -> Server-side Birdeye client
  -> Snapshot runner
  -> Postgres persistence
  -> Holder diff and segments
  -> Scores, alerts, and actions
  -> Dashboard
```

The MVP is snapshot-first, cache-aware, and designed around a safe internal target of 50 Birdeye requests per minute.

## Snapshot Pipeline

Required for live snapshot:

- Token Holder

Optional sources:

- Holder Distribution
- Price Stats
- Token Security (skipped on Birdeye Standard)
- Token Transfer (Solana-only)
- Wallet enrichment for only 5-10 priority wallets

Optional sources can fail without failing the snapshot. The Pipeline panel marks unavailable package/chain sources as skipped, marks temporary upstream failures as missing, and the dashboard continues with partial data.

MVP per-snapshot budget:

- Token Holder: 1-3 calls
- Holder Distribution: 1 call
- Price Stats: 1 call
- Token Security: 0 calls on Standard; 1 call only on enabled higher packages
- Token Transfers: 1-2 calls when the chain and package allow it
- Wallet Enrichment: max 5-10 selected wallets

## Methodology

Segmentation is deterministic:

- New Holder: present now, missing before.
- Likely Exited: present before, missing now.
- Whale Reduced: top 50 or above threshold and down more than 10%.
- Whale Accumulated: top 50 or above threshold and up more than 10%.
- Reduced/Increased Position: non-whale changes above 20%.

Missing wallets are labeled “likely exited or dropped below tracked threshold” because top-holder snapshots are thresholded.

Scores are transparent heuristics, not fake ML:

- Holder Churn Rate = likely exited / previous tracked wallets
- Whale Confidence starts at 50, adds accumulation, subtracts reduction
- Distribution Risk follows top 10 holder concentration bands
- Holder Health combines retention stability, whale confidence, distribution health, returning activity, new holder quality, churn penalty, and security context when available

## Environment Variables

```env
BIRDEYE_API_KEY=
BIRDEYE_PACKAGE=standard
BIRDEYE_TOKEN_SECURITY_ENABLED=
DATABASE_URL=
CRON_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
DEMO_MODE=true

UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
BIRDEYE_ACCOUNT_RPS=1
BIRDEYE_ACCOUNT_RPM=50
BIRDEYE_WALLET_RPS=5
BIRDEYE_WALLET_RPM=30
```

`BIRDEYE_API_KEY` is server-only. All Birdeye calls go through `src/lib/birdeye/client.ts`.

`BIRDEYE_ACCOUNT_RPS` defaults to `1` to stay compatible with Birdeye Standard package rate limits. Raise it only when the Birdeye package allows higher account-level throughput.

`BIRDEYE_PACKAGE` defaults to `standard`. Token Security is never called on `standard`; it is shown as a planned skipped source and does not make the snapshot partial. On higher packages, Token Security still requires `BIRDEYE_TOKEN_SECURITY_ENABLED=true` so an accidentally overstated package env does not trigger unsupported calls. Optional sources that return `401` or `403` are cached as unavailable for the current key/package for several hours so later snapshots do not repeat known-inaccessible calls.

To verify the Solana-only holder endpoints with the exact runtime key, run:

```bash
npm run birdeye:check -- --address <SOLANA_TOKEN_MINT>
```

The diagnostic checks Token Holder as a baseline, then Holder Distribution and Token Transfer. It prints status codes, response previews, and rate-limit/auth headers without printing the API key.

If `DATABASE_URL` is missing, the app runs deterministic demo mode and clearly states data is not persisted. If `DATABASE_URL` exists but `BIRDEYE_API_KEY` is missing, live tokens can be read from the database but live snapshots return `BIRDEYE_API_KEY_MISSING`.

## Vercel Cron

`vercel.json` schedules:

```json
{
  "path": "/api/cron/snapshot",
  "schedule": "0 0 * * *"
}
```

The route requires:

```http
Authorization: Bearer ${CRON_SECRET}
```

Cron processes only a tiny batch per run. Manual snapshot remains the primary MVP path.

Cron behavior:

- `CRON_SECRET` missing -> `CRON_SECRET_MISSING`
- invalid bearer token -> `UNAUTHORIZED`
- `DATABASE_URL` missing -> `DATABASE_NOT_CONFIGURED`
- `BIRDEYE_API_KEY` missing -> `BIRDEYE_API_KEY_MISSING`
- default batch size is 2 live tokens, capped at 3
- one token failure is recorded in that token's `pipeline_runs` and does not fail the whole batch

Manual snapshots remain the recommended path for demos and first live verification.

## Commands

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:push
npm run db:studio
npm run dev
npm run seed:demo
npm run typecheck
npm run lint
npm run build
```

Use `npm run db:push` for the fastest MVP setup against a fresh Neon/Postgres database. Use `npm run db:generate` and `npm run db:migrate` when you want a migration artifact workflow.

## Deployment

Required Vercel environment variables:

```env
BIRDEYE_API_KEY=
DATABASE_URL=
CRON_SECRET=
NEXT_PUBLIC_APP_URL=
```

Optional environment variables:

```env
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
DEMO_MODE=
BIRDEYE_PACKAGE=
BIRDEYE_TOKEN_SECURITY_ENABLED=
BIRDEYE_ACCOUNT_RPS=
BIRDEYE_ACCOUNT_RPM=
BIRDEYE_WALLET_RPS=
BIRDEYE_WALLET_RPM=
```

Live deployment checklist:

1. Create a Neon/Postgres database.
2. Set `DATABASE_URL` in Vercel and locally for setup.
3. Run `npm run db:push` against the production database, or use `npm run db:generate` then `npm run db:migrate`.
4. Set `BIRDEYE_API_KEY`.
5. Set `CRON_SECRET`.
6. Deploy to Vercel.
7. Add a live token through `/tokens/new`.
8. Run a manual snapshot from `/tokens/[tokenId]`.
9. Run a second snapshot later to see real diff-based holder segments and alerts.
10. Verify the Pipeline panel shows persisted source status, run history, and API usage.

Demo deploy mode:

- Leave `DATABASE_URL` unset, or set `DEMO_MODE=true`.
- The app serves deterministic demo data and clearly states that data is not persisted.
- Live token creation and campaign marker creation are not persisted in this mode.

Live deploy mode:

- Set `DATABASE_URL`, `BIRDEYE_API_KEY`, and `CRON_SECRET`.
- `DEMO_MODE` should be unset or `false`.
- Campaign markers are saved to Postgres.
- Campaign impact is calculated on read from persisted holder/token snapshots. If there is not enough snapshot history, the UI shows `Needs more snapshots` or `preview` instead of fake 24h/7d retention.

Common failure states:

- Missing API key: live snapshot and cron return `BIRDEYE_API_KEY_MISSING`.
- Missing database: live persistence routes return `DATABASE_NOT_CONFIGURED`.
- Insufficient campaign history: campaign impact returns `needs_more_snapshots` or `preview` with missing requirements.
- Optional Birdeye source missing: snapshot is partial; holder data is still saved if Token Holder succeeded.
- Token Holder source missing: snapshot fails, no fake holder snapshots are saved, and the failed pipeline run is recorded.

## Security Notes

- No wildcard Birdeye proxy.
- Endpoint allowlist lives in `src/lib/birdeye/endpoints.ts`.
- API key is read only in server code.
- Query params are validated.
- Errors are sanitized to avoid secret leakage.
- Upstash Redis is used for rate limiting when configured; local memory is only fallback for local/dev/demo.

## Production Deferred

The MVP intentionally defers advanced queues, campaign impact report storage, complex multi-project tenancy, and deep wallet enrichment history. Those are documented as production enhancements so they do not block the polished hackathon demo.

## Known Limitations

- Holder snapshots are top-holder snapshots, not a full historical warehouse.
- Missing wallets are labeled likely exited or dropped below the tracked threshold.
- Wallet enrichment is selective and skipped when budget is tight.
- Campaign impact needs real before/after snapshots; 24h and 7d retention remain pending until the required windows exist.
- Scores are transparent heuristics, not ML predictions.
- This is analytics software, not financial advice.
