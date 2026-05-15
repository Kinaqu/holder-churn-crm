import { errorResponse, okResponse } from "@/lib/api-response";
import { getLatestHolderSegments, getLatestHolderSnapshots, getToken, hasPersistentStore } from "@/lib/db/repository";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  if (!hasPersistentStore()) {
    return errorResponse("DATABASE_NOT_CONFIGURED", "DATABASE_URL is required to read live holders.", 503);
  }

  const token = await getToken(params.id);
  if (!token) {
    return errorResponse("TOKEN_NOT_FOUND", "Token was not found.", 404);
  }

  const [holders, segments] = await Promise.all([getLatestHolderSnapshots(params.id), getLatestHolderSegments(params.id)]);
  return okResponse({ holders, segments });
}
