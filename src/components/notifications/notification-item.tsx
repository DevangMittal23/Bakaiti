"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Heart,
  MessageCircle,
  UserPlus,
  Check,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import { markAsRead as markRead } from "@/actions/notifications";
import { respondToFriendRequest } from "@/actions/friendships";
import { useNotificationStore } from "@/stores/notification-store";
import { UserAvatar } from "@/components/shared/user-avatar";
import { formatRelativeTime, cn } from "@/lib/utils";
import type { Notification } from "@/types";
function destination(notification: Notification) {
  if (notification.entity_type === "post" && notification.entity_id)
    return `/post/${notification.entity_id}`;
  if (notification.entity_type === "conversation" && notification.entity_id)
    return `/chat/${notification.entity_id}`;
  if (
    notification.type === "friend_request" ||
    notification.type === "friend_accept"
  )
    return "/friends";
  if (notification.actor?.username)
    return `/profile/${notification.actor.username}`;
  return "/notifications";
}
export function NotificationItem({
  notification,
}: {
  notification: Notification;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handled, setHandled] = useState<string | null>(null);
  const name = notification.actor?.display_name || "Someone";
  const Icon =
    notification.type === "friend_request"
      ? UserPlus
      : notification.type.includes("like")
        ? Heart
        : MessageCircle;
  const read = async () => {
    if (notification.is_read) return;
    try {
      const result = await markRead(notification.id);
      if (result.error) throw new Error(result.error);
      useNotificationStore.getState().markAsRead(notification.id);
    } catch {
      setError("Could not mark this update as read. Try again.");
    }
  };
  const respond = async (accept: boolean) => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      if (!notification.actor_id)
        throw new Error("This request is no longer available.");
      const result = await respondToFriendRequest(
        notification.actor_id,
        accept,
      );
      if (result.error) throw new Error(result.error);
      setHandled(accept ? "Added to your circle" : "Request declined");
      await read();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not respond to this request. Try again.",
      );
    } finally {
      setPending(false);
    }
  };
  return (
    <article
      className={cn(
        "rounded-2xl border p-4 transition-colors sm:p-5",
        notification.is_read
          ? "border-border bg-surface"
          : "border-accent/25 bg-accent/5",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <UserAvatar
            src={notification.actor?.avatar_url}
            name={name}
            size="md"
          />
          <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-surface bg-accent text-on-primary">
            <Icon className="h-2.5 w-2.5" />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <Link
            href={destination(notification)}
            onClick={() => void read()}
            className="block text-sm leading-6 hover:text-accent"
          >
            <span className="font-semibold">{name}</span>{" "}
            {notification.body ||
              (notification.type === "friend_request"
                ? "wants to join your circle."
                : notification.type === "friend_accept"
                  ? "accepted your friend request."
                  : "shared an update with you.")}
          </Link>
          <time
            dateTime={notification.created_at}
            className="mt-1 block text-[10px] text-text-secondary"
          >
            {formatRelativeTime(notification.created_at)}
          </time>
          {notification.type === "friend_request" &&
            !notification.is_read &&
            !handled && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void respond(true)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-xs font-bold text-on-primary disabled:opacity-50"
                >
                  {pending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UserPlus className="h-3.5 w-3.5" />
                  )}
                  Accept
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void respond(false)}
                  className="min-h-11 rounded-xl border border-border px-4 text-xs text-text-secondary disabled:opacity-50"
                >
                  Decline
                </button>
              </div>
            )}
          {handled && (
            <p role="status" className="mt-2 text-xs text-secondary">
              {handled}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-2 text-xs text-error">
              {error}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-center">
          {!notification.is_read && (
            <button
              type="button"
              aria-label="Mark notification as read"
              onClick={() => void read()}
              className="flex h-11 w-9 items-center justify-center rounded-xl text-accent hover:bg-accent/10"
            >
              <Check className="h-4 w-4" />
            </button>
          )}
          <Link
            href={destination(notification)}
            aria-label="Open notification"
            onClick={() => void read()}
            className="flex h-11 w-9 items-center justify-center rounded-xl text-text-secondary hover:text-accent"
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
