import type { HolderSegment, ScoreBreakdown, TokenSnapshot } from "@/lib/types";

export function calculateSnapshotScores(input: {
  previousTrackedWallets: number;
  currentTrackedWallets: number;
  holderCount?: number;
  top10SupplyPercent?: number;
  top50SupplyPercent?: number;
  priceUsd?: number;
  priceChange24h?: number;
  unresolvedHolders?: number;
  segments: HolderSegment[];
}): TokenSnapshot {
  const likelyExited = input.segments.filter((item) => item.segment === "LIKELY_EXITED" || item.segment === "RETAIL_CHURN").length;
  const newHolders = input.segments.filter((item) => item.segment === "NEW_HOLDER").length;
  const whaleReduced = input.segments.filter((item) => item.segment === "WHALE_REDUCED").length;
  const whaleAccumulated = input.segments.filter((item) => item.segment === "WHALE_ACCUMULATED").length;

  const churnRate = input.previousTrackedWallets > 0 ? (likelyExited / input.previousTrackedWallets) * 100 : 0;
  const top10 = input.top10SupplyPercent;
  const top50 = input.top50SupplyPercent;
  const hasHistory = input.previousTrackedWallets > 0;
  const hasDistribution = top10 !== undefined || top50 !== undefined;
  const unresolvedRate = input.currentTrackedWallets > 0 ? ((input.unresolvedHolders ?? 0) / (input.currentTrackedWallets + (input.unresolvedHolders ?? 0))) * 100 : 0;

  const whaleConfidenceScore = clamp(50 + whaleAccumulated * 12 - whaleReduced * 15);
  const distributionRiskScore = top10 === undefined ? 50 : top10 >= 50 ? 85 : top10 >= 25 ? 52 : 22;
  const churnRiskScore = clamp(churnRate * 10 + whaleReduced * 9);

  const retentionStability = hasHistory ? clamp(28 - churnRate * 3) : 0;
  const distributionHealth = hasDistribution ? clamp(24 - distributionRiskScore / 4) : -8;
  const returningActivity = hasHistory ? (input.segments.some((item) => item.segment === "RETURNING_HOLDER") ? 8 : 2) : 0;
  const newHolderQuality = hasHistory ? clamp(newHolders * 2) : 0;
  const churnPenalty = -Math.round(churnRiskScore / 4);
  const dataConfidence =
    (input.holderCount !== undefined ? 8 : -8) +
    (hasDistribution ? 8 : -10) +
    (unresolvedRate <= 5 ? 6 : unresolvedRate <= 20 ? 0 : -8) +
    (hasHistory ? 6 : -6);

  const scoreBreakdown: ScoreBreakdown[] = [
    { label: "retention stability", value: Math.round(retentionStability), direction: "positive" },
    { label: "whale confidence", value: hasHistory ? Math.round(whaleConfidenceScore / 5) : 0, direction: "positive" },
    { label: "distribution health", value: Math.round(distributionHealth), direction: distributionHealth < 0 ? "negative" : "positive" },
    { label: "returning holder activity", value: returningActivity, direction: "positive" },
    { label: "new holder quality", value: Math.round(newHolderQuality), direction: "positive" },
    { label: "data confidence", value: Math.round(dataConfidence), direction: dataConfidence < 0 ? "negative" : "positive" },
    { label: "churn penalty", value: hasHistory ? churnPenalty : 0, direction: "negative" }
  ];

  const rawHealthScore = scoreBreakdown.reduce((sum, item) => sum + item.value, hasHistory ? 42 : 52);
  const holderHealthScore = clamp(hasHistory ? rawHealthScore : Math.min(rawHealthScore, 65));

  return {
    snapshotAt: new Date().toISOString(),
    priceUsd: input.priceUsd ?? 0,
    priceChange24h: input.priceChange24h ?? 0,
    holderCount: input.holderCount,
    trackedHolderCount: input.currentTrackedWallets,
    top10SupplyPercent: top10,
    top50SupplyPercent: top50,
    concentrationScore: top10 === undefined ? 0 : clamp(top10 * 1.4),
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
