import { getAlertsByToken, getToken, hasPersistentStore } from "@/lib/db/repository";
import { getDemoDataset } from "@/lib/demo/demo-data";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  if (params.id === getDemoDataset().token.id) {
    return Response.json({ ok: true, alerts: getDemoDataset().alerts, demo: true });
  }

  if (!hasPersistentStore()) {
    return Response.json({ ok: false, code: "DATABASE_NOT_CONFIGURED", message: "DATABASE_URL is required to read live alerts." }, { status: 503 });
  }

  const token = await getToken(params.id);
  if (!token) {
    return Response.json({ ok: false, code: "TOKEN_NOT_FOUND", message: "Token was not found." }, { status: 404 });
  }

  const alerts = await getAlertsByToken(params.id);
  return Response.json({ ok: true, alerts, demo: false });
}
