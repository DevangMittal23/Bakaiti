"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useNotificationStore } from "@/stores/notification-store";
import { cn } from "@/lib/utils";

export function NotificationBell({ className }: { className?: string }) {
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  return (
    <Link
      href="/notifications"
      aria-label={unreadCount ? `Activity, ${unreadCount} unread` : "Activity"}
      className={cn(
        "relative inline-flex h-11 w-11 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary",
        className,
      )}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span
          className="absolute right-0 top-0 min-w-4 rounded-full bg-secondary px-1 text-center text-[9px] font-bold text-on-secondary"
          aria-hidden="true"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
