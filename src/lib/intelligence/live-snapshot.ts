import "server-only";

import { runManualSnapshot, SnapshotError } from "@/lib/intelligence/snapshot";
import {
  createPipelineRun,
  getLatestHolderSnapshots,
  getStoredTokenSnapshots,
  getTokenDataset,
  markPipelineRunFailed,
  saveApiCallLogs,
  saveSnapshotDataset,
  updatePipelineRun
} from "@/lib/db/repository";
import { normalizeAndValidateTokenInput } from "@/lib/tokens";
import type { Token, TokenDataset } from "@/lib/types";

export class LiveSnapshotError extends Error {
  constructor(
    readonly code:
      | "INVALID_CHAIN"
      | "INVALID_TOKEN_ADDRESS"
      | "BIRDEYE_API_KEY_MISSING"
      | "TOKEN_HOLDER_SOURCE_FAILED"
      | "PERSISTENCE_WRITE_FAILED"
      | "SNAPSHOT_FAILED",
    message: string,
    readonly status = 500
  ) {
    super(message);
  }
}

export async function runPersistedLiveSnapshot(token: Token): Promise<TokenDataset> {
  const validation = normalizeAndValidateTokenInput({ chain: token.chain, address: token.address });
  if (!validation.ok) {
    throw new LiveSnapshotError(validation.code, validation.message, 400);
  }

  const run = await createPipelineRun({ tokenId: token.id, mode: "live" });

  try {
    const [previousHolders, previousSnapshots] = await Promise.all([getLatestHolderSnapshots(token.id), getStoredTokenSnapshots(token.id)]);
    const dataset = await runManualSnapshot({
      tokenId: token.id,
      chain: validation.chain,
      address: validation.address,
      token,
      mode: "live",
      previousHolders,
      previousSnapshots,
      runId: run.id
    });

    await saveSnapshotDataset(dataset);
    return (await getTokenDataset(token.id)) ?? dataset;
  } catch (error) {
    await persistFailedRun(token.id, run.id, run.startedAt, error);
    throw normalizeSnapshotError(error);
  }
}

async function persistFailedRun(tokenId: string, runId: string, startedAt: string, error: unknown) {
  try {
    if (error instanceof SnapshotError && error.details?.pipelineRun) {
      await saveApiCallLogs(error.details.apiCallLogs ?? []);
      await updatePipelineRun(tokenId, error.details.pipelineRun, error.code);
      return;
    }

    const code = error instanceof Error && "code" in error ? String(error.code) : "SNAPSHOT_FAILED";
    await markPipelineRunFailed({ tokenId, runId, startedAt, errorMessage: code });
  } catch (persistenceError) {
    console.error("Failed to record failed live snapshot run", persistenceError);
  }
}

function normalizeSnapshotError(error: unknown): LiveSnapshotError {
  if (error instanceof LiveSnapshotError) return error;
  if (error instanceof SnapshotError) return new LiveSnapshotError(error.code, error.message, error.status);

  const code = error instanceof Error && "code" in error ? String(error.code) : "SNAPSHOT_FAILED";
  const status = error instanceof Error && "status" in error && typeof error.status === "number" ? error.status : 500;
  const allowedCodes = new Set(["PERSISTENCE_WRITE_FAILED", "BIRDEYE_API_KEY_MISSING", "TOKEN_HOLDER_SOURCE_FAILED", "INVALID_TOKEN_ADDRESS", "INVALID_CHAIN"]);
  return new LiveSnapshotError(allowedCodes.has(code) ? (code as LiveSnapshotError["code"]) : "SNAPSHOT_FAILED", error instanceof Error ? error.message : "Snapshot failed.", status);
}
