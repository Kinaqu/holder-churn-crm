import { errorResponse, okResponse } from "@/lib/api-response";
import { getAlertsByToken, getToken, hasPersistentStore } from "@/lib/db/repository";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  if (!hasPersistentStore()) {
    return errorResponse("DATABASE_NOT_CONFIGURED", "DATABASE_URL is required to read live alerts.", 503);
  }

  const token = await getToken(params.id);
  if (!token) {
    return errorResponse("TOKEN_NOT_FOUND", "Token was not found.", 404);
  }

  const alerts = await getAlertsByToken(params.id);
  return okResponse({ alerts });
}
