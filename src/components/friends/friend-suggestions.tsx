"use client";

import { useState } from "react";
import { UserAvatar } from "@/components/shared/user-avatar";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Check, Flame } from "lucide-react";
import Link from "next/link";
import type { User } from "@/types";

interface FriendSuggestionsProps {
  suggestions: User[];
  onSendRequest: (userId: string) => Promise<{ error?: string; success?: boolean } | void>;
}

export function FriendSuggestions({
  suggestions,
  onSendRequest,
}: FriendSuggestionsProps) {
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  const handleSend = async (userId: string) => {
    setLoadingIds((prev) => new Set([...prev, userId]));
    try {
      const res = await onSendRequest(userId);
      if (res && !res.error) {
        setSentIds((prev) => new Set([...prev, userId]));
      }
    } catch (err) {
      console.error("Error sending friend request:", err);
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  if (suggestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center glass-card">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 mb-4 ring-8 ring-accent/5">
          <Flame className="h-8 w-8 text-accent" />
        </div>
        <h3 className="text-lg font-semibold text-text-primary">All caught up!</h3>
        <p className="mt-2 text-sm text-text-secondary max-w-sm">
          No new connection recommendations right now. Check back later to discover more people!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {suggestions.map((person, idx) => {
          const isSent = sentIds.has(person.id);
          const isLoading = loadingIds.has(person.id);

          return (
            <motion.div
              key={person.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              layout
              className="glass-card flex items-center justify-between p-4 transition-all duration-200 hover:border-accent/10"
            >
              <Link
                href={`/profile/${person.username}`}
                className="flex items-center gap-3 min-w-0 group"
              >
                <UserAvatar
                  src={person.avatar_url}
                  name={person.display_name}
                  isOnline={true}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-text-primary truncate group-hover:text-accent transition-colors">
                    {person.display_name}
                  </p>
                  <p className="text-xs text-text-muted truncate">
                    @{person.username}
                  </p>
                  {person.bio ? (
                    <p className="text-[11px] text-text-muted truncate mt-0.5 max-w-[180px] sm:max-w-xs">
                      {person.bio}
                    </p>
                  ) : (
                    <p className="text-[11px] text-text-muted truncate mt-0.5">
                      Popular on Bakaiti
                    </p>
                  )}
                </div>
              </Link>

              {/* Action Button */}
              <button
                disabled={isSent || isLoading}
                onClick={() => handleSend(person.id)}
                className={`flex h-9 items-center justify-center gap-1.5 px-3 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 disabled:opacity-80 cursor-pointer ${
                  isSent
                    ? "bg-success/10 text-success cursor-default"
                    : "bg-accent text-white hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/25"
                }`}
              >
                {isSent ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Sent
                  </>
                ) : (
                  <>
                    <UserPlus className="h-3.5 w-3.5" />
                    Add Friend
                  </>
                )}
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
