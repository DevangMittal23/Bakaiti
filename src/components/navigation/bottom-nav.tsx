"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageCircle,
  PanelsTopLeft,
  Compass,
  Users,
  Bell,
} from "lucide-react";
import { useChatStore } from "@/stores/chat-store";
import { useNotificationStore } from "@/stores/notification-store";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/chat", icon: MessageCircle, label: "Chats" },
  { href: "/feed", icon: PanelsTopLeft, label: "Feed" },
  { href: "/discover", icon: Compass, label: "Discover" },
  { href: "/friends", icon: Users, label: "Circle" },
  { href: "/notifications", icon: Bell, label: "Activity" },
];
export function BottomNav() {
  const pathname = usePathname();
  const chatUnread = useChatStore((state) => state.totalUnread);
  const notifUnread = useNotificationStore((state) => state.unreadCount);
  if (pathname.startsWith("/chat/")) return null;
  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-safe [backdrop-filter:blur(var(--glass-blur))] lg:hidden"
    >
      <div className="mx-auto flex h-[72px] max-w-lg items-center px-2">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          const count =
            href === "/chat"
              ? chatUnread
              : href === "/notifications"
                ? notifUnread
                : 0;
          return (
            <Link
              key={href}
              href={href}
              aria-label={count ? `${label}, ${count} unread` : label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold transition-colors",
                active
                  ? "text-accent"
                  : "text-text-secondary hover:bg-surface hover:text-text-primary",
              )}
            >
              <span
                className={cn(
                  "relative flex h-7 w-11 items-center justify-center rounded-lg",
                  active && "bg-accent/15",
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
                {count > 0 && (
                  <span
                    className="absolute -right-1 -top-1 min-w-4 rounded-full bg-secondary px-1 text-center text-[9px] font-bold text-on-secondary"
                    aria-hidden="true"
                  >
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </span>
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
