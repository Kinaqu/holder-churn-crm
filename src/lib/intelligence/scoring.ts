import type { HolderSegment, ScoreBreakdown, TokenSnapshot } from "@/lib/types";

export function calculateSnapshotScores(input: {
  previousTrackedWallets: number;
  currentTrackedWallets: number;
  top10SupplyPercent?: number;
  top50SupplyPercent?: number;
  priceUsd?: number;
  priceChange24h?: number;
  segments: HolderSegment[];
}): TokenSnapshot {
  const likelyExited = input.segments.filter((item) => item.segment === "LIKELY_EXITED" || item.segment === "RETAIL_CHURN").length;
  const newHolders = input.segments.filter((item) => item.segment === "NEW_HOLDER").length;
  const whaleReduced = input.segments.filter((item) => item.segment === "WHALE_REDUCED").length;
  const whaleAccumulated = input.segments.filter((item) => item.segment === "WHALE_ACCUMULATED").length;

  const churnRate = input.previousTrackedWallets > 0 ? (likelyExited / input.previousTrackedWallets) * 100 : 0;
  const top10 = input.top10SupplyPercent ?? 0;
  const top50 = input.top50SupplyPercent ?? 0;

  const whaleConfidenceScore = clamp(50 + whaleAccumulated * 12 - whaleReduced * 15);
  const distributionRiskScore = top10 >= 50 ? 85 : top10 >= 25 ? 52 : 22;
  const churnRiskScore = clamp(churnRate * 10 + whaleReduced * 9);

  const retentionStability = clamp(30 - churnRate * 3);
  const distributionHealth = clamp(25 - distributionRiskScore / 4);
  const returningActivity = input.segments.some((item) => item.segment === "RETURNING_HOLDER") ? 10 : 5;
  const newHolderQuality = clamp(newHolders * 3);
  const churnPenalty = -Math.round(churnRiskScore / 4);

  const scoreBreakdown: ScoreBreakdown[] = [
    { label: "retention stability", value: Math.round(retentionStability), direction: "positive" },
    { label: "whale confidence", value: Math.round(whaleConfidenceScore / 4), direction: "positive" },
    { label: "distribution health", value: Math.round(distributionHealth), direction: "positive" },
    { label: "returning holder activity", value: returningActivity, direction: "positive" },
    { label: "new holder quality", value: Math.round(newHolderQuality), direction: "positive" },
    { label: "churn penalty", value: churnPenalty, direction: "negative" }
  ];

  const holderHealthScore = clamp(scoreBreakdown.reduce((sum, item) => sum + item.value, 35));

  return {
    snapshotAt: new Date().toISOString(),
    priceUsd: input.priceUsd ?? 0,
    priceChange24h: input.priceChange24h ?? 0,
    holderCount: input.currentTrackedWallets,
    top10SupplyPercent: top10,
    top50SupplyPercent: top50,
    concentrationScore: clamp(top10 * 1.4),
    holderHealthScore,
    whaleConfidenceScore,
    churnRiskScore,
    distributionRiskScore,
    newHolders,
    likelyExited,
    churnRate,
    scoreBreakdown
  };
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
