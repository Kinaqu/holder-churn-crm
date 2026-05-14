import { getLatestHolderSegments, getLatestHolderSnapshots, getToken, hasPersistentStore } from "@/lib/db/repository";
import { getDemoDataset } from "@/lib/demo/demo-data";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  if (params.id === getDemoDataset().token.id) {
    const dataset = getDemoDataset();
    return Response.json({ ok: true, holders: dataset.holders, segments: dataset.segments, demo: true });
  }

  if (!hasPersistentStore()) {
    return Response.json({ ok: false, code: "DATABASE_NOT_CONFIGURED", message: "DATABASE_URL is required to read live holders." }, { status: 503 });
  }

  const token = await getToken(params.id);
  if (!token) {
    return Response.json({ ok: false, code: "TOKEN_NOT_FOUND", message: "Token was not found." }, { status: 404 });
  }

  const [holders, segments] = await Promise.all([getLatestHolderSnapshots(params.id), getLatestHolderSegments(params.id)]);
  return Response.json({ ok: true, holders, segments, demo: false });
}
