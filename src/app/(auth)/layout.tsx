import type { Metadata } from "next";
import Link from "next/link";
import {
  MessageCircle,
  ArrowUpRight,
  MoveUpRight,
  Sparkles,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Welcome to Bakaiti",
  description:
    "Your people. Your frequency. Join Bakaiti and let the conversation happen.",
};
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[minmax(0,1.08fr)_minmax(440px,1fr)]">
      <aside className="sticky top-0 hidden h-dvh min-h-[640px] flex-col justify-between overflow-hidden border-r border-border bg-surface-lowest p-10 lg:flex xl:p-14">
        <Link
          href="/login"
          className="flex w-fit items-center gap-3"
          aria-label="Bakaiti home"
        >
          <span className="flex h-10 w-10 -rotate-6 items-center justify-center rounded-xl bg-secondary text-on-secondary">
            <MessageCircle className="h-6 w-6" strokeWidth={2.5} />
          </span>
          <span className="font-display text-3xl font-bold tracking-[-0.06em]">
            bakaiti<span className="text-secondary">.</span>
          </span>
        </Link>
        <div className="relative my-12 max-w-xl">
          <span className="mb-7 inline-flex -rotate-3 items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-[10px] font-bold tracking-[0.1em] text-on-secondary">
            <Sparkles className="h-3.5 w-3.5" />
            YOUR KIND OF CHAOS
          </span>
          <h1 className="font-display text-[clamp(58px,6.4vw,96px)] font-semibold leading-[0.98] tracking-[-0.065em]">
            Your people.
            <br />
            <span className="text-accent">
              Your
              <br />
              frequency.
            </span>
          </h1>
          <p className="mt-7 max-w-[340px] text-base leading-relaxed text-text-secondary">
            For the group chat. The little life updates. And the conversations
            that go nowhere, together.
          </p>
          <MoveUpRight
            className="absolute -right-2 bottom-3 h-20 w-20 text-accent/35 xl:right-3"
            strokeWidth={1}
            aria-hidden="true"
          />
        </div>
        <div className="flex items-end justify-between gap-6 border-t border-border pt-6">
          <p className="max-w-[220px] text-xs leading-relaxed text-text-secondary">
            Less performing.
            <br />
            <span className="text-text-primary">More being yourself.</span>
          </p>
          <span
            className="font-display text-4xl text-secondary"
            aria-hidden="true"
          >
            ✳
          </span>
        </div>
      </aside>
      <main className="flex min-w-0 flex-col items-center justify-center px-5 py-9 sm:px-10 lg:py-12">
        <div className="mb-10 flex w-full max-w-[420px] items-center justify-between lg:hidden">
          <Link
            href="/login"
            aria-label="Bakaiti home"
            className="flex items-center gap-2"
          >
            <span className="flex h-8 w-8 -rotate-6 items-center justify-center rounded-lg bg-secondary text-on-secondary">
              <MessageCircle className="h-4.5 w-4.5" strokeWidth={2.5} />
            </span>
            <span className="font-display text-2xl font-bold tracking-[-0.06em]">
              bakaiti<span className="text-secondary">.</span>
            </span>
          </Link>
          <span className="flex items-center gap-1 text-[10px] font-semibold text-text-secondary">
            Your kind of chaos <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </div>
        <div className="w-full max-w-[420px]">{children}</div>
        <p className="mt-9 w-full max-w-[420px] border-t border-border pt-5 text-center text-[11px] text-text-secondary">
          A little chaos. A lot of connection.
        </p>
      </main>
    </div>
  );
}
