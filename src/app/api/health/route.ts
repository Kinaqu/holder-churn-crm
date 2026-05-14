import { okResponse } from "@/lib/api-response";

export async function GET() {
  return okResponse({
    app: "Holder Churn CRM",
    mode: process.env.DEMO_MODE === "true" || !process.env.DATABASE_URL ? "demo" : "live",
    timestamp: new Date().toISOString()
  });
}
