import { getTokenDataset } from "@/lib/db/repository";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const dataset = await getTokenDataset(params.id);

  if (!dataset) {
    return Response.json({ ok: false, code: "TOKEN_NOT_FOUND", message: "Token was not found." }, { status: 404 });
  }

  return Response.json({
    ok: true,
    token: dataset.token,
    latestTokenSnapshot: dataset.snapshots.at(-1) ?? null,
    latestHolderSegments: dataset.segments,
    latestAlerts: dataset.alerts,
    latestPipelineRun: dataset.pipelineRun,
    dataset,
    dataAvailability: {
      hasSnapshots: dataset.snapshots.some((snapshot) => snapshot.holderCount > 0),
      hasHolderSegments: dataset.segments.length > 0,
      hasAlerts: dataset.alerts.length > 0,
      hasPipelineRun: !dataset.pipelineRun.id.startsWith("empty-")
    }
  });
}
