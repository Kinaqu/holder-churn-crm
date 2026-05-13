import { TokenDetailClient } from "@/components/token-detail-client";
import { getDemoDataset } from "@/lib/demo/demo-data";

export default async function TokenDetailPage() {
  return <TokenDetailClient initialDataset={getDemoDataset()} />;
}
