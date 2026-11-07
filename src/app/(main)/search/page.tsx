import type { Metadata } from "next";
import { getTrendingHashtags } from "@/actions/search";
import { SearchResults } from "@/components/search/search-results";
export const metadata: Metadata = {
  title: "Search",
  description: "Find people, posts and topics on Bakaiti.",
};
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const params = await searchParams;
  const tags = await getTrendingHashtags();
  const tab =
    params.type === "posts" || params.type === "hashtags"
      ? params.type
      : "users";
  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <header>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-secondary">
          Good things are worth finding
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Find your next thing<span className="text-accent">.</span>
        </h1>
        <p className="mt-3 text-sm leading-6 text-text-secondary">
          People, posts, and the rabbit holes in between.
        </p>
      </header>
      <SearchResults
        trendingHashtags={tags}
        initialQuery={params.q || ""}
        initialTab={tab}
      />
    </div>
  );
}
