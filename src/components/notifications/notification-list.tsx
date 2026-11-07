"use client";
import { useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import { useNotificationStore } from "@/stores/notification-store";
import { markAllRead } from "@/actions/notifications";
import { NotificationItem } from "./notification-item";
export function NotificationList() {
  const { notifications, unreadCount, isLoading } = useNotifications();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unread, setUnread] = useState(false);
  const markAll = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await markAllRead();
      if (result.error) throw new Error(result.error);
      useNotificationStore.getState().markAllRead();
    } catch {
      setError("Your updates could not be marked as read. Try again.");
    } finally {
      setPending(false);
    }
  };
  const visible = unread
    ? notifications.filter((n) => !n.is_read)
    : notifications;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4">
        <div className="flex gap-1">
          {[false, true].map((value) => (
            <button
              key={String(value)}
              type="button"
              aria-pressed={unread === value}
              onClick={() => setUnread(value)}
              className={`min-h-11 rounded-xl px-4 text-xs font-semibold ${unread === value ? "bg-accent/15 text-accent" : "text-text-secondary hover:bg-surface"}`}
            >
              {value
                ? `Unread${unreadCount ? ` (${unreadCount})` : ""}`
                : "All updates"}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={pending || !unreadCount}
          onClick={() => void markAll()}
          className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-accent disabled:opacity-35"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCheck className="h-4 w-4" />
          )}
          Mark all read
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-error">
          {error}
        </p>
      )}
      {isLoading && !notifications.length ? (
        <div role="status" className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
          <span className="sr-only">Loading activity</span>
        </div>
      ) : visible.length ? (
        <div className="space-y-3">
          {visible.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
          <Bell className="mx-auto mb-4 h-8 w-8 text-accent" />
          <h2 className="font-display text-2xl font-semibold">
            {unread ? "All caught up." : "Your circle will be in touch."}
          </h2>
          <p className="mt-3 text-sm leading-6 text-text-secondary">
            {unread
              ? "No unread updates. A little peace looks good on you."
              : "Requests, reactions and conversations will show up here."}
          </p>
          <Link
            href="/feed"
            className="mt-4 inline-flex min-h-11 items-center text-xs font-semibold text-accent"
          >
            See what’s happening
          </Link>
        </div>
      )}
    </div>
  );
}
