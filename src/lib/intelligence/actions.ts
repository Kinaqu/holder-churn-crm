import type { Alert } from "@/lib/types";

export function nextBestActionsFor(type: string): Alert["nextBestActions"] {
  switch (type) {
    case "WHALE_REDUCED":
      return [
        "Review wallet detail and recent transfer context.",
        "Monitor the next snapshot before public communication.",
        "Prepare an internal risk note if another top holder reduces."
      ];
    case "WHALE_ACCUMULATED":
      return [
        "Check whether accumulation overlaps with loyal holder cohorts.",
        "Monitor whether the position remains stable after 24h.",
        "Use the signal carefully as holder confidence context, not price guidance."
      ];
    case "CHURN_SPIKE":
      return [
        "Check campaign or announcement timeline against churn.",
        "Compare churn against price movement.",
        "Create a retention campaign for recent holders."
      ];
    case "CONCENTRATION_RISK":
      return [
        "Monitor top 10 holder behavior in the next snapshot.",
        "Avoid overclaiming decentralization until concentration normalizes.",
        "Create an internal distribution risk note for the team."
      ];
    case "PRICE_UP_QUALITY_DOWN":
      return [
        "Check whether recent acquisition came from short-term flippers.",
        "Compare new holders against retained holders.",
        "Shift campaign reporting from impressions to retained wallets."
      ];
    default:
      return [
        "Review the source-backed explanation.",
        "Monitor the next snapshot.",
        "Record a team note if the same signal repeats."
      ];
  }
}
