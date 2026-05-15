# Holder Churn CRM

**Birdeye-powered retention intelligence for Solana token communities.**

Holder Churn CRM helps token teams understand **who is leaving, who is accumulating, where holder risk is building, and what action to take next**.

It is not a token scanner, trading bot, or generic crypto dashboard.  
It is a **retention CRM layer for tokenized communities**, powered by Birdeye data.

> Analytics software only. Not financial advice.

---

## Overview

Most crypto dashboards focus on price, volume, and short-term trading signals.

Holder Churn CRM focuses on a different question:

**Are our holders becoming stronger, weaker, or leaving?**

The app takes Solana token holder data from Birdeye, persists holder snapshots, compares them over time, and turns raw on-chain changes into:

- Holder churn signals
- Whale accumulation/reduction alerts
- Distribution risk scoring
- Campaign impact analysis
- Source-backed explanations
- Next Best Actions for token teams

---

## Core Features

### Holder Churn Detection

The app compares consecutive holder snapshots and identifies wallets that are likely exiting or reducing exposure.

Signals include:

- New holders
- Likely exited holders
- Reduced positions
- Increased positions
- Whale reductions
- Whale accumulation

Because holder APIs often return tracked/top-holder snapshots, the app avoids overclaiming. Missing wallets are labeled as:

> likely exited or dropped below tracked threshold

---

### Whale Confidence

Holder Churn CRM tracks top-holder behavior and converts it into a clear confidence signal.

Examples:

- Whale accumulation increases confidence
- Whale reduction decreases confidence
- Top-holder pressure is surfaced as an alert
- Explanations show the exact wallet and change behind the signal

---

### Distribution Risk

The app uses holder concentration data to estimate how fragile a token’s holder base may be.

For example:

- Low top-10 concentration = healthier distribution
- High top-10 concentration = higher fragility risk
- Concentration changes are reflected in the holder health score

---

### Campaign Impact

Token teams often run campaigns, quests, airdrops, posts, or launches without knowing whether they create real retention.

Holder Churn CRM lets teams add campaign markers and compare snapshots around those events.

The app does **not fake campaign results**.

If there is not enough before/after snapshot history, the UI shows:

- `Needs more snapshots`
- `Preview`
- Missing requirements

This keeps the analytics honest.

---

### Source-Verifiable Alerts

Alerts are not black-box predictions.

Each alert includes:

- Severity
- Confidence
- Reason
- Related wallet or token metric
- Birdeye source endpoints
- Next Best Actions

Example alert types:

- Whale reduced
- High churn pressure
- Distribution fragility
- Campaign retention weakness
- Snapshot source unavailable

---

## Why Birdeye Is Core

Holder Churn CRM is built around Birdeye as the core data infrastructure.

Without Birdeye, this project would need to build and maintain:

- Blockchain indexers
- Token holder extractors
- Holder distribution analytics
- Transfer parsers
- Wallet enrichment pipelines
- Price history storage
- Token security checks
- Holder movement diffing infrastructure

Birdeye provides the raw primitives.  
Holder Churn CRM converts them into retention intelligence.

### Birdeye Data Used

The project is designed around these Birdeye-powered sources:

- **Token Holder API**  
  Used for holder snapshots and wallet balance tracking.

- **Holder Distribution**  
  Used for concentration and distribution risk.

- **Token Transfer**  
  Used for movement context when available.

- **Wallet Balance Change**  
  Used for deeper analysis of selected priority wallets.

- **Wallet Net Worth**  
  Used for holder quality context.

- **Price Stats / Historical Price**  
  Used to understand churn in market context.

- **Token Security**  
  Used as optional risk context when supported by the Birdeye package.

The product value is not just “calling an API.”  
The value is turning multiple Birdeye primitives into an opinionated retention workflow.

---

## Architecture

