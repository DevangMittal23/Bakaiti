import type { Metadata } from "next";
import { getFeedPosts } from "@/actions/posts";
import { FeedList } from "@/components/feed/feed-list";
import type { Post } from "@/types";

export const metadata: Metadata = {
  title: "Feed",
  description: "See what your community is sharing on Bakaiti.",
};

export default async function FeedPage() {
  const { posts, hasMore } = await getFeedPosts();

  return (
    <div>
      <FeedList initialPosts={posts as Post[]} initialHasMore={hasMore} />
    </div>
  );
}
