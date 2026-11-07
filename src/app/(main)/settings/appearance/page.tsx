"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Palette } from "lucide-react";
import {
  APPEARANCE_THEMES,
  APPEARANCE_ACCENTS,
  readAppearance,
  applyAppearance,
} from "@/lib/appearance";
export default function AppearancePage() {
  const [settings, setSettings] = useState({
    theme: "sleek",
    accent: "purple",
    glass: true,
  });
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const current = readAppearance();
    queueMicrotask(() => setSettings(current));
  }, []);
  const save = (next: typeof settings) => {
    try {
      applyAppearance(next);
      setSettings(next);
      setStatus("Saved on this browser.");
      setError(null);
    } catch {
      setError(
        "Your preference could not be saved on this browser. Try again.",
      );
    }
  };
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/settings"
        className="inline-flex min-h-11 items-center gap-2 text-xs text-text-secondary hover:text-accent"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to settings
      </Link>
      <header>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-secondary">
          Make yourself at home
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Your kind of dark<span className="text-accent">.</span>
        </h1>
        <p className="mt-3 text-sm leading-6 text-text-secondary">
          A little change of atmosphere. Appearance choices stay on this
          browser.
        </p>
      </header>
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <Palette className="h-4 w-4 text-accent" />
          Choose a mood
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {APPEARANCE_THEMES.map((theme) => (
            <button
              key={theme.id}
              type="button"
              aria-pressed={settings.theme === theme.id}
              onClick={() => save({ ...settings, theme: theme.id })}
              className={`relative rounded-xl border p-4 text-left transition-colors ${settings.theme === theme.id ? "border-accent bg-accent/10" : "border-border hover:bg-surface-container"}`}
            >
              <span className="font-display text-lg font-semibold">
                {theme.name}
              </span>
              <span className="mt-2 block text-[10px] text-text-secondary">
                {theme.id === "sleek"
                  ? "The original clubhouse"
                  : theme.id === "amethyst"
                    ? "A violet afterglow"
                    : theme.id === "midnight"
                      ? "Deep blue hours"
                      : "Lights all the way down"}
              </span>
              {settings.theme === theme.id && (
                <Check className="absolute right-3 top-4 h-4 w-4 text-accent" />
              )}
            </button>
          ))}
        </div>
      </section>
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-4 text-sm font-semibold">Pick your accent</h2>
        <div className="flex flex-wrap gap-2">
          {APPEARANCE_ACCENTS.map((accent) => (
            <button
              key={accent.id}
              type="button"
              aria-pressed={settings.accent === accent.id}
              onClick={() => save({ ...settings, accent: accent.id })}
              className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-xs font-semibold ${settings.accent === accent.id ? "border-accent bg-accent/10 text-accent" : "border-border text-text-secondary hover:text-text-primary"}`}
            >
              {settings.accent === accent.id && (
                <Check className="h-3.5 w-3.5" />
              )}
              {accent.name}
            </button>
          ))}
        </div>
      </section>
      <section className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-5">
        <div>
          <h2 className="text-sm font-semibold">Glass effects</h2>
          <p className="mt-2 text-xs leading-5 text-text-secondary">
            A touch of depth in your navigation.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.glass}
          aria-label="Glass effects"
          onClick={() => save({ ...settings, glass: !settings.glass })}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${settings.glass ? "bg-accent" : "bg-surface-container-highest"}`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-background transition-transform ${settings.glass ? "translate-x-6" : "translate-x-1"}`}
          />
        </button>
      </section>
      <p
        role={error ? "alert" : "status"}
        className={`min-h-6 text-xs ${error ? "text-error" : "text-text-secondary"}`}
      >
        {error || status}
      </p>
    </div>
  );
}
