import { getDemoDataset } from "@/lib/demo/demo-data";

export async function GET() {
  return Response.json({ alerts: getDemoDataset().alerts });
}
