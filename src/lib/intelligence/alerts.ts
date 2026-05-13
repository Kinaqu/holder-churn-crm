import type { Alert, HolderSegment, TokenSnapshot } from "@/lib/types";
import { nextBestActionsFor } from "@/lib/intelligence/actions";

export function generateAlerts(segments: HolderSegment[], current: TokenSnapshot, previous?: TokenSnapshot): Alert[] {
  const alerts: Alert[] = [];
  const createdAt = current.snapshotAt;

  for (const whale of segments.filter((item) => item.segment === "WHALE_REDUCED").slice(0, 3)) {
    alerts.push({
      id: `alert-whale-reduced-${whale.walletAddress.slice(0, 8)}`,
      type: "WHALE_REDUCED",
      severity: Math.abs(whale.changePercent) > 30 ? "high" : "medium",
      walletAddress: whale.walletAddress,
      title: "Top holder reduced position",
      message: `A tracked whale reduced its token balance by ${Math.abs(whale.changePercent).toFixed(1)}% since the last snapshot.`,
      reason: [
        `Wallet ranked #${whale.currentRank ?? whale.previousRank} in the latest Birdeye holder snapshot.`,
        `Balance decreased by ${Math.abs(whale.changePercent).toFixed(1)}%.`,
        "Transfer context is attached when Birdeye Token Transfer is available.",
        previous ? `Top 10 concentration moved from ${previous.top10SupplyPercent.toFixed(1)}% to ${current.top10SupplyPercent.toFixed(1)}%.` : "Distribution trend needs a prior snapshot."
      ],
      sourceEndpoints: ["Token Holder", "Token Transfer", "Holder Distribution"],
      confidence: 88,
      nextBestActions: nextBestActionsFor("WHALE_REDUCED"),
      createdAt,
      status: "open"
    });
  }

  if (current.churnRate >= 3) {
    alerts.push({
      id: "alert-churn-spike",
      type: "CHURN_SPIKE",
      severity: current.churnRate >= 5 ? "high" : "medium",
      title: "Holder churn is elevated",
      message: `${current.churnRate.toFixed(1)}% of previously tracked wallets likely exited or dropped below the tracked threshold.`,
      reason: [
        `${current.likelyExited} tracked wallets are missing from the current holder snapshot.`,
        "The app uses likely-exited language because top-holder snapshots are thresholded.",
        "Price movement and transfer data are used as context when available."
      ],
      sourceEndpoints: ["Token Holder", "Price Stats", "Token Transfer"],
      confidence: 81,
      nextBestActions: nextBestActionsFor("CHURN_SPIKE"),
      createdAt,
      status: "monitoring"
    });
  }

  if (current.distributionRiskScore >= 70 || current.top10SupplyPercent >= 50) {
    alerts.push({
      id: "alert-distribution-risk",
      type: "CONCENTRATION_RISK",
      severity: "high",
      title: "Distribution risk is high",
      message: `Top 10 holders control ${current.top10SupplyPercent.toFixed(1)}% of the tracked supply.`,
      reason: [
        "Holder Distribution indicates elevated top-holder concentration.",
        "High concentration can make community confidence more fragile.",
        "This is a risk context signal, not financial advice."
      ],
      sourceEndpoints: ["Holder Distribution", "Token Holder"],
      confidence: 85,
      nextBestActions: nextBestActionsFor("CONCENTRATION_RISK"),
      createdAt,
      status: "open"
    });
  }

  if (previous && current.priceChange24h > 5 && current.holderHealthScore < previous.holderHealthScore) {
    alerts.push({
      id: "alert-price-up-quality-down",
      type: "PRICE_UP_QUALITY_DOWN",
      severity: "medium",
      title: "Price up, holder quality down",
      message: "Price rose while holder health weakened, suggesting acquisition quality may be short-term.",
      reason: [
        `Price changed ${current.priceChange24h.toFixed(1)}% over 24h.`,
        `Holder Health moved from ${previous.holderHealthScore} to ${current.holderHealthScore}.`,
        "This compares Birdeye Price Stats with snapshot-derived retention metrics."
      ],
      sourceEndpoints: ["Price Stats", "Token Holder"],
      confidence: 76,
      nextBestActions: nextBestActionsFor("PRICE_UP_QUALITY_DOWN"),
      createdAt,
      status: "monitoring"
    });
  }

  return alerts;
}
