import { runManualSnapshot, SnapshotError } from "@/lib/intelligence/snapshot";
import {
  createPipelineRun,
  getLatestHolderSnapshots,
  getStoredTokenSnapshots,
  getToken,
  getTokenDataset,
  isDemoTokenMode,
  markPipelineRunFailed,
  saveApiCallLogs,
  saveSnapshotDataset,
  updatePipelineRun
} from "@/lib/db/repository";
import { normalizeAndValidateTokenInput } from "@/lib/tokens";

export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  let runningRun: { id: string; startedAt: string; tokenId: string } | null = null;
  try {
    const token = await getToken(params.id);

    if (!token) {
      return Response.json({ ok: false, code: "TOKEN_NOT_FOUND", message: "Token was not found.", partial: false }, { status: 404 });
    }

    if (token.id === "demo-birdeye" || isDemoTokenMode()) {
      const dataset = await runManualSnapshot({
        tokenId: token.id,
        chain: token.chain,
        address: token.address,
        token,
        mode: "demo"
      });
      return Response.json({ ok: true, dataset, partial: dataset.pipelineRun.status === "partial" });
    }

    const validation = normalizeAndValidateTokenInput({ chain: token.chain, address: token.address });
    if (!validation.ok) {
      return Response.json({ ok: false, code: validation.code, message: validation.message, partial: false }, { status: 400 });
    }

    const run = await createPipelineRun({ tokenId: token.id, mode: "live" });
    runningRun = { id: run.id, startedAt: run.startedAt, tokenId: token.id };
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
    const persistedDataset = (await getTokenDataset(token.id)) ?? dataset;

    return Response.json({
      ok: true,
      code: dataset.pipelineRun.status === "partial" ? "PARTIAL_SNAPSHOT_COMPLETED" : "SNAPSHOT_COMPLETED",
      dataset: persistedDataset,
      partial: persistedDataset.pipelineRun.status === "partial"
    });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String(error.code) : "SNAPSHOT_FAILED";
    const status = error instanceof Error && "status" in error && typeof error.status === "number" ? error.status : 500;
    if (runningRun) {
      try {
        if (error instanceof SnapshotError && error.details?.pipelineRun) {
          await saveApiCallLogs(error.details.apiCallLogs ?? []);
          await updatePipelineRun(runningRun.tokenId, error.details.pipelineRun, code);
        } else {
          await markPipelineRunFailed({
            tokenId: runningRun.tokenId,
            runId: runningRun.id,
            startedAt: runningRun.startedAt,
            errorMessage: code
          });
        }
      } catch (persistenceError) {
        console.error("Failed to mark pipeline run failed", persistenceError);
      }
    }
    console.error("Snapshot failed", error);
    return Response.json(
      {
        ok: false,
        code,
        message: publicSnapshotMessage(code, error),
        partial: false
      },
      { status }
    );
  }
}

function publicSnapshotMessage(code: string, error: unknown) {
  if (code === "BIRDEYE_API_KEY_MISSING") return "BIRDEYE_API_KEY is required to run a live Birdeye snapshot.";
  if (code === "INVALID_TOKEN_ADDRESS") return "Token address is invalid for the selected chain.";
  if (code === "TOKEN_HOLDER_SOURCE_FAILED") return "Birdeye Token Holder source failed, so the snapshot could not be persisted.";
  if (code === "PERSISTENCE_WRITE_FAILED") return "Snapshot completed but could not be written to the database.";
  if (error instanceof Error && error.message.includes("Token Holder is required")) return "Birdeye Token Holder source failed, so the snapshot could not be persisted.";
  return "Snapshot failed.";
}
