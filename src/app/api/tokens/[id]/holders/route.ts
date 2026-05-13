import { getLatestHolderSegments, getLatestHolderSnapshots, getTokenDataset } from "@/lib/db/repository";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const dataset = await getTokenDataset(params.id);

  if (!dataset) {
    return Response.json({ ok: false, code: "TOKEN_NOT_FOUND", message: "Token was not found." }, { status: 404 });
  }

  if (dataset.pipelineRun.mode === "demo") {
    return Response.json({ ok: true, holders: dataset.holders, segments: dataset.segments, demo: true });
  }

  const [holders, segments] = await Promise.all([getLatestHolderSnapshots(params.id), getLatestHolderSegments(params.id)]);
  return Response.json({ ok: true, holders, segments, demo: false });
}
