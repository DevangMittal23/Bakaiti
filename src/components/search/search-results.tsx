"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X, Loader2, Hash, ArrowUpRight } from "lucide-react";
import { searchUsers, searchPosts, searchHashtags } from "@/actions/search";
import { useDebounce } from "@/hooks/use-debounce";
import { UserResultCard } from "./user-result-card";
import { PostResultCard } from "./post-result-card";
import { cn } from "@/lib/utils";
import type { User, Post, Hashtag } from "@/types";
type Tab = "users" | "posts" | "hashtags";
export function SearchResults({
  trendingHashtags,
  initialQuery = "",
  initialTab = "users",
}: {
  trendingHashtags: Hashtag[];
  initialQuery?: string;
  initialTab?: Tab;
}) {
  const router = useRouter();
  const seed = `${initialQuery}:${initialTab}`;
  const [draft, setDraft] = useState({
    seed,
    query: initialQuery,
    tab: initialTab,
  });
  if (draft.seed !== seed)
    setDraft({ seed, query: initialQuery, tab: initialTab });
  const [results, setResults] = useState<{
    users: User[];
    posts: Post[];
    hashtags: Hashtag[];
  }>({ users: [], posts: [], hashtags: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [composing, setComposing] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const version = useRef(0);
  const term = useDebounce(draft.query, 300);
  useEffect(() => {
    if (composing) return;
    const request = ++version.current;
    let active = true;
    void (async () => {
      setError(null);
      if (!term.trim()) {
        setResults({ users: [], posts: [], hashtags: [] });
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [users, posts, hashtags] = await Promise.all([
          searchUsers(term.trim()),
          searchPosts(term.trim()),
          searchHashtags(term.trim()),
        ]);
        if (!active || version.current !== request) return;
        if (users.error || posts.error) throw new Error();
        setResults({
          users: users.results || [],
          posts: posts.results || [],
          hashtags,
        });
      } catch {
        if (active && version.current === request)
          setError(
            "Search could not load. Your query is still here; try again.",
          );
      } finally {
        if (active && version.current === request) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [term, composing, retry]);
  const commit = (query = draft.query, tab = draft.tab) => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    params.set("type", tab);
    router.replace(`/search?${params}`, { scroll: false });
  };
  const clear = () => {
    version.current++;
    setDraft({ ...draft, query: "" });
    setResults({ users: [], posts: [], hashtags: [] });
    setError(null);
    setLoading(false);
    commit("", draft.tab);
    input.current?.focus();
  };
  const count = results[draft.tab].length;
  return (
    <div className="space-y-6">
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (!composing) commit();
        }}
        className="flex gap-2"
      >
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-4 top-4 h-5 w-5 text-text-secondary" />
          <label htmlFor="bakaiti-search" className="sr-only">
            Search people, posts and topics
          </label>
          <input
            ref={input}
            id="bakaiti-search"
            type="search"
            autoComplete="off"
            value={draft.query}
            onChange={(e) => {
              version.current++;
              setDraft({ ...draft, query: e.target.value });
            }}
            onCompositionStart={() => setComposing(true)}
            onCompositionEnd={() => setComposing(false)}
            placeholder="Who or what are you looking for?"
            className="h-14 w-full rounded-2xl border border-border bg-surface pl-12 pr-12 text-sm focus:border-accent focus:outline-none"
          />
          {draft.query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={clear}
              className="absolute right-0 top-1 flex h-12 w-12 items-center justify-center text-text-secondary hover:text-accent"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          type="submit"
          className="min-h-14 rounded-2xl bg-accent px-4 text-xs font-bold text-on-primary"
        >
          Search
        </button>
      </form>
      {draft.query.trim() ? (
        <>
          <div
            className="flex gap-1 border-b border-border pb-3"
            aria-label="Search categories"
          >
            {(["users", "posts", "hashtags"] as const).map((tab) => (
              <button
                type="button"
                key={tab}
                aria-pressed={draft.tab === tab}
                onClick={() => {
                  setDraft({ ...draft, tab });
                  commit(draft.query, tab);
                }}
                className={cn(
                  "min-h-11 flex-1 rounded-xl px-3 text-xs font-semibold transition-colors",
                  draft.tab === tab
                    ? "bg-accent/15 text-accent"
                    : "text-text-secondary hover:bg-surface",
                )}
              >
                {tab === "users"
                  ? "People"
                  : tab === "posts"
                    ? "Posts"
                    : "Topics"}
                {!loading && (
                  <span className="ml-2 text-[10px]">
                    {results[tab].length}
                  </span>
                )}
              </button>
            ))}
          </div>
          {loading ? (
            <div
              role="status"
              className="flex items-center justify-center gap-3 py-16 text-sm text-text-secondary"
            >
              <Loader2 className="h-5 w-5 animate-spin text-accent" />
              Looking around…
            </div>
          ) : error ? (
            <div
              role="alert"
              className="rounded-2xl border border-error/20 p-6 text-sm text-error"
            >
              <p>{error}</p>
              <button
                type="button"
                onClick={() => setRetry((v) => v + 1)}
                className="mt-3 min-h-11 font-semibold underline"
              >
                Try again
              </button>
            </div>
          ) : count ? (
            <div className="space-y-3">
              {draft.tab === "users"
                ? results.users.map((user) => (
                    <UserResultCard key={user.id} user={user} />
                  ))
                : draft.tab === "posts"
                  ? results.posts.map((post) => (
                      <PostResultCard
                        key={post.id}
                        post={post}
                        searchQuery={term}
                      />
                    ))
                  : results.hashtags.map((tag) => (
                      <Link
                        key={tag.id}
                        href={`/search?q=${encodeURIComponent(`#${tag.name}`)}&type=posts`}
                        className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 hover:border-accent/40"
                      >
                        <Hash className="h-5 w-5 text-accent" />
                        <span className="flex-1 text-sm font-semibold">
                          {tag.name}
                        </span>
                        <span className="text-xs text-text-secondary">
                          {tag.usage_count} posts
                        </span>
                        <ArrowUpRight className="h-4 w-4 text-accent" />
                      </Link>
                    ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center">
              <Search className="mx-auto mb-4 h-7 w-7 text-accent" />
              <h2 className="font-display text-xl font-semibold">
                Nothing here just yet.
              </h2>
              <p className="mt-2 text-sm text-text-secondary">
                Try another spelling, a shorter search, or a different category.
              </p>
              <button
                type="button"
                onClick={clear}
                className="mt-4 min-h-11 text-xs font-semibold text-accent"
              >
                Clear and start fresh
              </button>
            </div>
          )}
        </>
      ) : (
        <section>
          <h2 className="mb-4 font-display text-xl font-semibold">
            Follow your curiosity
          </h2>
          {trendingHashtags.length ? (
            <div className="flex flex-wrap gap-2">
              {trendingHashtags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/search?q=${encodeURIComponent(`#${tag.name}`)}&type=posts`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm text-accent hover:border-accent"
                >
                  <Hash className="h-3.5 w-3.5" />
                  {tag.name}
                  <span className="text-[10px] text-text-secondary">
                    {tag.usage_count}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-6 text-text-secondary">
              Look up a name, search a shared thought, or follow a hashtag to
              find your people.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
