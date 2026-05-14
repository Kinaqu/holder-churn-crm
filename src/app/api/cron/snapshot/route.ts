import { errorResponse, okResponse } from "@/lib/api-response";
import { listLiveTokensForSnapshotBatch, hasPersistentStore } from "@/lib/db/repository";
import { runPersistedLiveSnapshot } from "@/lib/intelligence/live-snapshot";

export const runtime = "nodejs";

type CronError = {
  tokenId?: string;
  code: string;
  message: string;
};

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!authHeader) {
    return errorResponse("UNAUTHORIZED", "Unauthorized.", 401);
  }

  if (!cronSecret) {
    return errorResponse("CRON_SECRET_MISSING", "CRON_SECRET is required before cron snapshots can run.", 503);
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return errorResponse("UNAUTHORIZED", "Unauthorized.", 401);
  }

  if (!hasPersistentStore()) {
    return errorResponse("DATABASE_NOT_CONFIGURED", "DATABASE_URL is required for live cron snapshots.", 503);
  }

  if (!process.env.BIRDEYE_API_KEY) {
    return errorResponse("BIRDEYE_API_KEY_MISSING", "BIRDEYE_API_KEY is required for live cron snapshots.", 503);
  }

  const batchSize = clampBatchSize(new URL(request.url).searchParams.get("limit"));
  const tokens = await listLiveTokensForSnapshotBatch(batchSize);
  const summary = {
    processed: 0,
    succeeded: 0,
    partial: 0,
    failed: 0,
    skipped: 0,
    errors: [] as CronError[]
  };
  let aggregateApiCalls = 0;

  for (const token of tokens) {
    if (aggregateApiCalls >= 45) {
      summary.skipped += 1;
      summary.errors.push({ tokenId: token.id, code: "SAFE_API_BUDGET_REACHED", message: "Skipped to stay under the 50 requests/minute account budget." });
      continue;
    }

    summary.processed += 1;
    try {
      const dataset = await runPersistedLiveSnapshot(token);
      aggregateApiCalls += dataset.pipelineRun.apiCallsUsed;
      if (dataset.pipelineRun.status === "partial") {
        summary.partial += 1;
      } else {
        summary.succeeded += 1;
      }
    } catch (error) {
      summary.failed += 1;
      const code = error instanceof Error && "code" in error ? String(error.code) : "SNAPSHOT_FAILED";
      summary.errors.push({
        tokenId: token.id,
        code,
        message: publicCronErrorMessage(code)
      });
    }
  }

  return okResponse({
    batchLimit: batchSize,
    apiSafeBudget: 50,
    apiCallsUsed: aggregateApiCalls,
    ...summary
  });
}

export async function GET(request: Request) {
  return POST(request);
}

function clampBatchSize(value: string | null) {
  const parsed = Number(value ?? 2);
  if (!Number.isFinite(parsed)) return 2;
  return Math.max(1, Math.min(3, Math.floor(parsed)));
}

function publicCronErrorMessage(code: string) {
  if (code === "TOKEN_HOLDER_SOURCE_FAILED") return "Token Holder source failed, so no fake holder snapshot was saved.";
  if (code === "BIRDEYE_API_KEY_MISSING") return "BIRDEYE_API_KEY is required for live snapshots.";
  if (code === "PERSISTENCE_WRITE_FAILED") return "Snapshot completed but persistence failed.";
  if (code === "INVALID_TOKEN_ADDRESS") return "Token address is invalid for its configured chain.";
  return "Snapshot failed for this token.";
}
