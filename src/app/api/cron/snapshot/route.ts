import { runManualSnapshot } from "@/lib/intelligence/snapshot";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const dataset = await runManualSnapshot({ tokenId: "cron-demo-batch" });
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