```txt
Birdeye Data API
  -> Server-side Birdeye client
  -> Snapshot runner
  -> Postgres persistence
  -> Holder diff engine
  -> Segment classifier
  -> Score engine
  -> Alert engine
  -> Next Best Action engine
  -> Dashboard UI
````

The MVP is:

* Snapshot-first
* Server-side API key protected
* Rate-limit aware
* Persistence-backed
* Demo-safe
* Built for Solana token analysis

---

## Tech Stack

* **Next.js 16**
* **React 19**
* **TypeScript**
* **Tailwind CSS**
* **Drizzle ORM**
* **Neon / Postgres**
* **Vercel**
* **Birdeye Data API**
* **Recharts**
* **Zod**

---

## Product Flow

1. User opens the dashboard.
2. User scans a Solana token mint.
3. The app stores the token.
4. User runs a snapshot.
5. The app calls Birdeye server-side.
6. Holder data is persisted.
7. A later snapshot creates real before/after comparison.
8. The app generates:

   * Holder segments
   * Churn metrics
   * Whale confidence
   * Distribution risk
   * Holder health score
   * Alerts
   * Next Best Actions

---

## Demo Walkthrough

Recommended demo path:

1. Open `/dashboard`
2. Show the Birdeye Intelligence Pipeline
3. Open a token workspace
4. Show holder health, churn, whale confidence, and distribution risk
5. Open the Whale Reduced alert
6. Show source-backed reasons and Next Best Actions
7. Open the Campaigns tab
8. Show the difference between:

   * demo campaign data
   * live `Needs more snapshots` behavior
9. Click `Run Snapshot`
10. Show the Pipeline tab with source status, API usage, and partial success handling

---

## Pages

| Route                            | Purpose                                       |
| -------------------------------- | --------------------------------------------- |
| `/`                              | Landing page and token scanner                |
| `/dashboard`                     | Token workspace overview                      |
| `/tokens/new`                    | Add or scan a token                           |
| `/tokens/[tokenId]`              | Token intelligence dashboard                  |
| `/methodology`                   | Explanation of scoring and segmentation       |
| `/settings`                      | Environment and system configuration overview |
| `/api/health`                    | Health check                                  |
| `/api/tokens`                    | Token list and creation                       |
| `/api/tokens/[id]`               | Token dataset                                 |
| `/api/tokens/[id]/snapshot`      | Manual snapshot runner                        |
| `/api/tokens/[id]/holders`       | Holder snapshots and segments                 |
| `/api/tokens/[id]/alerts`        | Alerts                                        |
| `/api/tokens/[id]/campaigns`     | Campaign markers and impact                   |
| `/api/tokens/[id]/pipeline-runs` | Pipeline history                              |
| `/api/cron/snapshot`             | Scheduled snapshot runner                     |

---

## Snapshot Pipeline

A live snapshot starts with the required Birdeye holder source.

### Required Source

* Token Holder

### Optional Sources

* Holder Distribution
* Price Stats
* Token Security
* Token Transfer
* Wallet enrichment for selected priority wallets

Optional sources can fail without failing the entire snapshot.

If the main Token Holder source fails, the snapshot fails because holder data is required for meaningful churn analytics.

---

## Rate Limit Strategy

The MVP is designed around a conservative internal budget:

```txt
50 Birdeye requests per minute
```

Default request settings:

```env
BIRDEYE_ACCOUNT_RPS=1
BIRDEYE_ACCOUNT_RPM=50
BIRDEYE_WALLET_RPS=5
BIRDEYE_WALLET_RPM=30
```

The snapshot runner keeps wallet enrichment selective so the app does not waste API budget on low-priority wallets.

Expected MVP snapshot budget:

| Source              |    Calls |
| ------------------- | -------: |
| Token Holder        |      1-3 |
| Holder Distribution |        1 |
| Price Stats         |        1 |
| Token Security      |      0-1 |
| Token Transfers     |      1-2 |
| Wallet Enrichment   | 5-10 max |

---

## Scoring Methodology

The app uses transparent heuristics, not fake ML.

### Holder Churn Rate

```txt
likely exited holders / previous tracked holders
```

### Whale Confidence

Starts at 50.

* Adds confidence for whale accumulation
* Subtracts confidence for whale reduction
* Clamped between 0 and 100

### Distribution Risk

Based on top-holder concentration bands.

Example:

| Top 10 Concentration | Risk   |
| -------------------: | ------ |
|            Below 25% | Low    |
|            25% - 50% | Medium |
|            Above 50% | High   |

### Holder Health

Holder Health combines:

* Retention stability
* Whale confidence
* Distribution health
* Returning activity
* New holder quality
* Churn penalty
* Security context when available

---

## Environment Variables

Create `.env.local`:

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

### Required for Live Mode

```env
BIRDEYE_API_KEY=
DATABASE_URL=
CRON_SECRET=
NEXT_PUBLIC_APP_URL=
```

### Optional

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

---

## Important Environment Notes

`BIRDEYE_API_KEY` is server-only.

The app does not expose a wildcard Birdeye proxy.
All allowed Birdeye calls go through the server-side client and endpoint allowlist.

If `DATABASE_URL` is missing, the app runs in deterministic demo mode.

If `DATABASE_URL` exists but `BIRDEYE_API_KEY` is missing, live tokens can still be read from the database, but live snapshots return:

```txt
BIRDEYE_API_KEY_MISSING
```

If `BIRDEYE_PACKAGE=standard`, Token Security is skipped unless explicitly enabled for a supported package.

---

## Installation

```bash
npm install
```

---

## Development

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

---

## Database Setup

For fastest MVP setup with Neon/Postgres:

```bash
npm run db:push
```

For migration workflow:

```bash
npm run db:generate
npm run db:migrate
```

Open Drizzle Studio:

```bash
npm run db:studio
```

---

## Birdeye Endpoint Diagnostic

To verify Solana Birdeye endpoints with your runtime API key:

```bash
npm run birdeye:check -- --address <SOLANA_TOKEN_MINT>
```

Optional:

```bash
npm run birdeye:check -- --address <SOLANA_TOKEN_MINT> --limit 10
```

The diagnostic checks:

* Token Holder baseline
* Token Overview
* Token Metadata
* Holder Distribution
* Token Transfer

It prints response status, schema keys, candidate fields, and rate-limit headers without printing the API key.

---

## Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck

npm run db:generate
npm run db:migrate
npm run db:push
npm run db:studio

npm run birdeye:check
```

