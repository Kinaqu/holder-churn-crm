import { getAlertsByToken, getTokenDataset } from "@/lib/db/repository";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const dataset = await getTokenDataset(params.id);

  if (!dataset) {
    return Response.json({ ok: false, code: "TOKEN_NOT_FOUND", message: "Token was not found." }, { status: 404 });
  }

  if (dataset.pipelineRun.mode === "demo") {
    return Response.json({ ok: true, alerts: dataset.alerts, demo: true });
  }

  const alerts = await getAlertsByToken(params.id);
  return Response.json({ ok: true, alerts, demo: false });
}
