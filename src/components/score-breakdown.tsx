import type { ScoreBreakdown as ScoreBreakdownType } from "@/lib/types";

export function ScoreBreakdown({ score, items }: { score: number; items: ScoreBreakdownType[] }) {
  return (
    <section className="panel rounded-lg p-5">
      <p className="text-xs uppercase tracking-[0.22em] text-signal-cyan">Holder Health Score</p>
      <div className="mt-3 flex items-end gap-3">
        <span className="text-5xl font-semibold text-white">{score}</span>
        <span className="pb-2 text-sm text-slate-400">transparent heuristic score</span>
      </div>
      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3">
            <span className="text-sm capitalize text-slate-300">{item.label}</span>
            <span className={item.direction === "negative" ? "text-signal-rose" : "text-signal-green"}>
              {item.value > 0 ? "+" : ""}
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
