import { okResponse } from "@/lib/api-response";

export async function GET() {
  return okResponse({
    app: "Holder Churn CRM",
    mode: "live",
    storage: process.env.DATABASE_URL ? "configured" : "missing",
    timestamp: new Date().toISOString()
  });
}
