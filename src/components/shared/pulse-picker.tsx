"use client";

import { useRef, useState } from "react";
import { Radio, Check, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PULSE_CONFIG, type PulseType } from "@/types";
import { cn } from "@/lib/utils";

type PulsePickerProps = {
  isOpen: boolean;
  onClose: () => void;
  currentPulse: PulseType | null;
  onSetPulse: (type: PulseType) => void | Promise<void>;
  onClearPulse: () => void | Promise<void>;
};
export function PulsePicker({
  isOpen,
  onClose,
  currentPulse,
  onSetPulse,
  onClearPulse,
}: PulsePickerProps) {
  const [pending, setPending] = useState<PulseType | "clear" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  const choosePulse = async (type: PulseType | "clear") => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(type);
    setError(null);
    try {
      if (type === "clear") await onClearPulse();
      else await onSetPulse(type);
      onClose();
    } catch {
      setError("Your Pulse could not be updated. Please try again.");
    } finally {
      inFlight.current = false;
      setPending(null);
    }
  };
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <DialogContent
        onOpenAutoFocus={() => {
          returnFocus.current =
            document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null;
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (returnFocus.current?.isConnected) returnFocus.current.focus();
          else {
            const trigger = Array.from(
              document.querySelectorAll<HTMLButtonElement>(
                '[aria-label="Set your Pulse"], [aria-label="Open your account menu"]',
              ),
            ).find((element) => element.getClientRects().length > 0);
            trigger?.focus();
          }
        }}
        className="max-w-sm rounded-2xl border-border bg-surface p-6"
      >
        <span className="mb-1 flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
          <Radio className="h-5 w-5" />
        </span>
        <DialogTitle className="font-display text-2xl tracking-tight">
          What&apos;s your frequency?
        </DialogTitle>
        <DialogDescription className="text-sm leading-relaxed text-text-secondary">
          Give your circle a little context. Your Pulse clears after 4 hours.
        </DialogDescription>
        <div className="mt-2 space-y-2" aria-busy={pending !== null}>
          {(Object.keys(PULSE_CONFIG) as PulseType[]).map((type) => (
            <button
              type="button"
              key={type}
              disabled={pending !== null}
              onClick={() => {
                void choosePulse(type);
              }}
              aria-pressed={currentPulse === type}
              className={cn(
                "flex min-h-14 w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors disabled:opacity-50",
                currentPulse === type
                  ? "border-accent bg-accent/10"
                  : "border-border hover:border-outline-variant hover:bg-surface-container",
              )}
            >
              <span className="text-lg" aria-hidden="true">
                {PULSE_CONFIG[type].emoji}
              </span>
              <span className="flex-1 text-sm font-semibold">
                {PULSE_CONFIG[type].label}
              </span>
              {pending === type ? (
                <Loader2
                  className="h-4 w-4 animate-spin"
                  aria-label="Updating Pulse"
                />
              ) : currentPulse === type ? (
                <Check className="h-4 w-4 text-accent" />
              ) : null}
            </button>
          ))}
        </div>
        <div className="min-h-5 text-xs text-error" aria-live="polite">
          {error && <p role="alert">{error}</p>}
        </div>
        {currentPulse && (
          <Button
            variant="outline"
            disabled={pending !== null}
            onClick={() => {
              void choosePulse("clear");
            }}
          >
            {pending === "clear" ? "Clearing…" : "Clear my Pulse"}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
