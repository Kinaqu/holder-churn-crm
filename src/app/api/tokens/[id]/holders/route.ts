import { getDemoDataset } from "@/lib/demo/demo-data";

export async function GET() {
  const dataset = getDemoDataset();
  return Response.json({ holders: dataset.holders, segments: dataset.segments });
}
