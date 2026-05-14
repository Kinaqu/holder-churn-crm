import { createCampaign, getCampaignImpactsByToken, getToken, hasPersistentStore } from "@/lib/db/repository";
import { getDemoDataset } from "@/lib/demo/demo-data";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  if (id === getDemoDataset().token.id) {
    return Response.json({ ok: true, campaigns: getDemoDataset().campaigns, demo: true });
  }

  if (!hasPersistentStore()) {
    return Response.json({ ok: false, code: "TOKEN_NOT_FOUND", message: "Token was not found." }, { status: 404 });
  }

  const token = await getToken(id);
  if (!token) {
    return Response.json({ ok: false, code: "TOKEN_NOT_FOUND", message: "Token was not found." }, { status: 404 });
  }

  const campaigns = await getCampaignImpactsByToken(id);
  return Response.json({ ok: true, campaigns, demo: false });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  if (id === getDemoDataset().token.id) {
    return Response.json({ ok: false, code: "DATABASE_NOT_CONFIGURED", message: "Demo campaign markers are deterministic and are not persisted." }, { status: 503 });
  }

  if (!hasPersistentStore()) {
    return Response.json({ ok: false, code: "TOKEN_NOT_FOUND", message: "Token was not found." }, { status: 404 });
  }

  const token = await getToken(id);
  if (!token) {
    return Response.json({ ok: false, code: "TOKEN_NOT_FOUND", message: "Token was not found." }, { status: 404 });
  }

  const validation = validateCampaignInput(body);
  if (!validation.ok) {
    return Response.json({ ok: false, code: "INVALID_CAMPAIGN_INPUT", message: validation.message }, { status: 400 });
  }

  try {
    const campaign = await createCampaign(id, validation.input);
    if (!campaign) {
      return Response.json({ ok: false, code: "CAMPAIGN_CREATE_FAILED", message: "Campaign marker could not be saved." }, { status: 500 });
    }

    const campaigns = await getCampaignImpactsByToken(id);
    return Response.json({ ok: true, campaign, campaigns, demo: false }, { status: 201 });
  } catch (error) {
    console.error("Campaign marker create failed", error);
    return Response.json({ ok: false, code: "CAMPAIGN_CREATE_FAILED", message: "Campaign marker could not be saved." }, { status: 500 });
  }
}

function validateCampaignInput(body: Record<string, unknown>):
  | { ok: true; input: { name: string; description?: string; startedAt: string; endedAt?: string | null } }
  | { ok: false; message: string } {
  const name = String(body.name ?? "").trim();
  const description = String(body.description ?? "").trim();
  const startedAtText = String(body.startedAt ?? "").trim();
  const endedAtText = String(body.endedAt ?? "").trim();

  if (!name || name.length > 120) return { ok: false, message: "Campaign name is required and must be under 120 characters." };
  if (!startedAtText) return { ok: false, message: "Campaign startedAt is required." };

  const startedAt = new Date(startedAtText);
  if (Number.isNaN(startedAt.getTime())) return { ok: false, message: "Campaign startedAt must be a valid date." };

  let endedAt: Date | undefined;
  if (endedAtText) {
    endedAt = new Date(endedAtText);
    if (Number.isNaN(endedAt.getTime())) return { ok: false, message: "Campaign endedAt must be a valid date." };
    if (endedAt.getTime() <= startedAt.getTime()) return { ok: false, message: "Campaign endedAt must be after startedAt." };
  }

  return {
    ok: true,
    input: {
      name,
      description: description.slice(0, 500),
      startedAt: startedAt.toISOString(),
      endedAt: endedAt?.toISOString() ?? null
    }
  };
}
