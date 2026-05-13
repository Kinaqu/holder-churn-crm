"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TokenSnapshot } from "@/lib/types";

export function HolderTrendChart({ snapshots }: { snapshots: TokenSnapshot[] }) {
  return <ChartShell snapshots={snapshots} title="Holder count over time" field="holderCount" color="#41d7c8" />;
}

export function ChurnChart({ snapshots }: { snapshots: TokenSnapshot[] }) {
  return <ChartShell snapshots={snapshots} title="Churn rate over time" field="churnRate" color="#ff6b7a" suffix="%" />;
}

export function WhaleConfidenceChart({ snapshots }: { snapshots: TokenSnapshot[] }) {
  return <ChartShell snapshots={snapshots} title="Whale confidence" field="whaleConfidenceScore" color="#71f0a3" />;
}

export function DistributionChart({ snapshots }: { snapshots: TokenSnapshot[] }) {
  const data = snapshots.map(mapSnapshot);
  return (
    <ChartCard title="Top holder concentration">
      <ResponsiveContainer width="100%" height={230}>
        <BarChart data={data}>
          <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ background: "#0c1118", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8 }} />
          <Bar dataKey="top10SupplyPercent" fill="#f6c85f" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function HealthVsPriceChart({ snapshots }: { snapshots: TokenSnapshot[] }) {
  const data = snapshots.map(mapSnapshot);
  return (
    <ChartCard title="Holder Health vs Price Movement">
      <ResponsiveContainer width="100%" height={230}>
        <ComposedChart data={data}>
          <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ background: "#0c1118", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8 }} />
          <Area type="monotone" dataKey="holderHealthScore" fill="rgba(65,215,200,.16)" stroke="#41d7c8" />
          <Line type="monotone" dataKey="priceChange24h" stroke="#7ab7ff" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function ChartShell({ snapshots, title, field, color, suffix = "" }: { snapshots: TokenSnapshot[]; title: string; field: keyof TokenSnapshot; color: string; suffix?: string }) {
  const data = snapshots.map(mapSnapshot);
  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data}>
          <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} tickLine={false} axisLine={false} />
          <Tooltip formatter={(value) => [`${value}${suffix}`, title]} contentStyle={{ background: "#0c1118", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8 }} />
          <Area type="monotone" dataKey={String(field)} stroke={color} fill={color} fillOpacity={0.14} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel rounded-lg p-5">
      <h3 className="text-sm font-medium text-white">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function mapSnapshot(snapshot: TokenSnapshot) {
  return {
    ...snapshot,
    label: new Date(snapshot.snapshotAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  };
}
