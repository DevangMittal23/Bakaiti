import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Sparkles, Users, Zap } from "lucide-react";
import { getSuggestedUsers } from "@/actions/friendships";
import { getTopSignalUsers } from "@/actions/signal-score";
import { getTrendingPosts } from "@/actions/posts";
import { DiscoverSearch } from "@/components/discover/discover-search";
import { PeopleGrid } from "@/components/friends/people-grid";
import { PostCard } from "@/components/feed/post-card";
import { UserAvatar } from "@/components/shared/user-avatar";
import type { Post } from "@/types";
export const metadata: Metadata = {
  title: "Explore",
  description:
    "Find your people and discover what the Bakaiti community is sharing.",
};
export default async function DiscoverPage() {
  const [suggested, top, trending] = await Promise.all([
    getSuggestedUsers(),
    getTopSignalUsers(6),
    getTrendingPosts(),
  ]);
  return (
    <div className="space-y-8">
      <header className="max-w-2xl">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-secondary">
          Curiosity looks good on you
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Find your frequency<span className="text-accent">.</span>
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-6 text-text-secondary">
          A new face. A shared obsession. Your next favourite conversation.
        </p>
      </header>
      <DiscoverSearch />
      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-8">
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">
                People you might click with
              </h2>
              <Users className="h-5 w-5 text-accent" />
            </div>
            <PeopleGrid people={suggested} />
          </section>
          <section>
            <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
              <h2 className="font-display text-xl font-semibold">
                Community favourites
              </h2>
              <Sparkles className="h-5 w-5 text-secondary" />
            </div>
            <div className="space-y-5">
              {trending?.length ? (
                (trending as Post[]).map((post) => (
                  <PostCard key={post.id} post={post} />
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border p-10 text-center">
                  <h3 className="font-display text-xl font-semibold">
                    The next good thing could be yours.
                  </h3>
                  <p className="mt-2 text-sm text-text-secondary">
                    Share something with the community and get the conversation
                    going.
                  </p>
                  <Link
                    href="/feed"
                    className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-accent"
                  >
                    Go to the feed
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>
          </section>
        </div>
        <aside className="space-y-5 xl:sticky xl:top-28">
          <section className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">
                On our radar
              </h2>
              <Zap className="h-5 w-5 text-secondary" />
            </div>
            <p className="mb-5 mt-2 text-xs leading-5 text-text-secondary">
              A snapshot of community energy over the past seven days.
            </p>
            <div className="space-y-4">
              {top.length ? (
                top.map((person, index) => (
                  <Link
                    key={person.id}
                    href={`/profile/${person.username}`}
                    className="group flex items-center gap-3 rounded-xl py-1"
                  >
                    <span className="w-4 shrink-0 font-mono text-xs text-text-secondary">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <UserAvatar
                      src={person.avatar_url}
                      name={person.display_name}
                      size="sm"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold group-hover:text-accent">
                        {person.display_name}
                      </span>
                      <span className="block truncate text-[10px] text-text-secondary">
                        @{person.username}
                      </span>
                    </span>
                    <span className="text-xs font-bold text-secondary">
                      {person.signal_score ?? 0}
                    </span>
                  </Link>
                ))
              ) : (
                <p className="py-3 text-xs leading-5 text-text-secondary">
                  Your community is just getting started. Check back after
                  scores have been calculated.
                </p>
              )}
            </div>
          </section>
          <div className="rounded-2xl border border-accent/20 bg-accent/5 p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-accent">
              The circle effect
            </p>
            <h2 className="mt-3 font-display text-2xl font-semibold">
              Great chats start
              <br />
              with your people.
            </h2>
            <Link
              href="/friends"
              className="mt-5 inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-accent"
            >
              Build your circle
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
