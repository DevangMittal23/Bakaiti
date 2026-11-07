"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Settings,
  UserPlus,
  UserCheck,
  MessageCircle,
  ArrowUpRight,
  CalendarDays,
  Loader2,
  Share2,
} from "lucide-react";
import { useFriendStatus } from "@/hooks/use-friend-status";
import { sendFriendRequest, acceptFriendRequest } from "@/actions/friendships";
import { UserAvatar } from "@/components/shared/user-avatar";
import { EnergyScoreCard } from "./energy-score-card";
import { PresenceSwitcher } from "./presence-switcher";
import type { User } from "@/types";
export function ProfileHeader({
  profile,
  isOwnProfile,
}: {
  profile: User;
  isOwnProfile: boolean;
}) {
  const { status, friendshipId, isRequester, isLoading, refresh } =
    useFriendStatus(profile.id);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const connect = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const result =
        status === "pending" && !isRequester && friendshipId
          ? await acceptFriendRequest(friendshipId)
          : await sendFriendRequest(profile.id);
      if (result.error) throw new Error(result.error);
      refresh();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not update your connection. Try again.",
      );
    } finally {
      setPending(false);
    }
  };
  const share = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/profile/${profile.username}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError(
        "Could not copy the profile link. Copy this page’s address instead.",
      );
    }
  };
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="relative h-28 overflow-hidden border-b border-border bg-accent/10 sm:h-36">
          <div
            aria-hidden="true"
            className="absolute -right-8 -top-16 font-display text-[150px] font-bold leading-none tracking-tighter text-accent/10 sm:text-[200px]"
          >
            hello.
          </div>
          <p className="absolute left-5 top-5 text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
            One of a kind. One of us.
          </p>
        </div>
        <div className="px-5 pb-6 sm:px-7">
          <div className="-mt-10 flex items-end justify-between gap-4">
            <div className="rounded-full border-[6px] border-surface bg-surface">
              <UserAvatar
                src={profile.avatar_url}
                name={profile.display_name}
                size="xl"
              />
            </div>
            <div className="mb-1 flex gap-2">
              <button
                type="button"
                aria-label="Copy profile link"
                onClick={() => void share()}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-border text-text-secondary hover:text-accent"
              >
                <Share2 className="h-4 w-4" />
              </button>
              {isOwnProfile ? (
                <Link
                  href="/settings/profile"
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-xs font-semibold hover:bg-surface-container"
                >
                  <Settings className="h-4 w-4" />
                  Edit profile
                </Link>
              ) : (
                <Link
                  href={`/chat?user=${encodeURIComponent(profile.username)}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-xs font-bold text-on-primary"
                >
                  <MessageCircle className="h-4 w-4" />
                  Message
                </Link>
              )}
            </div>
          </div>
          <h1 className="mt-4 break-words font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {profile.display_name}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            @{profile.username}
          </p>
          <p className="mt-4 max-w-xl whitespace-pre-wrap break-words text-sm leading-7 text-text-primary">
            {profile.bio ||
              (isOwnProfile
                ? "Your story, in your own words. Add a bio to introduce yourself."
                : "Still writing their story.")}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-text-secondary">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              Joined{" "}
              {new Date(profile.created_at).toLocaleDateString("en-IN", {
                month: "long",
                year: "numeric",
              })}
            </span>
            {copied && (
              <span role="status" className="text-accent">
                Profile link copied
              </span>
            )}
          </div>
          {!isOwnProfile && (
            <div className="mt-5">
              {status === "accepted" ? (
                <span className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-secondary/10 px-4 text-xs font-semibold text-secondary">
                  <UserCheck className="h-4 w-4" />
                  In your circle
                </span>
              ) : status === "blocked" ? (
                <p className="text-xs text-text-secondary">
                  This connection is unavailable.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => void connect()}
                  disabled={
                    pending ||
                    isLoading ||
                    (status === "pending" && isRequester)
                  }
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-accent/30 px-4 text-xs font-semibold text-accent hover:bg-accent/10 disabled:opacity-50"
                >
                  {pending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                  {status === "pending"
                    ? isRequester
                      ? "Request sent"
                      : "Accept friend request"
                    : "Add to your circle"}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
          {error && (
            <p role="alert" className="mt-3 text-xs text-error">
              {error}
            </p>
          )}
        </div>
      </section>
      <div className="grid gap-4 sm:grid-cols-2">
        <PresenceSwitcher
          initialPulse={profile.pulse_type}
          isOwnProfile={isOwnProfile}
          userId={profile.id}
        />
        <EnergyScoreCard score={profile.signal_score ?? 0} userId={profile.id} />
      </div>
    </div>
  );
}
