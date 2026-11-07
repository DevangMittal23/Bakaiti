"use client";
import { useState } from "react";
import Link from "next/link";
import { Image as ImageIcon, Loader2, ArrowUpRight } from "lucide-react";
import { PostCard } from "@/components/feed/post-card";
import { getBookmarkedPosts } from "@/actions/posts";
import { mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import type { Post } from "@/types";
export function ProfileTabs({
  posts,
  isOwnProfile,
}: {
  posts: Post[];
  userId: string;
  isOwnProfile: boolean;
}) {
  const [tab, setTab] = useState<"feed" | "moments" | "saved">("feed");
  const [saved, setSaved] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const select = async (next: typeof tab) => {
    setTab(next);
    if (next !== "saved") return;
    setLoading(true);
    setError(null);
    try {
      const result = await getBookmarkedPosts();
      setSaved(result.posts);
    } catch {
      setError("Saved posts could not load. Choose Saved again to retry.");
    } finally {
      setLoading(false);
    }
  };
  const media = posts.flatMap((post) =>
    post.media_urls.map((url, index) => ({
      url,
      type: post.media_types[index],
      postId: post.id,
    })),
  );
  const empty = (
    <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center">
      <ImageIcon
        className="mx-auto mb-4 h-7 w-7 text-accent"
        aria-hidden="true"
      />
      <h2 className="font-display text-xl font-semibold">
        {tab === "saved"
          ? "Keep the good stuff close."
          : tab === "moments"
            ? "Still making memories."
            : "A blank page, endless possibilities."}
      </h2>
      <p className="mt-2 text-sm text-text-secondary">
        {tab === "saved"
          ? "Bookmark a post and it will be waiting here."
          : "New posts and moments will appear here."}
      </p>
      {isOwnProfile && (
        <Link
          href="/feed"
          className="mt-4 inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-accent"
        >
          Go to the feed
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
  return (
    <section className="mx-auto max-w-3xl space-y-5 pb-8">
      <div
        className="flex gap-1 border-b border-border pb-3"
        aria-label="Profile content"
      >
        {(
          [
            "feed",
            "moments",
            ...(isOwnProfile ? ["saved" as const] : []),
          ] as const
        ).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={tab === value}
            onClick={() => void select(value)}
            className={cn(
              "min-h-11 flex-1 rounded-xl px-3 text-xs font-semibold capitalize transition-colors",
              tab === value
                ? "bg-accent/15 text-accent"
                : "text-text-secondary hover:bg-surface",
            )}
          >
            {value === "feed" ? "Posts" : value}
            {value === "feed" && (
              <span className="ml-2 text-[10px]">{posts.length}</span>
            )}
            {value === "moments" && (
              <span className="ml-2 text-[10px]">{media.length}</span>
            )}
          </button>
        ))}
      </div>
      {loading ? (
        <div role="status" className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
          <span className="sr-only">Loading saved posts</span>
        </div>
      ) : error ? (
        <p role="alert" className="text-xs text-error">
          {error}
        </p>
      ) : tab === "moments" ? (
        media.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {media.map((item, index) => (
              <div
                key={`${item.postId}-${index}`}
                className="overflow-hidden rounded-xl border border-border bg-surface"
              >
                {item.type === "video" ? (
                  <video
                    src={mediaUrl(item.url)}
                    controls
                    preload="metadata"
                    className="aspect-square w-full object-cover"
                  />
                ) : (
                  <Link href={`/post/${item.postId}`}>
                    <img
                      src={mediaUrl(item.url)}
                      alt={`Shared moment ${index + 1}`}
                      className="aspect-square w-full object-cover transition-transform hover:scale-[1.03]"
                      loading="lazy"
                    />
                  </Link>
                )}
                <Link
                  href={`/post/${item.postId}`}
                  className="flex min-h-10 items-center justify-between px-3 text-[10px] text-text-secondary hover:text-accent"
                >
                  Open post
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            ))}
          </div>
        ) : (
          empty
        )
      ) : (
        <div className="space-y-5">
          {(tab === "saved" ? saved : posts).length
            ? (tab === "saved" ? saved : posts).map((post) => (
                <PostCard key={post.id} post={post} />
              ))
            : empty}
        </div>
      )}
    </section>
  );
}
