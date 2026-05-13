import type { Alert, CampaignMarker, HolderSnapshot, PipelineRun, Token, TokenDataset, TokenSnapshot } from "@/lib/types";
import { generateAlerts } from "@/lib/intelligence/alerts";
import { classifyHolderSegments } from "@/lib/intelligence/segments";

const now = "2026-05-12T16:42:00.000Z";
const previous = "2026-05-11T16:42:00.000Z";

export const demoToken: Token = {
  id: "demo-birdeye",
  chain: "solana",
  address: "BirDeyeDemo11111111111111111111111111111111",
  symbol: "BCRM",
  name: "Birdeye CRM Demo",
  decimals: 6,
  securityStatus: "clear",
  lastSnapshotAt: now
};

export const previousDemoHolders: HolderSnapshot[] = [
  holder("9xWHALE01qA7nEJ4qVX6zLw5Hn8Qp1zM2nLm", 2_850_000, 17.8, 1, previous),
  holder("8kTREASURYpA2cE7bQhL2mN9xR4sYv3D", 2_100_000, 13.1, 2, previous),
  holder("7sLAUNCHPADmK6vE1nTqR3cB8zP5hXy2", 1_540_000, 9.6, 3, previous),
  holder("6pLOYALaR9uC1fK4wY8tE3nM2vQ7z", 720_000, 4.5, 9, previous),
  holder("5dFLIPPERqT2vB8wM3pN6rL1cE9xY", 420_000, 2.6, 18, previous),
  holder("4rRETAILaM3nV7qL8pC2sT9yB1wK", 95_000, 0.6, 64, previous),
  holder("3cDORMANTuL8kP2wQ9nM4eR6yT1xZ", 84_000, 0.5, 73, previous),
  holder("2fEXITEDpR1mC7xV4nQ9tL3sB8yE", 70_000, 0.4, 91, previous)
];

export const currentDemoHolders: HolderSnapshot[] = [
  holder("9xWHALE01qA7nEJ4qVX6zLw5Hn8Qp1zM2nLm", 1_960_000, 12.2, 2, now),
  holder("8kTREASURYpA2cE7bQhL2mN9xR4sYv3D", 2_120_000, 13.2, 1, now),
  holder("7sLAUNCHPADmK6vE1nTqR3cB8zP5hXy2", 1_740_000, 10.8, 3, now),
  holder("6pLOYALaR9uC1fK4wY8tE3nM2vQ7z", 712_000, 4.4, 9, now),
  holder("5dFLIPPERqT2vB8wM3pN6rL1cE9xY", 238_000, 1.5, 29, now),
  holder("3cDORMANTuL8kP2wQ9nM4eR6yT1xZ", 84_200, 0.5, 72, now),
  holder("1nRETURNvA8qL5pZ2mC7wR9yT4sE", 155_000, 1.0, 45, now),
  holder("0xNEWCAMPAIGNhL9pQ3vR6tY1cM8nB", 128_000, 0.8, 52, now)
];

const segments = classifyHolderSegments(previousDemoHolders, currentDemoHolders);

export const demoSnapshots: TokenSnapshot[] = [
  snapshot("2026-05-08T16:42:00.000Z", 0.026, -2.1, 4210, 35.2, 57.1, 72, 61, 11, 28, 1.8, 86, 2.9),
  snapshot("2026-05-09T16:42:00.000Z", 0.027, 3.8, 4350, 36.8, 58.6, 74, 64, 9, 25, 2.4, 71, 2.5),
  snapshot("2026-05-10T16:42:00.000Z", 0.031, 14.5, 4620, 39.4, 61.2, 76, 69, 8, 23, 4.1, 66, 2.2),
  snapshot("2026-05-11T16:42:00.000Z", 0.029, -5.2, 4510, 40.5, 62.5, 73, 54, 13, 36, 2.0, 92, 3.6),
  snapshot(now, 0.032, 8.7, 4685, 38.2, 63.7, 76, 47, 15, 42, 2.8, 118, 4.2)
];

