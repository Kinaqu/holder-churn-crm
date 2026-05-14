import { runManualSnapshot } from "@/lib/intelligence/snapshot";
import { runPersistedLiveSnapshot } from "@/lib/intelligence/live-snapshot";
import { getToken, isDemoTokenMode } from "@/lib/db/repository";

export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
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

    const dataset = await runPersistedLiveSnapshot(token);

    return Response.json({
      ok: true,
      code: dataset.pipelineRun.status === "partial" ? "PARTIAL_SNAPSHOT_COMPLETED" : "SNAPSHOT_COMPLETED",
      dataset,
      partial: dataset.pipelineRun.status === "partial"
    });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String(error.code) : "SNAPSHOT_FAILED";
    const status = error instanceof Error && "status" in error && typeof error.status === "number" ? error.status : 500;
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
