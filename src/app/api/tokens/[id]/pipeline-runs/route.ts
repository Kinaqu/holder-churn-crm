import { errorResponse, okResponse } from "@/lib/api-response";
import { getApiCallLogsByRun, getPipelineRunsByToken, getToken, hasPersistentStore } from "@/lib/db/repository";
import { getDemoDataset } from "@/lib/demo/demo-data";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  if (params.id === getDemoDataset().token.id) {
    return okResponse({ pipelineRuns: [getDemoDataset().pipelineRun], apiCallLogs: [], demo: true });
  }

  if (!hasPersistentStore()) {
    return errorResponse("DATABASE_NOT_CONFIGURED", "DATABASE_URL is required to read live pipeline runs.", 503);
  }

  const token = await getToken(params.id);
  if (!token) {
    return errorResponse("TOKEN_NOT_FOUND", "Token was not found.", 404);
  }

  const pipelineRuns = await getPipelineRunsByToken(params.id);
  const latestRun = pipelineRuns[0];
  const apiCallLogs = latestRun ? await getApiCallLogsByRun(latestRun.id) : [];
  return okResponse({ pipelineRuns, apiCallLogs, demo: false });
}
