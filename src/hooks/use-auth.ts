"use client";

import { useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { useChatStore } from "@/stores/chat-store";
import { useNotificationStore } from "@/stores/notification-store";
import { useCallStore } from "@/stores/call-store";
import { useFeedStore } from "@/stores/feed-store";

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const signOut = useCallback(async () => {
    const { error } = await createClient().auth.signOut();
    if (error) throw error;
    useAuthStore.getState().reset();
    useChatStore.getState().reset();
    useNotificationStore.getState().reset();
    useCallStore.getState().reset();
    useFeedStore.getState().reset();
  }, []);
  return { user, isLoading, signOut };
}
