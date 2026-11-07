"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatConversationTime, cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { UserAvatar } from "@/components/shared/user-avatar";
import type { Conversation } from "@/types";

export function ConversationItem({
  conversation,
}: {
  conversation: Conversation;
}) {
  const { user } = useAuth();
  const pathname = usePathname();
  const other = conversation.participants?.find(
    (p) => p.user_id !== user?.id,
  )?.user;
  const group = conversation.type === "group";
  const name = group
    ? conversation.name || "Group chat"
    : other?.display_name || "Bakaiti user";
  const unread = conversation.unread_count || 0;
  const last = conversation.last_message;
  const preview = !last
    ? "Say the first hello"
    : last.is_deleted
      ? "Message deleted"
      : last.content ||
        {
          image: "Photo",
          video: "Video",
          audio: "Voice note",
          gif: "GIF",
          file: "Attachment",
          system: "Group update",
          text: "Message",
        }[last.type];
  const active = pathname === `/chat/${conversation.id}`;
  return (
    <Link
      href={`/chat/${conversation.id}`}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex min-h-20 items-center gap-3 rounded-xl border border-transparent p-3 transition-colors hover:bg-surface-container",
        active && "border-accent/20 bg-accent/10",
      )}
    >
      <UserAvatar
        src={group ? conversation.avatar_url : other?.avatar_url}
        name={name}
        size="md"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h2
            className={cn(
              "min-w-0 flex-1 truncate text-sm",
              unread ? "font-bold text-text-primary" : "font-semibold",
            )}
          >
            {name}
          </h2>
          <time className="shrink-0 text-[10px] text-text-secondary">
            {formatConversationTime(conversation.last_message_at)}
          </time>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <p
            className={cn(
              "min-w-0 flex-1 truncate text-xs",
              unread ? "text-text-primary" : "text-text-secondary",
            )}
          >
            {last?.sender_id === user?.id && "You: "}
            {preview}
          </p>
          {unread > 0 && (
            <span
              aria-label={`${unread} unread messages`}
              className="flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1.5 text-[10px] font-bold text-on-secondary"
            >
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
