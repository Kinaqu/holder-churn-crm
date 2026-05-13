import { runManualSnapshot } from "@/lib/intelligence/snapshot";
import { getDemoDataset } from "@/lib/demo/demo-data";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const demo = getDemoDataset();
  const dataset = await runManualSnapshot({
    tokenId: demo.token.id,
    chain: demo.token.chain,
    address: demo.token.address,
    token: demo.token,
    mode: "demo"
  });
  return Response.json({
    ok: true,
    processedTokens: 1,
    batchLimit: 3,
    mode: dataset.pipelineRun.mode,
    status: dataset.pipelineRun.status
  });
}

export async function GET(request: Request) {
  return POST(request);
}
