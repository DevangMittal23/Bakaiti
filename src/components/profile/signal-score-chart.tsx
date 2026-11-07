"use client";
import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  YAxis,
  XAxis,
  Tooltip,
} from "recharts";
import { useReducedMotion } from "framer-motion";
import { getSignalScoreHistory } from "@/actions/signal-score";
import type { SignalScoreHistory } from "@/types";

export function SignalScoreChart({ userId }: { userId: string }) {
  const [result, setResult] = useState<{
    userId: string;
    history: SignalScoreHistory[];
    error?: boolean;
  } | null>(null);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    let current = true;
    void getSignalScoreHistory(userId, 7)
      .then((history) => {
        if (current) setResult({ userId, history: [...history].reverse() });
      })
      .catch(() => {
        if (current) setResult({ userId, history: [], error: true });
      });
    return () => {
      current = false;
    };
  }, [userId]);
  if (result?.userId !== userId)
    return (
      <p role="status" className="mt-3 text-xs text-text-secondary">
        Loading your recent Signal…
      </p>
    );
  if (result.error)
    return (
      <p className="mt-3 text-xs text-text-secondary">
        Signal history is unavailable right now.
      </p>
    );
  if (result.history.length < 2)
    return (
      <p className="mt-3 text-xs leading-5 text-text-secondary">
        Your trend appears after a few score updates.
      </p>
    );
  const points = result.history.map((row) => ({
    score: row.score,
    day: new Date(row.calculated_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));
  return (
    <div className="mt-4 border-t border-border pt-3">
      <p className="mb-3 text-xs text-text-secondary">Recent Signal</p>
      <div
        role="img"
        aria-label={`Recent recorded Signal scores: ${points.map((point) => `${point.day}, ${point.score}`).join("; ")}`}
      >
        <ResponsiveContainer width="100%" height={100}>
          <LineChart data={points} accessibilityLayer>
            <YAxis domain={[0, 1000]} hide />
            <XAxis
              dataKey="day"
              tick={{ fill: "var(--text-secondary)", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              minTickGap={20}
            />
            <Tooltip
              contentStyle={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                borderRadius: 12,
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="var(--color-secondary)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={!reducedMotion}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
