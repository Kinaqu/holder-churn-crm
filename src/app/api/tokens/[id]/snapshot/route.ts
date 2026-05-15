import { errorResponse, okResponse } from "@/lib/api-response";
import { runPersistedLiveSnapshot } from "@/lib/intelligence/live-snapshot";
import { getToken, getTokenDataset } from "@/lib/db/repository";
import type { Token } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  let tokenForError: Token | null = null;
  try {
    const token = await getToken(params.id);
    tokenForError = token;

    if (!token) {
      return errorResponse("TOKEN_NOT_FOUND", "Token was not found.", 404, { partial: false });
    }

    const dataset = await runPersistedLiveSnapshot(token);

    return okResponse({
      code: dataset.pipelineRun.status === "partial" ? "PARTIAL_SNAPSHOT_COMPLETED" : "SNAPSHOT_COMPLETED",
      dataset,
      partial: dataset.pipelineRun.status === "partial"
    });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String(error.code) : "SNAPSHOT_FAILED";
    const status = error instanceof Error && "status" in error && typeof error.status === "number" ? error.status : 500;
    const dataset = tokenForError ? await getTokenDataset(tokenForError.id).catch(() => null) : null;
    console.error("Snapshot failed", error);
    return errorResponse(code, publicSnapshotMessage(code, error), status, { partial: false, dataset: dataset ?? undefined });
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