---

## Deployment

The app is designed for Vercel.

### Vercel Setup

Set these environment variables in Vercel:

```env
BIRDEYE_API_KEY=
DATABASE_URL=
CRON_SECRET=
NEXT_PUBLIC_APP_URL=
```

Optional:

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

### Live Deployment Checklist

1. Create a Neon/Postgres database.
2. Set `DATABASE_URL` locally and in Vercel.
3. Run:

```bash
npm run db:push
```

4. Set `BIRDEYE_API_KEY`.
5. Set `CRON_SECRET`.
6. Deploy to Vercel.
7. Add a live token from `/tokens/new`.
8. Run a manual snapshot from `/tokens/[tokenId]`.
9. Run a second snapshot later to generate real holder diff data.
10. Review the Pipeline tab for source status and API usage.

---

## Vercel Cron

`vercel.json` schedules:

```json
{
  "path": "/api/cron/snapshot",
  "schedule": "0 0 * * *"
}
```

The cron endpoint requires:

```http
Authorization: Bearer <CRON_SECRET>
```

Cron behavior:

| State                | Response                    |
| -------------------- | --------------------------- |
| Missing secret       | `CRON_SECRET_MISSING`       |
| Invalid bearer token | `UNAUTHORIZED`              |
| Missing database     | `DATABASE_NOT_CONFIGURED`   |
| Missing Birdeye key  | `BIRDEYE_API_KEY_MISSING`   |
| Token failure        | Recorded in `pipeline_runs` |
| API budget reached   | Token skipped safely        |

Manual snapshots remain the recommended path for demos and first live verification.

---

## Demo Mode

Demo mode is useful for hackathon judging, local review, and public demos.

Enable it with:

```env
DEMO_MODE=true
```

Or leave `DATABASE_URL` unset.

In demo mode:

* The app serves deterministic demo data
* Live persistence is disabled
* Token creation is not persisted
* Campaign markers are not persisted
* The UI clearly states that data is not live-persisted

---

## Live Mode

Live mode requires:

```env
DATABASE_URL=
BIRDEYE_API_KEY=
CRON_SECRET=
```

In live mode:

* Tokens are saved to Postgres
* Manual snapshots are persisted
* Holder snapshots are stored
* Holder segments are generated from real snapshot diffs
* Alerts are stored
* Pipeline runs are recorded
* Campaign markers are saved
* Campaign impact is calculated from persisted snapshots

---

## Security

Security decisions:

* Birdeye API key is server-only
* No wildcard API proxy
* Endpoint allowlist for Birdeye calls
* Query params are validated
* Errors are sanitized
* Secrets are never returned to the client
* Optional Redis rate limiter supports shared deployment limits
* Local memory rate limiting is used only as fallback for local/dev/demo

---

## Common Failure States

| Problem                             | Result                     |
| ----------------------------------- | -------------------------- |
| Missing Birdeye API key             | `BIRDEYE_API_KEY_MISSING`  |
| Missing database                    | `DATABASE_NOT_CONFIGURED`  |
| Invalid token address               | `INVALID_TOKEN_ADDRESS`    |
| Token Holder source failed          | Snapshot fails             |
| Optional Birdeye source unavailable | Snapshot becomes partial   |
| Not enough campaign history         | `Needs more snapshots`     |
| Persistence write failed            | `PERSISTENCE_WRITE_FAILED` |

---

## Known Limitations

* Holder snapshots are tracked/top-holder snapshots, not a full historical warehouse.
* Missing wallets may have exited or dropped below the tracked threshold.
* Wallet enrichment is selective to protect API budget.
* Campaign impact needs real before/after snapshots.
* 24h and 7d campaign retention require enough historical data.
* Scores are transparent heuristics, not ML predictions.
* Token Security depends on Birdeye package support.
* This is analytics software, not financial advice.

---

## Production Deferred

The MVP intentionally defers:

* Advanced background queues
* Multi-project tenancy
* Full wallet enrichment history
* Stored campaign impact reports
* Full historical holder warehouse
* Complex team permissions
* Advanced alert notification channels

These are production enhancements and do not block the hackathon MVP.

---

## Why This Matters

Crypto teams often know price, volume, and market cap.

They often do not know:

* Which holders are quietly leaving
* Whether whales are losing confidence
* Whether campaigns create real retention
* Whether holder concentration is becoming dangerous
* Which wallets need attention before churn gets worse

Holder Churn CRM turns Birdeye’s on-chain data into a practical retention workflow for token teams.

---

## License

MIT
