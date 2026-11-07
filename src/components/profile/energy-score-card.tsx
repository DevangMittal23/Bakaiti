import { Zap } from "lucide-react";
import { SignalScoreChart } from "./signal-score-chart";
export function EnergyScoreCard({
  score,
  userId,
}: {
  score?: number;
  userId?: string;
}) {
  const value = Math.max(0, Math.min(1000, score ?? 0));
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-text-secondary">
          Signal Score
        </h2>
        <Zap className="h-4 w-4 text-secondary" />
      </div>
      <p className="mt-3 font-display text-4xl font-semibold tracking-tight">
        {value}
        <span className="ml-1 text-base font-medium text-text-secondary">
          / 1000
        </span>
      </p>
      <meter
        className="mt-3 h-2 w-full accent-secondary"
        min={0}
        max={1000}
        value={value}
        aria-label={`Signal score: ${value} out of 1000`}
      />
      <p className="mt-3 text-[11px] leading-5 text-text-secondary">
        Community activity over the past seven days.
      </p>
      {userId && <SignalScoreChart userId={userId} />}
    </section>
  );
}
