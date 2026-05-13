import { runManualSnapshot } from "@/lib/intelligence/snapshot";

export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  try {
    const dataset = await runManualSnapshot({ tokenId: params.id });
    return Response.json({ ok: true, dataset, partial: dataset.pipelineRun.status === "partial" });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Snapshot failed.",
        partial: false
      },
      { status: 500 }
    );
  }
}
