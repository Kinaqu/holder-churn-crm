import { getApiCallLogsByRun, getPipelineRunsByToken, getToken, hasPersistentStore } from "@/lib/db/repository";
import { getDemoDataset } from "@/lib/demo/demo-data";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  if (params.id === getDemoDataset().token.id) {
    return Response.json({ ok: true, pipelineRuns: [getDemoDataset().pipelineRun], apiCallLogs: [], demo: true });
  }

  if (!hasPersistentStore()) {
    return Response.json({ ok: false, code: "DATABASE_NOT_CONFIGURED", message: "DATABASE_URL is required to read live pipeline runs." }, { status: 503 });
  }

  const token = await getToken(params.id);
  if (!token) {
    return Response.json({ ok: false, code: "TOKEN_NOT_FOUND", message: "Token was not found." }, { status: 404 });
  }

  const pipelineRuns = await getPipelineRunsByToken(params.id);
  const latestRun = pipelineRuns[0];
  const apiCallLogs = latestRun ? await getApiCallLogsByRun(latestRun.id) : [];
  return Response.json({ ok: true, pipelineRuns, apiCallLogs, demo: false });
}
