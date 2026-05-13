import { getApiCallLogsByRun, getPipelineRunsByToken, getTokenDataset } from "@/lib/db/repository";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const dataset = await getTokenDataset(params.id);

  if (!dataset) {
    return Response.json({ ok: false, code: "TOKEN_NOT_FOUND", message: "Token was not found." }, { status: 404 });
  }

  if (dataset.pipelineRun.mode === "demo") {
    return Response.json({ ok: true, pipelineRuns: [dataset.pipelineRun], apiCallLogs: [], demo: true });
  }

  const pipelineRuns = await getPipelineRunsByToken(params.id);
  const latestRun = pipelineRuns[0];
  const apiCallLogs = latestRun ? await getApiCallLogsByRun(latestRun.id) : [];
  return Response.json({ ok: true, pipelineRuns, apiCallLogs, demo: false });
}
