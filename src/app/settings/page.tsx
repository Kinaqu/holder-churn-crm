import { Clock, Database, KeyRound, RadioTower, ShieldCheck, SlidersHorizontal } from "lucide-react";

const settingsGroups = [
  {
    title: "Birdeye connection",
    description: "Server-side credentials used for token snapshots.",
    icon: KeyRound,
    items: [
      { name: "BIRDEYE_API_KEY", scope: "server-only", required: true },
      { name: "BIRDEYE_PACKAGE", scope: "server-only", required: false }
    ]
  },
  {
    title: "Storage",
    description: "Token scans and snapshot history are persisted here.",
    icon: Database,
    items: [{ name: "DATABASE_URL", scope: "server-only", required: true }]
  },
  {
    title: "Automation",
    description: "Optional scheduled snapshots and application URL.",
    icon: Clock,
    items: [
      { name: "CRON_SECRET", scope: "server-only", required: false },
      { name: "NEXT_PUBLIC_APP_URL", scope: "client-visible", required: false }
    ]
  },
  {
    title: "Rate limits",
    description: "Conservative defaults keep snapshot runs within API budget.",
    icon: SlidersHorizontal,
    items: [
      { name: "BIRDEYE_ACCOUNT_RPS", scope: "server-only", required: false },
      { name: "BIRDEYE_ACCOUNT_RPM", scope: "server-only", required: false },
      { name: "BIRDEYE_WALLET_RPS", scope: "server-only", required: false },
      { name: "BIRDEYE_WALLET_RPM", scope: "server-only", required: false }
    ]
  },
  {
    title: "Redis rate limiter",
    description: "Optional shared rate-limit coordination for deployments.",
    icon: RadioTower,
    items: [
      { name: "UPSTASH_REDIS_REST_URL", scope: "server-only", required: false },
      { name: "UPSTASH_REDIS_REST_TOKEN", scope: "server-only", required: false }
    ]
  }
];

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-signal-cyan/25 bg-signal-cyan/10 px-3 py-1 text-xs font-medium text-signal-cyan">
            <ShieldCheck className="h-3.5 w-3.5" />
            Solana-only configuration
          </div>
          <h1 className="mt-4 text-3xl font-semibold text-white">Settings</h1>
          <p className="mt-2 max-w-2xl text-slate-400">
            Runtime readiness for Solana token scanning, snapshots, persistence, and rate limits.
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {settingsGroups.map(({ title, description, icon: Icon, items }) => (
          <section key={title} className="panel rounded-lg p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-md border border-signal-cyan/25 bg-signal-cyan/10 p-2 text-signal-cyan">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-semibold text-white">{title}</h2>
                <p className="mt-1 text-sm text-slate-400">{description}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {items.map((item) => {
                const configured = Boolean(process.env[item.name]);
                return <SettingRow key={item.name} configured={configured} {...item} />;
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function SettingRow({ name, scope, required, configured }: { name: string; scope: string; required: boolean; configured: boolean }) {
  return (
    <div className="flex flex-col justify-between gap-3 rounded-md border border-white/10 bg-white/[0.035] px-4 py-3 sm:flex-row sm:items-center">
      <div>
        <p className="font-mono text-sm text-slate-200">{name}</p>
        <p className="mt-1 text-xs text-slate-500">{scope}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-slate-400">{required ? "required" : "optional"}</span>
        <span className={configured ? "rounded border border-signal-green/30 bg-signal-green/10 px-2 py-1 text-xs text-signal-green" : "rounded border border-signal-amber/30 bg-signal-amber/10 px-2 py-1 text-xs text-signal-amber"}>
          {configured ? "configured" : "missing"}
        </span>
      </div>
    </div>
  );
}
