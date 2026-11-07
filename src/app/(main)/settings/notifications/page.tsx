import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Bell,
  BellRing,
  Smartphone,
} from "lucide-react";
export const metadata = {
  title: "Notification preferences",
  description: "Manage how you hear from your Bakaiti circle.",
};
export default function NotificationSettingsPage() {
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
          Stay in the loop
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Your notifications<span className="text-accent">.</span>
        </h1>
        <p className="mt-3 text-sm leading-6 text-text-secondary">
          A heads-up for the things happening in your circle.
        </p>
      </header>
      <section className="rounded-2xl border border-border bg-surface p-5">
        <Bell className="mb-4 h-7 w-7 text-accent" />
        <h2 className="font-display text-xl font-semibold">
          Your activity, in one place.
        </h2>
        <p className="mt-2 text-xs leading-6 text-text-secondary">
          Friend requests and community interactions appear in Activity. Open an
          update or mark it as read to keep your inbox tidy.
        </p>
        <Link
          href="/notifications"
          className="mt-4 inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-accent"
        >
          Open activity
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </section>
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold">More ways to make it yours</h2>
        <p className="mt-2 text-xs leading-6 text-text-secondary">
          Category preferences and notification muting are not available yet.
          Current notifications are unchanged.
        </p>
        <div className="mt-5 space-y-4">
          {[
            {
              icon: BellRing,
              title: "Category controls",
              text: "Pick the updates you want to hear about.",
            },
            {
              icon: Smartphone,
              title: "Push notifications & quiet hours",
              text: "More control over when and where we reach you.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="flex gap-3 border-t border-border pt-4"
            >
              <item.icon className="mt-1 h-4 w-4 shrink-0 text-text-secondary" />
              <div className="flex-1">
                <h3 className="text-xs font-semibold">{item.title}</h3>
                <p className="mt-1 text-xs leading-5 text-text-secondary">
                  {item.text}
                </p>
              </div>
              <span className="self-start rounded-md bg-background px-2 py-1 text-[10px] text-text-secondary">
                Coming soon
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
