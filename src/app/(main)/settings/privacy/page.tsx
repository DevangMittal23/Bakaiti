import Link from "next/link";
import {
  ArrowLeft,
  Shield,
  Lock,
  Eye,
  MessageCircle,
  ArrowUpRight,
} from "lucide-react";
export const metadata = {
  title: "Privacy & security",
  description: "Understand your privacy and account controls on Bakaiti.",
};
export default function PrivacyPage() {
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
          Your space, your say
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Privacy & security<span className="text-accent">.</span>
        </h1>
      </header>
      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex gap-3">
          <Shield className="mt-1 h-6 w-6 shrink-0 text-accent" />
          <div>
            <h2 className="text-sm font-semibold">Choose who sees each post</h2>
            <p className="mt-2 text-xs leading-6 text-text-secondary">
              When sharing a post, choose Everyone, Friends, or Only me. That
              choice controls who can read the post.
            </p>
            <Link
              href="/feed"
              className="mt-3 inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-accent"
            >
              Go to the feed
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>
      <section className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">More control is on the way</h2>
          <p className="mt-2 text-xs leading-5 text-text-secondary">
            These preferences are not available yet. We won’t show a saved
            switch until your choice actually takes effect.
          </p>
        </div>
        {[
          {
            icon: Eye,
            title: "Online visibility",
            text: "Choose who can see when you’re around.",
          },
          {
            icon: MessageCircle,
            title: "Direct-message permissions",
            text: "Choose who can start a conversation with you.",
          },
          {
            icon: Lock,
            title: "Read receipts & private profiles",
            text: "Control read indicators and profile access.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="flex gap-3 border-b border-border px-5 py-4 last:border-b-0"
          >
            <item.icon className="mt-1 h-4 w-4 shrink-0 text-text-secondary" />
            <div className="min-w-0 flex-1">
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
      </section>
      <Link
        href="/forgot-password"
        className="flex min-h-14 items-center justify-between rounded-xl border border-border px-5 text-sm font-semibold hover:border-accent/40"
      >
        Request a password reset
        <ArrowUpRight className="h-4 w-4 text-accent" />
      </Link>
    </div>
  );
}
