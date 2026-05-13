import { getDemoDataset } from "@/lib/demo/demo-data";

export async function GET() {
  return Response.json({ campaigns: getDemoDataset().campaigns });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { name?: string; description?: string };
  return Response.json(
    {
      campaign: {
        id: `campaign-${Date.now()}`,
        name: body.name ?? "New Campaign",
        description: body.description ?? "",
        status: "needs_more_snapshots",
        message: "Live campaign impact needs before/after snapshots before retention can be calculated honestly."
      }
    },
    { status: 201 }
  );
}
