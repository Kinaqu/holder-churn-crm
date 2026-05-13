import { getDemoDataset } from "../src/lib/demo/demo-data";

const dataset = getDemoDataset();

console.log("Holder Churn CRM demo fixture");
console.log({
  token: dataset.token.symbol,
  holders: dataset.holders.length,
  segments: dataset.segments.length,
  alerts: dataset.alerts.length,
  pipelineStatus: dataset.pipelineRun.status,
  apiCalls: dataset.pipelineRun.apiCallsUsed
});
