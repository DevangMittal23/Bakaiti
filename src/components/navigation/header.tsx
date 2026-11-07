"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  Bell,
  Search,
  MessageCircle,
  ChevronDown,
  ArrowUpRight,
  Settings,
  Radio,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { usePulse } from "@/hooks/use-pulse";
import { useNotificationStore } from "@/stores/notification-store";
import { UserAvatar } from "@/components/shared/user-avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { PULSE_CONFIG } from "@/types";
import { PulsePicker } from "@/components/shared/pulse-picker";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();
  const [pulseOpen, setPulseOpen] = useState(false);
  const { user } = useAuth();
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const { pulseType, updatePulse, removePulse } = usePulse(user?.id || "");
  const isThread = pathname.startsWith("/chat/");
  const sectionTitle = pathname.startsWith("/chat")
    ? "Your conversations"
    : pathname.startsWith("/discover")
      ? "A little discovery"
      : pathname.startsWith("/friends")
        ? "Your inner circle"
        : pathname.startsWith("/notifications")
          ? "The latest"
          : pathname.startsWith("/profile")
            ? "Your people, up close"
            : pathname.startsWith("/settings")
              ? "Make it yours"
              : pathname.startsWith("/search")
                ? "Find your frequency"
                : "Good things happen here";
  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-30 border-b border-border bg-background/95 pt-safe [backdrop-filter:blur(var(--glass-blur))] lg:left-[240px]",
        isThread && "hidden lg:block",
      )}
    >
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:h-[72px] lg:px-8">
        <Link
          href="/feed"
          aria-label="Bakaiti home"
          className="flex items-center gap-2 lg:hidden"
        >
          <span className="flex h-8 w-8 -rotate-6 items-center justify-center rounded-lg bg-secondary text-on-secondary">
            <MessageCircle className="h-4.5 w-4.5" strokeWidth={2.5} />
          </span>
          <span className="font-display text-2xl font-bold tracking-[-0.06em]">
            bakaiti<span className="text-secondary">.</span>
          </span>
        </Link>
        <p className="hidden truncate text-sm font-medium text-text-secondary lg:block">
          {sectionTitle}
          <span className="ml-2 text-secondary" aria-hidden="true">
            ✳
          </span>
        </p>
        <div className="flex items-center gap-1 sm:gap-2">
          {user && (
            <>
              <button
                type="button"
                onClick={() => setPulseOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={pulseOpen}
                className="hidden min-h-10 items-center gap-2 rounded-full border border-border px-3 text-xs text-text-secondary transition-colors hover:border-accent/50 hover:text-text-primary sm:inline-flex"
                aria-label="Set your Pulse"
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    pulseType ? "bg-secondary" : "bg-text-muted",
                  )}
                />
                {pulseType ? PULSE_CONFIG[pulseType].label : "Set your Pulse"}
                <ChevronDown className="h-3 w-3" />
              </button>
              <PulsePicker
                isOpen={pulseOpen}
                onClose={() => setPulseOpen(false)}
                currentPulse={pulseType}
                onSetPulse={updatePulse}
                onClearPulse={removePulse}
              />
            </>
          )}
          <Link
            href="/search"
            aria-label="Search people and posts"
            title="Search"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-surface-container hover:text-text-primary"
          >
            <Search className="h-5 w-5" />
          </Link>
          <Link
            href="/notifications"
            aria-label={
              unreadCount ? `Activity, ${unreadCount} unread` : "Activity"
            }
            title="Activity"
            className="relative hidden h-11 w-11 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-surface-container hover:text-text-primary sm:flex"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-2.5 top-2 h-1.5 w-1.5 rounded-full bg-secondary" />
            )}
          </Link>
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Open your account menu"
                  className="flex min-h-11 items-center gap-2 rounded-xl p-1 transition-colors hover:bg-surface-container"
                >
                  <UserAvatar
                    src={user.avatar_url}
                    name={user.display_name || user.username}
                    size="sm"
                  />
                  <ChevronDown className="hidden h-3 w-3 text-text-secondary sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="min-w-52 rounded-xl p-2"
              >
                <DropdownMenuLabel className="max-w-64 truncate text-xs text-text-secondary">
                  @{user.username}
                </DropdownMenuLabel>
                <DropdownMenuItem
                  className="min-h-11 rounded-lg"
                  onSelect={() => setPulseOpen(true)}
                >
                  <Radio className="mr-2 h-4 w-4" />
                  Set your Pulse
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="min-h-11 rounded-lg">
                  <Link href={`/profile/${user.username}`}>
                    <ArrowUpRight className="mr-2 h-4 w-4" />
                    Your profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="min-h-11 rounded-lg">
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="min-h-11 rounded-lg">
                  <Link href="/friends">
                    <Radio className="mr-2 h-4 w-4" />
                    Your circle
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
