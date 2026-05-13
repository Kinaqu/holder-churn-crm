import { getDemoDataset } from "@/lib/demo/demo-data";

export async function GET() {
  return Response.json({ pipelineRuns: [getDemoDataset().pipelineRun] });
}
