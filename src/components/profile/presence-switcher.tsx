"use client";
import { useState } from "react";
import { Zap } from "lucide-react";
import { usePulse } from "@/hooks/use-pulse";
import { PULSE_CONFIG, type PulseType } from "@/types";
import { PulsePicker } from "@/components/shared/pulse-picker";
export function PresenceSwitcher({
  initialPulse,
  isOwnProfile,
  userId,
}: {
  initialPulse?: string | null;
  isOwnProfile: boolean;
  userId: string;
}) {
  const { pulseType, loading, updatePulse, removePulse } = usePulse(userId);
  const [open, setOpen] = useState(false);
  const pulse = loading ? initialPulse : pulseType;
  const current =
    pulse && Object.hasOwn(PULSE_CONFIG, pulse)
      ? PULSE_CONFIG[pulse as PulseType]
      : null;
  return (
    <section className="flex flex-col rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-text-secondary">
          Current Pulse
        </h2>
        <Zap className="h-4 w-4 text-accent" />
      </div>
      <p className="mt-4 font-display text-2xl font-semibold">
        {current ? `${current.emoji} ${current.label}` : "Off the radar"}
      </p>
      <p className="mb-3 mt-2 text-[11px] leading-5 text-text-secondary">
        {current
          ? "A little snapshot of right now. Pulses last four hours."
          : "No active Pulse. A little mystery is allowed."}
      </p>
      {isOwnProfile && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-auto min-h-11 self-start text-xs font-semibold text-accent hover:underline"
        >
          Set your Pulse
        </button>
      )}
      <PulsePicker
        isOpen={open}
        onClose={() => setOpen(false)}
        currentPulse={pulseType}
        onSetPulse={updatePulse}
        onClearPulse={removePulse}
      />
    </section>
  );
}
