"use client";
import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2, Loader2, Smile, FileText, ArrowUpRight } from "lucide-react";
import { mediaUrl } from "@/lib/media";
import { attachmentKind, fitChatMedia, formatAttachmentSize } from "@/lib/chat-media";
import { formatMessageTime, cn } from "@/lib/utils";
import { reactToMessage, deleteMessage, editMessage } from "@/actions/messages";
import { useChatStore } from "@/stores/chat-store";
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
import type { Message } from "@/types";

export function MessageItem({
  message,
  isOwn,
  showAvatar,
}: {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
}) {
  const { user } = useAuth();
  const [dialog, setDialog] = useState<"delete" | "edit" | "image" | null>(
    null,
  );
  const [content, setContent] = useState(message.content || "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reactionOpen, setReactionOpen] = useState(false);
  const [reactions, setReactions] = useState(message.reactions || []);
  const hasMedia = Boolean(message.media_url || message.gif_url);
  const dimensions = fitChatMedia(message.media_metadata?.width, message.media_metadata?.height);
  const mutate = async (kind: "delete" | "edit") => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const result =
        kind === "delete"
          ? await deleteMessage(message.id, "everyone")
          : await editMessage(message.id, content.trim());
      if (result.error) throw new Error(result.error);
      useChatStore
        .getState()
        .updateMessage(
          message.id,
          kind === "delete"
            ? {
                is_deleted: true,
                content: null,
                media_url: null,
                gif_url: null,
                deleted_for: "everyone",
              }
            : { content: content.trim(), is_edited: true },
        );
      setDialog(null);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "This change could not be saved. Try again.",
      );
    } finally {
      setPending(false);
    }
  };
  const react = async (emoji: string) => {
    if (pending || !user) return;
    setPending(true);
    setError(null);
    try {
      const result = await reactToMessage(message.id, emoji);
      if (result.error) throw new Error(result.error);
      setReactions((current) =>
        result.action === "removed"
          ? current.filter((r) => !(r.user_id === user.id && r.emoji === emoji))
          : [
              ...current,
              {
                id: `${user.id}-${emoji}`,
                message_id: message.id,
                user_id: user.id,
                emoji,
                created_at: new Date().toISOString(),
                user,
              },
            ],
      );
      setReactionOpen(false);
    } catch {
      setError("Reaction not saved. Try again.");
    } finally {
      setPending(false);
    }
  };
  if (message.is_deleted)
    return (
      <p
        className={cn(
          "my-2 px-4 text-xs italic text-text-secondary",
          isOwn && "text-right",
        )}
      >
        Message deleted
      </p>
    );
  return (
    <div
      className={cn(
        "group my-2 flex w-full items-end gap-2",
        isOwn ? "justify-end" : "justify-start",
      )}
    >
      {!isOwn && (
        <div className="w-7 shrink-0">
          {showAvatar && (
            <UserAvatar
              src={message.sender?.avatar_url}
              name={message.sender?.display_name || "Friend"}
              size="xs"
            />
          )}
        </div>
      )}
      <div className="min-w-0 max-w-[82%] sm:max-w-[75%]" style={hasMedia ? { maxWidth: "min(82%, 348px)" } : undefined}>
        {!isOwn && showAvatar && (
          <p className="mb-1 ml-1 text-[10px] font-semibold text-text-secondary">
            {message.sender?.display_name}
          </p>
        )}
        <div
          className={cn(
            "overflow-hidden rounded-2xl px-3.5 py-2.5 text-sm leading-6",
            isOwn
              ? "rounded-br-md bg-accent text-on-primary"
              : "rounded-bl-md border border-border bg-surface text-text-primary",
          )}
        >
          {message.reply_to && (
            <div className="mb-2 border-l-2 border-current/40 pl-2 text-xs opacity-75">
              {message.reply_to.content || "Attachment"}
            </div>
          )}
          {message.type === "image" && message.media_url && (
            <button
              type="button"
              aria-label="Enlarge shared image"
              onClick={() => setDialog("image")}
              className="mb-1 block w-fit max-w-full cursor-pointer overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current hover:opacity-90 active:opacity-75"
            >
              <img
                src={mediaUrl(message.media_url)}
                alt={message.media_metadata?.filename || "Shared image"}
                width={dimensions?.width}
                height={dimensions?.height}
                style={dimensions ? { width: dimensions.width } : undefined}
                className="block h-auto w-auto max-h-[360px] max-w-full object-contain"
                loading="lazy"
              />
            </button>
          )}
          {message.type === "video" && message.media_url && (
            <video
              src={mediaUrl(message.media_url)}
              aria-label="Shared video"
              controls
              playsInline
              preload="metadata"
              width={dimensions?.width}
              height={dimensions?.height}
              style={dimensions ? { width: dimensions.width } : undefined}
              className="block h-auto w-auto max-h-[360px] max-w-full rounded-xl bg-background object-contain"
            />
          )}
          {message.type === "gif" && message.gif_url && (
            <img
              src={message.gif_url}
              alt="Shared GIF"
              className="block h-auto w-auto max-h-[280px] max-w-full rounded-xl object-contain"
              style={{ maxWidth: "min(100%, 280px)" }}
              loading="lazy"
            />
          )}
          {message.type === "audio" && message.media_url && (
            <audio
              aria-label="Voice message"
              src={mediaUrl(message.media_url)}
              controls
              preload="metadata"
              className="block w-72 max-w-full"
            />
          )}
          {message.type === "file" && message.media_url && (
            <a
              href={mediaUrl(message.media_url)}
              target="_blank"
              rel="noreferrer"
              className="flex w-72 max-w-full cursor-pointer items-center gap-3 rounded-xl border border-current/20 p-2 transition-colors hover:bg-current/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current active:opacity-75"
            >
              <FileText aria-hidden="true" className="h-8 w-8 shrink-0 opacity-80" />
              <span className="min-w-0 flex-1">
                <span className="block break-words text-xs font-semibold leading-5 [overflow-wrap:anywhere]">{message.media_metadata?.filename || "Open attachment"}</span>
                <span className="mt-0.5 block text-[10px] leading-4 opacity-75">{[attachmentKind(message.media_metadata?.filename || "Attachment"), formatAttachmentSize(message.media_metadata?.size)].filter(Boolean).join(" · ")}</span>
              </span>
              <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0 opacity-75" />
            </a>
          )}
          {message.content && (
            <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
              {message.content}
            </p>
          )}
          <p className="mt-1 flex items-center justify-end gap-1.5 text-[10px] opacity-70">
            {message.is_edited && <span>edited</span>}
            <time dateTime={message.created_at}>
              {formatMessageTime(message.created_at)}
            </time>
          </p>
        </div>
        <div
          className={cn(
            "mt-1 flex min-h-6 items-center gap-1",
            isOwn && "justify-end",
          )}
        >
          {reactions.map((r) => (
            <button
              type="button"
              key={r.id}
              aria-label={`React with ${r.emoji}`}
              disabled={pending}
              onClick={() => void react(r.emoji)}
              className="min-h-7 min-w-7 rounded-lg border border-border bg-surface px-1.5 text-xs hover:bg-accent/10"
            >
              {r.emoji}
            </button>
          ))}
          <DropdownMenu open={reactionOpen} onOpenChange={setReactionOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="React to message"
                className="flex h-7 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-container hover:text-accent"
              >
                <Smile className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <div className="flex gap-1 p-1">
                {["❤️", "😂", "🔥", "👍", "😮"].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    aria-label={`React with ${emoji}`}
                    disabled={pending}
                    onClick={() => void react(emoji)}
                    className="h-11 w-10 rounded-lg text-lg hover:bg-accent/10"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          {isOwn && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Message actions"
                  className="flex h-7 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-container"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {message.type === "text" && (
                  <DropdownMenuItem
                    onSelect={() => {
                      setContent(message.content || "");
                      setError(null);
                      setDialog("edit");
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit message
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className="text-error"
                  onSelect={() => {
                    setError(null);
                    setDialog("delete");
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete for everyone
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {error && !dialog && (
          <p role="alert" className="mt-1 text-xs text-error">
            {error}
          </p>
        )}
      </div>
      <Dialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open && !pending) setDialog(null);
        }}
      >
        <DialogContent>
          <DialogTitle>
            {dialog === "image"
              ? "Shared image"
              : dialog === "edit"
                ? "Edit your message"
                : "Delete this message?"}
          </DialogTitle>
          <DialogDescription>
            {dialog === "image"
              ? "Image shared in this conversation."
              : dialog === "edit"
                ? "Everyone in this conversation will see the updated message."
                : "This removes the message for everyone in this conversation. This cannot be undone."}
          </DialogDescription>
          {dialog === "image" && message.media_url ? (
            <img
              src={mediaUrl(message.media_url)}
              alt="Enlarged shared image"
              className="max-h-[70dvh] w-full object-contain"
            />
          ) : (
            <form
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                void mutate(dialog === "edit" ? "edit" : "delete");
              }}
              className="space-y-4"
            >
              {dialog === "edit" && (
                <>
                  <label htmlFor={`edit-${message.id}`} className="sr-only">
                    Message text
                  </label>
                  <textarea
                    id={`edit-${message.id}`}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    maxLength={5000}
                    rows={4}
                    className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm"
                  />
                </>
              )}
              {error && (
                <p role="alert" className="text-xs text-error">
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  autoFocus
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => setDialog(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant={dialog === "delete" ? "destructive" : "default"}
                  disabled={pending || (dialog === "edit" && !content.trim())}
                >
                  {pending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {dialog === "edit" ? "Save changes" : "Delete message"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
