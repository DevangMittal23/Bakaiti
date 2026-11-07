"use client";
import { useRef, useState } from "react";
import { Send, Loader2, X } from "lucide-react";
import { createComment } from "@/actions/comments";
import { CommentItem } from "./comment-item";
import type { Comment } from "@/types";
export function PostComments({
  postId,
  comments,
  isLoading,
  onCommentAdded,
}: {
  postId: string;
  comments: Comment[];
  isLoading: boolean;
  onCommentAdded: (comment: Comment) => void;
}) {
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState<{ id: string; username: string } | null>(
    null,
  );
  const input = useRef<HTMLInputElement>(null);
  const submit = async () => {
    if (pending || !text.trim()) return;
    setPending(true);
    setError(null);
    try {
      const result = await createComment(
        postId,
        text.trim(),
        reply?.id || null,
      );
      if (result.error) throw new Error(result.error);
      if (result.comment) {
        onCommentAdded(result.comment);
        setText("");
        setReply(null);
      }
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Comment not posted. Try again.",
      );
    } finally {
      setPending(false);
    }
  };
  return (
    <div className="space-y-4 p-4 sm:p-5">
      {reply && (
        <div className="flex items-center justify-between rounded-xl bg-accent/10 pl-3 text-xs text-accent">
          <span>Replying to @{reply.username}</span>
          <button
            type="button"
            aria-label="Cancel reply"
            onClick={() => setReply(null)}
            className="flex h-11 w-11 items-center justify-center"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <form
        noValidate
        aria-busy={pending}
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className="flex gap-2"
      >
        <label htmlFor={`comment-${postId}`} className="sr-only">
          {reply ? "Write a reply" : "Write a comment"}
        </label>
        <input
          ref={input}
          id={`comment-${postId}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={pending}
          maxLength={1000}
          placeholder={
            reply ? `Reply to @${reply.username}` : "Add to the conversation…"
          }
          className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-xs focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Post comment"
          disabled={!text.trim() || pending}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-on-primary disabled:opacity-40"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </form>
      {error && (
        <p role="alert" className="text-xs text-error">
          {error}
        </p>
      )}
      {isLoading ? (
        <p role="status" className="py-4 text-xs text-text-secondary">
          Loading the conversation…
        </p>
      ) : comments.filter((c) => c.parent_comment_id === null).length ? (
        comments
          .filter((c) => c.parent_comment_id === null)
          .map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onReplyClick={(id, username) => {
                setReply({ id, username });
                input.current?.focus();
              }}
            />
          ))
      ) : (
        <p className="py-4 text-center text-xs text-text-secondary">
          Start the conversation. Leave the first comment.
        </p>
      )}
    </div>
  );
}
