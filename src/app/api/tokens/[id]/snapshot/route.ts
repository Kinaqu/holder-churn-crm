import { runManualSnapshot } from "@/lib/intelligence/snapshot";
import { getLatestHolderSnapshots, getStoredTokenSnapshots, getToken, isDemoTokenMode } from "@/lib/db/repository";
import { normalizeAndValidateTokenInput } from "@/lib/tokens";

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

    const validation = normalizeAndValidateTokenInput({ chain: token.chain, address: token.address });
    if (!validation.ok) {
      return Response.json({ ok: false, code: validation.code, message: validation.message, partial: false }, { status: 400 });
    }

    const [previousHolders, previousSnapshots] = await Promise.all([getLatestHolderSnapshots(token.id), getStoredTokenSnapshots(token.id)]);

    const dataset = await runManualSnapshot({
      tokenId: token.id,
      chain: validation.chain,
      address: validation.address,
      token,
      mode: "live",
      previousHolders,
      previousSnapshots
    });

    return Response.json({
      ok: true,
      code: dataset.pipelineRun.status === "partial" ? "PARTIAL_SNAPSHOT_COMPLETED" : "SNAPSHOT_COMPLETED",
      dataset,
      partial: dataset.pipelineRun.status === "partial"
    });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String(error.code) : "SNAPSHOT_FAILED";
    const status = error instanceof Error && "status" in error && typeof error.status === "number" ? error.status : 500;
    return Response.json(
      {
        ok: false,
        code,
        message: error instanceof Error ? error.message : "Snapshot failed.",
        partial: false
      },
      { status }
    );
  }
}
