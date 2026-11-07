"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  MessageCircle,
  PanelsTopLeft,
  Compass,
  Users,
  Bell,
  Settings,
  LogOut,
  ArrowUpRight,
  Radio,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useChatStore } from "@/stores/chat-store";
import { useNotificationStore } from "@/stores/notification-store";
import { toast } from "sonner";
import { UserAvatar } from "@/components/shared/user-avatar";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/chat", icon: MessageCircle, label: "Messages" },
  { href: "/feed", icon: PanelsTopLeft, label: "The feed" },
  { href: "/discover", icon: Compass, label: "Discover" },
  { href: "/friends", icon: Users, label: "Your circle" },
  { href: "/notifications", icon: Bell, label: "Activity" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      router.replace("/login");
      router.refresh();
    } catch {
      toast.error("Could not sign out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  };
  const chatUnread = useChatStore((state) => state.totalUnread);
  const notifUnread = useNotificationStore((state) => state.unreadCount);
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[240px] flex-col border-r border-border bg-background lg:flex">
      <Link
        href="/feed"
        aria-label="Bakaiti home"
        className="flex h-[72px] shrink-0 items-center gap-2.5 px-7"
      >
        <span className="flex h-9 w-9 -rotate-6 items-center justify-center rounded-xl bg-secondary text-on-secondary">
          <MessageCircle className="h-5 w-5" strokeWidth={2.6} />
        </span>
        <span className="font-display text-[27px] font-bold tracking-[-0.065em]">
          bakaiti<span className="text-secondary">.</span>
        </span>
      </Link>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-7">
        <p className="app-eyebrow mb-3 px-3">Stay in the loop</p>
        <nav aria-label="Main navigation" className="space-y-1.5">
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
                aria-current={active ? "page" : undefined}
                aria-label={count ? `${label}, ${count} unread` : label}
                className={cn(
                  "group flex min-h-12 items-center gap-3 rounded-xl px-3 text-[13px] font-semibold transition-colors active:scale-[0.99]",
                  active
                    ? "bg-accent text-on-primary"
                    : "text-text-secondary hover:bg-surface-container hover:text-text-primary",
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.8} />
                <span className="flex-1">{label}</span>
                {count > 0 && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "min-w-5 rounded-md px-1.5 py-0.5 text-center text-[10px] font-bold",
                      active
                        ? "bg-on-primary/15"
                        : "bg-secondary text-on-secondary",
                    )}
                  >
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/friends"
          className="mt-8 rounded-2xl border border-border p-4 transition-colors hover:border-accent/50 hover:bg-surface"
        >
          <Radio className="mb-3 h-5 w-5 text-secondary" />
          <p className="font-display text-base font-semibold">
            Same people.
            <br />
            New conversations.
          </p>
          <span className="mt-3 inline-flex items-center gap-2 text-xs text-text-secondary">
            Find your circle <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </Link>
        <div className="mt-auto pt-8">
          <Link
            href="/settings"
            aria-current={pathname.startsWith("/settings") ? "page" : undefined}
            className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
          >
            <Settings className="h-4.5 w-4.5" />
            Settings
          </Link>
        </div>
      </div>
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-2">
          <Link
            href={user ? `/profile/${user.username}` : "/settings"}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1.5 transition-colors hover:bg-surface"
          >
            <UserAvatar
              src={user?.avatar_url}
              name={user?.display_name || "Your profile"}
              size="sm"
            />
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold">
                {user?.display_name || "Your space"}
              </span>
              <span className="block truncate text-[11px] text-text-secondary">
                {user ? `@${user.username}` : "Getting you connected…"}
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            title="Sign out"
            aria-label={signingOut ? "Signing out" : "Sign out"}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-error/10 hover:text-error disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
