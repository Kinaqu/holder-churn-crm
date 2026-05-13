import { notFound } from "next/navigation";
import { TokenDetailClient } from "@/components/token-detail-client";
import { getTokenDataset } from "@/lib/db/repository";

export default async function TokenDetailPage({ params }: { params: Promise<{ tokenId: string }> }) {
  const { tokenId } = await params;
  const dataset = await getTokenDataset(tokenId);

  if (!dataset) notFound();

  return <TokenDetailClient initialDataset={dataset} />;
}
