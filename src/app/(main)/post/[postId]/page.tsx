import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getPost } from "@/actions/posts";
import { PostCard } from "@/components/feed/post-card";
export const metadata = {
  title: "Post",
  description: "A moment from the Bakaiti community.",
};
export default async function PostPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const post = await getPost(postId);
  if (!post) notFound();
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        href="/feed"
        className="inline-flex min-h-11 items-center gap-2 text-sm text-text-secondary hover:text-accent"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to the feed
      </Link>
      <PostCard post={post} />
    </div>
  );
}
