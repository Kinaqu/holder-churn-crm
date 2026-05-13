export async function GET() {
  return Response.json({
    ok: true,
    app: "Holder Churn CRM",
    mode: process.env.DEMO_MODE === "true" || !process.env.DATABASE_URL ? "demo" : "live",
    timestamp: new Date().toISOString()
  });
}
