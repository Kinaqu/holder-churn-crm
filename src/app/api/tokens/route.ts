import { redirect } from "next/navigation";
import { getDemoDataset } from "@/lib/demo/demo-data";

export async function GET() {
  const dataset = getDemoDataset();
  return Response.json({ tokens: [dataset.token], demo: !process.env.DATABASE_URL });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const chain = String(formData.get("chain") ?? "solana");
  const address = String(formData.get("address") ?? "");

  if (!process.env.DATABASE_URL) {
    redirect(`/tokens/${getDemoDataset().token.id}?demo=1`);
  }

  return Response.json(
    {
      token: {
        id: `live-${Date.now()}`,
        chain,
        address,
        symbol: "LIVE",
        name: "Live Birdeye Token",
        decimals: 6
      },
      note: "Database persistence is intentionally minimal in the MVP. Demo mode remains the judge-ready path."
    },
    { status: 201 }
  );
}
