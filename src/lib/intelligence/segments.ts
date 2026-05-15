import type { HolderSegment, HolderSnapshot } from "@/lib/types";

const WHALE_RANK_THRESHOLD = 50;
const WHALE_SUPPLY_THRESHOLD = 1;

export function classifyHolderSegments(previous: HolderSnapshot[], current: HolderSnapshot[]): HolderSegment[] {
  const previousByWallet = new Map(previous.map((holder) => [holder.walletAddress, holder]));
  const currentByWallet = new Map(current.map((holder) => [holder.walletAddress, holder]));
  const detectedAt = current[0]?.snapshotAt ?? new Date().toISOString();
  const segments: HolderSegment[] = [];

  for (const currentHolder of current) {
    const previousHolder = previousByWallet.get(currentHolder.walletAddress);
    if (!previousHolder) {
      segments.push({
        walletAddress: currentHolder.walletAddress,
        segment: "NEW_HOLDER",
        previousBalance: 0,
        currentBalance: currentHolder.balance,
        changePercent: 100,
        currentRank: currentHolder.holderRank,
        currentSupplyPercent: currentHolder.supplyPercent,
        detectedAt,
        explanation: ["Wallet appears in the current Birdeye holder snapshot but not the previous tracked snapshot."],
        sourceEndpoints: ["Token Holder"]
      });
      continue;
    }

    const changePercent = percentageChange(previousHolder.balance, currentHolder.balance);
    const isWhale =
      currentHolder.holderRank <= WHALE_RANK_THRESHOLD ||
      previousHolder.holderRank <= WHALE_RANK_THRESHOLD ||
      (currentHolder.supplyPercent ?? 0) >= WHALE_SUPPLY_THRESHOLD ||
      (previousHolder.supplyPercent ?? 0) >= WHALE_SUPPLY_THRESHOLD;

    if (isWhale && changePercent <= -10) {
      segments.push(segment("WHALE_REDUCED", previousHolder, currentHolder, changePercent, [
        `Wallet is rank #${currentHolder.holderRank} in the current Birdeye holder snapshot.`,
        `Balance decreased by ${Math.abs(changePercent).toFixed(1)}% since the prior snapshot.`
      ]));
    } else if (isWhale && changePercent >= 10) {
      segments.push(segment("WHALE_ACCUMULATED", previousHolder, currentHolder, changePercent, [
        `Wallet is rank #${currentHolder.holderRank} in the current Birdeye holder snapshot.`,
        `Balance increased by ${changePercent.toFixed(1)}% since the prior snapshot.`
      ]));
    } else if (changePercent <= -20) {
      segments.push(segment("REDUCED_POSITION", previousHolder, currentHolder, changePercent, [
        `Balance decreased by ${Math.abs(changePercent).toFixed(1)}% while the wallet remains in the tracked holder set.`
      ]));
    } else if (changePercent >= 20) {
      segments.push(segment("INCREASED_POSITION", previousHolder, currentHolder, changePercent, [
        `Balance increased by ${changePercent.toFixed(1)}% while the wallet remains in the tracked holder set.`
      ]));
    } else {
      segments.push(segment("DORMANT_HOLDER", previousHolder, currentHolder, changePercent, [
        "Wallet remained inside the tracked holder set with no meaningful balance change."
      ]));
    }
  }

  for (const previousHolder of previous) {
    if (!currentByWallet.has(previousHolder.walletAddress)) {
      segments.push({
        walletAddress: previousHolder.walletAddress,
        segment: previousHolder.balanceUsd < 10_000 ? "RETAIL_CHURN" : "LIKELY_EXITED",
        previousBalance: previousHolder.balance,
        currentBalance: 0,
        changePercent: -100,
        previousRank: previousHolder.holderRank,
        previousSupplyPercent: previousHolder.supplyPercent,
        detectedAt,
        explanation: ["Wallet is missing from the current tracked holder list. It likely exited or dropped below the tracked threshold."],
        sourceEndpoints: ["Token Holder"]
      });
    }
  }

  return segments.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
}

function segment(
  segmentType: HolderSegment["segment"],
  previousHolder: HolderSnapshot,
  currentHolder: HolderSnapshot,
  changePercent: number,
  explanation: string[]
): HolderSegment {
  return {
    walletAddress: currentHolder.walletAddress,
    segment: segmentType,
    previousBalance: previousHolder.balance,
    currentBalance: currentHolder.balance,
    changePercent,
    previousRank: previousHolder.holderRank,
    currentRank: currentHolder.holderRank,
    previousSupplyPercent: previousHolder.supplyPercent,
    currentSupplyPercent: currentHolder.supplyPercent,
    detectedAt: currentHolder.snapshotAt,
    explanation,
    sourceEndpoints: ["Token Holder"]
  };
}

function percentageChange(previous: number, current: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}
