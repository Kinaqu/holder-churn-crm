import { errorResponse, okResponse } from "@/lib/api-response";
import { createToken, hasPersistentStore, listTokens } from "@/lib/db/repository";
import { normalizeAndValidateTokenInput } from "@/lib/tokens";

export async function GET() {
  const tokens = await listTokens();
  return okResponse({ tokens, persistent: hasPersistentStore() });
}

export async function POST(request: Request) {
  const body = await readTokenRequestBody(request);
  const validation = normalizeAndValidateTokenInput(body);

  if (!validation.ok) {
    return errorResponse(validation.code, validation.message, 400);
  }

  if (!hasPersistentStore()) {
    return errorResponse("DATABASE_NOT_CONFIGURED", "DATABASE_URL is required to scan and persist tokens.", 503);
  }

  const token = await createToken({
    chain: validation.chain,
    address: validation.address,
    symbol: safeOptionalString(body.symbol, 16),
    name: safeOptionalString(body.name, 80),
    decimals: Number.isFinite(Number(body.decimals)) ? Number(body.decimals) : 6
  });

  return okResponse({ token, persistent: true }, { status: 201 });
}

async function readTokenRequestBody(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await request.json()) as Record<string, unknown>;
  }

  const formData = await request.formData();
  return Object.fromEntries(formData.entries());
}

function safeOptionalString(value: unknown, maxLength: number) {
  const text = String(value ?? "").trim();
  if (!text) return undefined;
  return text.slice(0, maxLength);
}
