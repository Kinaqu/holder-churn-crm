import { errorResponse, okResponse } from "@/lib/api-response";
import { getTokenDataset } from "@/lib/db/repository";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const dataset = await getTokenDataset(params.id);

  if (!dataset) {
    return errorResponse("TOKEN_NOT_FOUND", "Token was not found.", 404);
  }

  return okResponse({
    token: dataset.token,
    latestTokenSnapshot: dataset.snapshots.at(-1) ?? null,
    latestHolderSegments: dataset.segments,
    latestAlerts: dataset.alerts,
    latestPipelineRun: dataset.pipelineRun,
    dataset,
    dataAvailability: {
      hasSnapshots: dataset.snapshots.some((snapshot) => (snapshot.holderCount ?? snapshot.trackedHolderCount ?? 0) > 0),
      hasHolderSegments: dataset.segments.length > 0,
      hasAlerts: dataset.alerts.length > 0,
      hasPipelineRun: !dataset.pipelineRun.id.startsWith("empty-")
    }
  });
}
