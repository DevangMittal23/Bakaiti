"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Bookmark,
  Heart,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Share2,
  Trash2,
} from "lucide-react";
import {
  likePost,
  unlikePost,
  bookmarkPost,
  unbookmarkPost,
  deletePost,
} from "@/actions/posts";
import { getPostComments } from "@/actions/comments";
import { useAuth } from "@/hooks/use-auth";
import { UserAvatar } from "@/components/shared/user-avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PostComments } from "./post-comments";
import { mediaUrl } from "@/lib/media";
import { formatRelativeTime, cn } from "@/lib/utils";
import type { Post, Comment } from "@/types";

export function PostCard({
  post,
  onDelete,
  onUpdate,
}: {
  post: Post;
  onDelete?: () => void;
  onUpdate?: (updates: Partial<Post>) => void;
}) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(Boolean(post.is_liked));
  const [saved, setSaved] = useState(Boolean(post.is_bookmarked));
  const [likes, setLikes] = useState(post.likes_count);
  const [commentCount, setCommentCount] = useState(post.comments_count);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [shared, setShared] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const toggle = async (action: "like" | "save") => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      if (!user) throw new Error("Please sign in to join the conversation.");
      const result =
        action === "like"
          ? await (liked ? unlikePost(post.id) : likePost(post.id))
          : await (saved ? unbookmarkPost(post.id) : bookmarkPost(post.id));
      if (result.error) throw new Error(result.error);
      if (action === "like") {
        const next = Math.max(0, likes + (liked ? -1 : 1));
        setLiked(!liked);
        setLikes(next);
        onUpdate?.({ is_liked: !liked, likes_count: next });
      } else {
        setSaved(!saved);
        onUpdate?.({ is_bookmarked: !saved });
      }
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Your change could not be saved. Try again.",
      );
    } finally {
      setPending(false);
    }
  };
  const remove = async () => {
    setPending(true);
    setError(null);
    try {
      const result = await deletePost(post.id);
      if (result.error) throw new Error(result.error);
      setDeleted(true);
      onDelete?.();
      setConfirmDelete(false);
    } catch {
      setError("Your post could not be deleted. Try again.");
    } finally {
      setPending(false);
    }
  };
  const openComments = async () => {
    setShowComments(!showComments);
    if (showComments || comments.length) return;
    setCommentsLoading(true);
    setError(null);
    try {
      setComments(await getPostComments(post.id));
    } catch {
      setError("Comments could not load. Close and reopen them to retry.");
    } finally {
      setCommentsLoading(false);
    }
  };
  const share = async () => {
    setError(null);
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/post/${post.id}`,
      );
      setShared(true);
      setTimeout(() => setShared(false), 2500);
    } catch {
      setError(
        "Could not copy the link. Open the post and copy its address instead.",
      );
    }
  };
  if (deleted) return null;
  return (
    <article
      id={`post-${post.id}`}
      className="overflow-hidden rounded-2xl border border-border bg-surface"
    >
      <div className="flex items-center gap-3 p-4 sm:px-5">
        <Link
          href={`/profile/${post.author?.username || ""}`}
          aria-label={`View ${post.author?.display_name || "author"}'s profile`}
        >
          <UserAvatar
            src={post.author?.avatar_url}
            name={post.author?.display_name || "Bakaiti user"}
            size="sm"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            href={`/profile/${post.author?.username || ""}`}
            className="block truncate text-sm font-semibold hover:text-accent"
          >
            {post.author?.display_name || "Bakaiti user"}
          </Link>
          <p className="mt-0.5 text-[11px] text-text-secondary">
            @{post.author?.username || "user"} ·{" "}
            <Link href={`/post/${post.id}`} className="hover:text-accent">
              <time dateTime={post.created_at}>
                {formatRelativeTime(post.created_at)}
              </time>
            </Link>{" "}
            ·{" "}
            {post.visibility === "public"
              ? "Public"
              : post.visibility === "friends"
                ? "Friends"
                : "Only you"}
          </p>
        </div>
        {user?.id === post.author_id && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Post actions"
                className="flex h-11 w-10 shrink-0 items-center justify-center rounded-xl text-text-secondary hover:bg-surface-container"
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={() => setConfirmDelete(true)}
                className="text-error"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete post
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {post.content && (
        <p className="whitespace-pre-wrap break-words px-4 pb-4 text-sm leading-7 [overflow-wrap:anywhere] sm:px-5">
          {post.content.split(/(#[\p{L}\p{N}_]+)/u).map((part, index) =>
            part.startsWith("#") ? (
              <Link
                key={index}
                href={`/search?q=${encodeURIComponent(part)}&type=posts`}
                className="text-accent hover:underline"
              >
                {part}
              </Link>
            ) : (
              part
            ),
          )}
        </p>
      )}
      {post.media_urls?.length > 0 && (
        <div
          className={cn(
            "grid gap-1",
            post.media_urls.length > 1 && "grid-cols-2",
          )}
        >
          {post.media_urls.map((url, index) =>
            post.media_types?.[index] === "video" ? (
              <video
                key={url}
                src={mediaUrl(url)}
                controls
                preload="metadata"
                className="max-h-[440px] w-full bg-background object-contain"
              />
            ) : (
              <button
                key={url}
                type="button"
                aria-label={`Enlarge post image ${index + 1}`}
                onClick={() => setImage(url)}
                className="overflow-hidden bg-background"
              >
                <img
                  src={mediaUrl(url)}
                  alt={`Photo shared by ${post.author?.display_name || "a community member"}`}
                  className="max-h-[480px] w-full object-cover transition-transform duration-300 hover:scale-[1.02]"
                  loading="lazy"
                />
              </button>
            ),
          )}
        </div>
      )}
      {post.link_url && (
        <a
          href={post.link_url}
          target="_blank"
          rel="noreferrer"
          className="mx-4 mb-4 block overflow-hidden rounded-xl border border-border bg-background p-4 sm:mx-5"
        >
          <p className="text-xs font-semibold text-accent">
            {post.link_preview?.title || "Open shared link"}
          </p>
          {post.link_preview?.description && (
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-text-secondary">
              {post.link_preview.description}
            </p>
          )}
          <p className="mt-2 truncate text-[10px] text-text-secondary">
            {post.link_preview?.domain || post.link_url}
          </p>
        </a>
      )}
      <div className="flex items-center gap-1 border-t border-border px-3 py-2">
        <button
          type="button"
          aria-label={liked ? "Unlike post" : "Like post"}
          aria-pressed={liked}
          disabled={pending}
          onClick={() => void toggle("like")}
          className={cn(
            "flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs transition-colors hover:bg-accent/10 disabled:opacity-50",
            liked ? "text-accent" : "text-text-secondary",
          )}
        >
          <Heart className={cn("h-4 w-4", liked && "fill-current")} />
          {likes}
        </button>
        <button
          type="button"
          aria-label="Comments"
          aria-expanded={showComments}
          onClick={() => void openComments()}
          className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs text-text-secondary hover:bg-accent/10 hover:text-accent"
        >
          <MessageCircle className="h-4 w-4" />
          {commentCount}
        </button>
        <button
          type="button"
          aria-label="Copy post link"
          onClick={() => void share()}
          className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-text-secondary hover:bg-accent/10 hover:text-accent"
        >
          <Share2 className="h-4 w-4" />
          {shared && (
            <span role="status" className="text-[10px]">
              Copied
            </span>
          )}
        </button>
        <span className="flex-1" />
        <button
          type="button"
          aria-label={saved ? "Remove bookmark" : "Bookmark post"}
          aria-pressed={saved}
          disabled={pending}
          onClick={() => void toggle("save")}
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl hover:bg-accent/10 disabled:opacity-50",
            saved ? "text-accent" : "text-text-secondary",
          )}
        >
          <Bookmark className={cn("h-4 w-4", saved && "fill-current")} />
        </button>
      </div>
      {error && (
        <p role="alert" className="px-5 pb-4 text-xs leading-5 text-error">
          {error}
        </p>
      )}
      {showComments && (
        <div className="border-t border-border">
          <PostComments
            postId={post.id}
            comments={comments}
            isLoading={commentsLoading}
            onCommentAdded={(comment) => {
              setComments((current) =>
                comment.parent_comment_id
                  ? current.map((c) =>
                      c.id === comment.parent_comment_id
                        ? { ...c, replies: [...(c.replies || []), comment] }
                        : c,
                    )
                  : [...current, comment],
              );
              setCommentCount((current) => current + 1);
              onUpdate?.({ comments_count: commentCount + 1 });
            }}
          />
        </div>
      )}
      <Dialog
        open={confirmDelete}
        onOpenChange={(open) => {
          if (!pending) setConfirmDelete(open);
        }}
      >
        <DialogContent>
          <DialogTitle>Delete this post?</DialogTitle>
          <DialogDescription>
            Your post and its comments will be removed. This cannot be undone.
          </DialogDescription>
          {error && (
            <p role="alert" className="text-sm text-error">
              {error}
            </p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <Button
              autoFocus
              variant="outline"
              disabled={pending}
              onClick={() => setConfirmDelete(false)}
            >
              Keep post
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => void remove()}
            >
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete post
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={image !== null}
        onOpenChange={(open) => {
          if (!open) setImage(null);
        }}
      >
        <DialogContent>
          <DialogTitle>Post image</DialogTitle>
          <DialogDescription>
            Photo shared by {post.author?.display_name || "a community member"}.
          </DialogDescription>
          {image && (
            <img
              src={mediaUrl(image)}
              alt="Enlarged post image"
              className="max-h-[70dvh] w-full object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </article>
  );
}
