"use client";
import Link from "next/link";
import { Sparkles, ArrowUpRight, RefreshCw } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { PostCard } from "./post-card";
import { PostCreate } from "./post-create";
import { StoriesBar } from "./stories-bar";
import { useFeed } from "@/hooks/use-feed";
import { InfiniteScroll } from "@/components/shared/infinite-scroll";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import type { Post } from "@/types";

export function FeedList({
  initialPosts,
  initialHasMore,
}: {
  initialPosts: Post[];
  initialHasMore: boolean;
}) {
  const {
    posts,
    isLoading,
    hasMore,
    loadPosts,
    loadMore,
    addPost,
    removePost,
    updatePost,
    error,
  } = useFeed(initialPosts, initialHasMore);
  return (
    <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,680px)_280px]">
      <div className="min-w-0 space-y-5">
        <header className="flex items-end justify-between gap-3">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-secondary">
              A little less scrolling. A little more you.
            </p>
            <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              The feed<span className="text-accent">.</span>
            </h1>
          </div>
          <button
            type="button"
            aria-label="Refresh feed"
            disabled={isLoading}
            onClick={() => void loadPosts()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border text-text-secondary transition-colors hover:bg-surface disabled:opacity-40"
          >
            <RefreshCw
              className={isLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"}
            />
          </button>
        </header>
        <StoriesBar />
        <PostCreate onPostCreated={addPost} />
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-text-secondary">
            Fresh from the community
          </h2>
          <span className="text-[10px] text-text-secondary">Latest first</span>
        </div>
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-error/30 bg-error/5 p-4 text-sm text-error"
          >
            <p>{error}</p>
            <button
              type="button"
              onClick={() => void loadPosts()}
              className="mt-2 min-h-10 font-semibold underline"
            >
              Try again
            </button>
          </div>
        )}
        <InfiniteScroll
          onLoadMore={loadMore}
          hasMore={hasMore}
          isLoading={isLoading}
        >
          <div className="space-y-5">
            <AnimatePresence initial={false}>
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onDelete={() => removePost(post.id)}
                  onUpdate={(updates) => updatePost(post.id, updates)}
                />
              ))}
            </AnimatePresence>
          </div>
        </InfiniteScroll>
        {isLoading && (
          <div role="status" className="flex justify-center py-8">
            <LoadingSpinner />
            <span className="sr-only">Loading posts</span>
          </div>
        )}
        {!posts.length && !isLoading && !error && (
          <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center">
            <Sparkles className="mx-auto mb-4 h-8 w-8 text-accent" />
            <h2 className="font-display text-xl font-semibold">
              Be the plot twist.
            </h2>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-text-secondary">
              Your feed is quiet. Share a thought above or find some new faces.
            </p>
            <Link
              href="/discover"
              className="mt-5 inline-flex min-h-11 items-center gap-2 font-semibold text-accent"
            >
              Explore Bakaiti
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        )}
        {!hasMore && posts.length > 0 && (
          <p className="py-8 text-center text-xs text-text-secondary">
            You’re all caught up. Go make a story worth sharing.
          </p>
        )}
      </div>
      <aside className="sticky top-28 hidden space-y-5 xl:block">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <span className="inline-flex rounded-md bg-secondary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-secondary">
            Your next good conversation
          </span>
          <h2 className="mt-5 font-display text-2xl font-semibold leading-tight">
            Less small talk.
            <br />
            More your people.
          </h2>
          <p className="mt-3 text-xs leading-6 text-text-secondary">
            Find a familiar face, send the meme, or turn a friend into a whole
            group chat.
          </p>
          <Link
            href="/chat"
            className="mt-5 flex min-h-11 items-center justify-between border-t border-border pt-4 text-sm font-semibold text-accent"
          >
            Open messages
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="px-2">
          <p className="text-xs font-semibold">A pulse, not a performance.</p>
          <p className="mt-2 text-xs leading-6 text-text-secondary">
            Set how you’re feeling. Your Pulse lasts four hours, so your circle
            gets the now version of you.
          </p>
          <Link
            href="/friends"
            className="mt-3 inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-accent"
          >
            Meet your circle
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </aside>
    </div>
  );
}
