export default function SettingsPage() {
  const envs = [
    "BIRDEYE_API_KEY",
    "BIRDEYE_PACKAGE",
    "DATABASE_URL",
    "CRON_SECRET",
    "NEXT_PUBLIC_APP_URL",
    "DEMO_MODE",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "BIRDEYE_ACCOUNT_RPS",
    "BIRDEYE_ACCOUNT_RPM",
    "BIRDEYE_WALLET_RPS",
    "BIRDEYE_WALLET_RPM"
  ];
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <section className="panel rounded-lg p-6">
        <p className="text-sm uppercase tracking-[0.22em] text-signal-cyan">Configuration</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">MVP settings</h1>
        <p className="mt-3 text-slate-400">The app works immediately in deterministic demo mode. Live snapshots require server-side Birdeye credentials.</p>
        <div className="mt-6 grid gap-3">
          {envs.map((env) => (
            <div key={env} className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.04] px-4 py-3">
              <span className="font-mono text-sm text-slate-200">{env}</span>
              <span className="text-xs text-slate-500">{env.startsWith("NEXT_PUBLIC") ? "client-visible" : "server-only"}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
