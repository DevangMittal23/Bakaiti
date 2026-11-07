"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useChatStore } from "@/stores/chat-store";
import { useAuthStore } from "@/stores/auth-store";
import { getConversations } from "@/actions/conversations";

export function useConversations() {
  const supabase = createClient();
  const userId = useAuthStore((state) => state.user?.id);
  const { conversations, totalUnread, setConversations } = useChatStore();
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!userId) return;
    let current = true;
    let revision = 0;
    const load = async () => {
      const request = ++revision;
      try {
        const result = await getConversations();
        if (current && request === revision) {
          setConversations(result);
          setError(null);
        }
      } catch {
        if (current && request === revision)
          setError("Could not load conversations. Refresh to try again.");
      } finally {
        if (current && request === revision) setLoadedFor(userId);
      }
    };
    void load();
    const channel = supabase
      .channel(`conversations:${userId}:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversations" },
        () => {
          void load();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "participants",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void load();
        },
      )
      .subscribe();
    return () => {
      current = false;
      void supabase.removeChannel(channel);
    };
  }, [supabase, setConversations, userId]);
  return {
    conversations,
    totalUnread,
    isLoading: !userId || loadedFor !== userId,
    error,
  };
}