export const demoPipelineRun: PipelineRun = {
  id: "run-demo-20260512",
  status: "partial",
  mode: "demo",
  apiCallsUsed: 37,
  apiSafeBudget: 50,
  holdersScanned: 500,
  walletsEnriched: 8,
  cacheHits: 23,
  cacheMisses: 14,
  durationMs: 8400,
  rateLimitBudgetUsed: 74,
  stayedUnderLimit: true,
  startedAt: "2026-05-12T16:41:51.000Z",
  completedAt: now,
  sources: [
    { source: "Token Holder", status: "complete", detail: "500 holders scanned", calls: 3 },
    { source: "Holder Distribution", status: "complete", detail: "top 10 and top 50 concentration calculated", calls: 1 },
    { source: "Token Transfer", status: "complete", detail: "whale movement context attached", calls: 2 },
    { source: "Price Stats", status: "complete", detail: "market context added", calls: 1 },
    { source: "Token Security", status: "complete", detail: "risk adjustment applied", calls: 1 },
    { source: "Wallet Net Worth", status: "partial", detail: "8 priority wallets enriched", calls: 8 }
  ]
};

export const demoCampaigns: CampaignMarker[] = [
  {
    id: "campaign-community-week",
    name: "Community Week",
    description: "Seven-day community activation measured by retained holders, not impressions.",
    startedAt: "2026-05-09T00:00:00.000Z",
    endedAt: "2026-05-11T23:59:00.000Z",
    mode: "demo",
    newHolders: 312,
    retained24h: 221,
    retained7d: 164,
    likelyExited: 58,
    whaleEntries: 2,
    holderQualityChange: 9,
    impactScore: 78,
    status: "complete"
  },
  {
    id: "campaign-live-placeholder",
    name: "Launchpad AMA",
    description: "Live mode preview. Needs more snapshots before 24h/7d retention is honest.",
    startedAt: "2026-05-12T12:00:00.000Z",
    mode: "live",
    newHolders: 0,
    likelyExited: 0,
    whaleEntries: 0,
    holderQualityChange: 0,
    status: "needs_more_snapshots"
  }
];

export const demoAlerts: Alert[] = generateAlerts(segments, demoSnapshots.at(-1)!, demoSnapshots.at(-2)!);

export const demoDataset: TokenDataset = {
  token: demoToken,
  snapshots: demoSnapshots,
  holders: currentDemoHolders,
  previousHolders: previousDemoHolders,
  segments,
  alerts: demoAlerts,
  campaigns: demoCampaigns,
  pipelineRun: demoPipelineRun
};

export function getDemoDataset(): TokenDataset {
  return demoDataset;
}

function holder(walletAddress: string, balance: number, supplyPercent: number, holderRank: number, snapshotAt: string): HolderSnapshot {
  return {
    walletAddress,
    balance,
    balanceUsd: balance * 0.032,
    supplyPercent,
    holderRank,
    snapshotAt,
    sourceEndpoint: "Token Holder"
  };
}

function snapshot(
  snapshotAt: string,
  priceUsd: number,
  priceChange24h: number,
  holderCount: number,
  top10SupplyPercent: number,
  top50SupplyPercent: number,
  holderHealthScore: number,
  whaleConfidenceScore: number,
  churnRiskScore: number,
  distributionRiskScore: number,
  churnRate: number,
  newHolders: number,
  likelyExited: number
): TokenSnapshot {
  return {
    snapshotAt,
    priceUsd,
    priceChange24h,
    holderCount,
    top10SupplyPercent,
    top50SupplyPercent,
    concentrationScore: Math.round(top10SupplyPercent * 1.4),
    holderHealthScore,
    whaleConfidenceScore,
    churnRiskScore,
    distributionRiskScore,
    newHolders,
    likelyExited,
    churnRate,
    scoreBreakdown: [
      { label: "retention stability", value: 22, direction: "positive" },
      { label: "whale confidence", value: whaleConfidenceScore > 50 ? 18 : 9, direction: "positive" },
      { label: "distribution health", value: top10SupplyPercent < 40 ? 14 : 8, direction: "positive" },
      { label: "returning holder activity", value: 9, direction: "positive" },
      { label: "new holder quality", value: 7, direction: "positive" },
      { label: "churn penalty", value: -Math.round(churnRiskScore / 2), direction: "negative" }
    ]
  };
}
