export type Severity = "low" | "medium" | "high" | "critical";

export type SegmentType =
  | "BASELINE_HOLDER"
  | "NEW_HOLDER"
  | "LIKELY_EXITED"
  | "REDUCED_POSITION"
  | "INCREASED_POSITION"
  | "WHALE_REDUCED"
  | "WHALE_ACCUMULATED"
  | "LOYAL_HOLDER"
  | "RETURNING_HOLDER"
  | "DORMANT_HOLDER"
  | "RETAIL_CHURN"
  | "SILENT_ACCUMULATION"
  | "CONCENTRATION_SHOCK";

export type BirdeyeSource =
  | "Token Holder"
  | "Holder Distribution"
  | "Price Stats"
  | "Token Overview"
  | "Token Metadata"
  | "Token Security"
  | "Token Transfer"
  | "Wallet Current Net Worth"
  | "Wallet Net Worth"
  | "Wallet Balance Change"
  | "Holder Profile"
  | "Holder Positions";

export type HolderSnapshot = {
  id?: string;
  sourceRunId?: string;
  walletAddress: string;
  tokenAccountAddress?: string;
  addressType?: "wallet" | "token_account" | "unknown";
  balance: number;
  balanceUsd: number;
  supplyPercent?: number;
  holderRank: number;
  snapshotAt: string;
  sourceEndpoint: BirdeyeSource;
};

export type HolderSegment = {
  walletAddress: string;
  segment: SegmentType;
  previousBalance: number;
  currentBalance: number;
  changePercent: number;
  previousRank?: number;
  currentRank?: number;
  previousSupplyPercent?: number;
  currentSupplyPercent?: number;
  detectedAt: string;
  explanation: string[];
  sourceEndpoints: BirdeyeSource[];
};

export type ScoreBreakdown = {
  label: string;
  value: number;
  direction: "positive" | "negative" | "neutral";
};

export type Alert = {
  id: string;
  type: string;
  severity: Severity;
  walletAddress?: string;
  title: string;
  message: string;
  reason: string[];
  sourceEndpoints: BirdeyeSource[];
  confidence: number;
  nextBestActions: string[];
  createdAt: string;
  status: "open" | "monitoring" | "resolved";
};

export type PipelineSourceStatus = {
  source: BirdeyeSource;
  status: "complete" | "missing" | "partial" | "skipped";
  detail: string;
  calls: number;
};

export type PipelineRun = {
  id: string;
  status: "complete" | "partial" | "failed" | "running";
  mode: "live";
  apiCallsUsed: number;
  apiSafeBudget: number;
  holdersScanned: number;
  walletsEnriched: number;
  cacheHits: number;
  cacheMisses: number;
  durationMs: number;
  rateLimitBudgetUsed: number;
  stayedUnderLimit: boolean;
  startedAt: string;
  completedAt?: string;
  sources: PipelineSourceStatus[];
};

export type TokenSnapshot = {
  id?: string;
  sourceRunId?: string;
  snapshotAt: string;
  priceUsd: number;
  priceChange24h: number;
  holderCount?: number;
  trackedHolderCount?: number;
  top10SupplyPercent?: number;
  top50SupplyPercent?: number;
  concentrationScore: number;
  holderHealthScore: number;
  whaleConfidenceScore: number;
  churnRiskScore: number;
  distributionRiskScore: number;
  newHolders: number;
  likelyExited: number;
  churnRate: number;
  scoreBreakdown: ScoreBreakdown[];
};

export type CampaignMarker = {
  id: string;
  tokenId: string;
  name: string;
  description: string;
  startedAt: string;
  endedAt?: string;
  createdAt: string;
  mode: "live";
  newHolders?: number;
  retained24h?: number;
  retained7d?: number;
  likelyExited?: number;
  whaleEntries?: number;
  holderQualityChange?: number;
  impactScore?: number;
  status?: "complete" | "needs_more_snapshots" | "preview";
};

export type CampaignImpactMetrics = {
  newHolders: number;
  likelyExited: number;
  retainedHolders: number;
  retained24h?: number;
  retained7d?: number;
  whaleEntries: number;
  whaleReduced: number;
  holderQualityChange: number;
  campaignImpactScore?: number;
};

export type CampaignImpact = {
  campaign: CampaignMarker;
  status: "complete" | "needs_more_snapshots" | "preview";
  metrics: CampaignImpactMetrics;
  missingRequirements: string[];
  sourceSnapshotIds: string[];
};

export type Token = {
  id: string;
  projectId?: string;
  chain: string;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  securityStatus: "clear" | "caution" | "unknown";
  lastSnapshotAt: string;
  createdAt?: string;
  updatedAt?: string;
};

export type TokenDataset = {
  token: Token;
  snapshots: TokenSnapshot[];
  holders: HolderSnapshot[];
  previousHolders: HolderSnapshot[];
  segments: HolderSegment[];
  alerts: Alert[];
  campaigns: CampaignImpact[];
  pipelineRun: PipelineRun;
  pipelineRuns?: PipelineRun[];
  apiCallLogs?: ApiCallLog[];
};

export type ApiCallLog = {
  id?: string;
  runId: string;
  endpoint: BirdeyeSource | string;
  tokenId?: string;
  walletAddress?: string;
  statusCode?: number;
  cacheHit: boolean;
  durationMs: number;
  errorMessage?: string;
  createdAt: string;
};
