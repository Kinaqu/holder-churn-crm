import { errorResponse, okResponse } from "@/lib/api-response";
import { getDemoDataset } from "@/lib/demo/demo-data";
import { createToken, hasPersistentStore, isDemoTokenMode, listTokens } from "@/lib/db/repository";
import { normalizeAndValidateTokenInput } from "@/lib/tokens";

export async function GET() {
  const tokens = await listTokens();
  return okResponse({ tokens, demo: isDemoTokenMode(), persistent: hasPersistentStore() });
}

export async function POST(request: Request) {
  const body = await readTokenRequestBody(request);
  const validation = normalizeAndValidateTokenInput(body);

  if (!validation.ok) {
    return errorResponse(validation.code, validation.message, 400);
  }

  if (isDemoTokenMode()) {
    return okResponse({
      token: getDemoDataset().token,
      demo: true,
      persistent: false,
      warning: {
        code: hasPersistentStore() ? "DEMO_MODE_ENABLED" : "DATABASE_NOT_CONFIGURED",
        message: hasPersistentStore()
          ? "DEMO_MODE is enabled, so token creation is routed to the deterministic demo token."
          : "No persistent database is configured. The app is using deterministic demo mode and will not persist this token."
      }
    });
  }

  const token = await createToken({
    chain: validation.chain,
    address: validation.address,
    symbol: safeOptionalString(body.symbol, 16),
    name: safeOptionalString(body.name, 80),
    decimals: Number.isFinite(Number(body.decimals)) ? Number(body.decimals) : 6
  });

  return okResponse({ token, demo: false, persistent: true }, { status: 201 });
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
