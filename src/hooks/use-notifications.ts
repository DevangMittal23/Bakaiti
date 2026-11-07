"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useNotificationStore } from "@/stores/notification-store";
import { useAuthStore } from "@/stores/auth-store";
import { getNotifications, getUnreadCount } from "@/actions/notifications";
import { useCallStore } from "@/stores/call-store";
import { conversationRoomName } from "@/lib/security/calls";
import type { CallParticipant } from "@/types";

export function useNotifications() {
  const supabase = createClient();
  const userId = useAuthStore((state) => state.user?.id);
  const {
    notifications,
    unreadCount,
    isLoading,
    setNotifications,
    setUnreadCount,
    setLoading,
  } = useNotificationStore();
  useEffect(() => {
    if (!userId) return;
    let current = true;
    let revision = 0;
    const load = async () => {
      const request = ++revision;
      try {
        const [result, count] = await Promise.all([
          getNotifications(),
          getUnreadCount(),
        ]);
        if (current && request === revision) {
          setNotifications(result.notifications);
          setUnreadCount(count);
        }
      } finally {
        if (current && request === revision) setLoading(false);
      }
    };
    void load().catch(() => {
      /* Keep the existing list on a transient refresh failure. */
    });
    const channel = supabase
      .channel(`notifications:${userId}:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        async (payload: { new: Record<string, unknown>; eventType: string }) => {
          const notification = payload.new as {
            type?: string;
            actor_id?: string | null;
            entity_type?: string | null;
            entity_id?: string | null;
            body?: string | null;
          };
          const callType = notification.body?.match(/^is calling you \((voice|video) call\)$/)?.[1];
          if (
            payload.eventType === "INSERT" &&
            notification.type === "message" &&
            notification.entity_type === "conversation" &&
            notification.entity_id &&
            notification.actor_id &&
            (callType === "voice" || callType === "video") &&
            !useCallStore.getState().activeCall &&
            !useCallStore.getState().incomingCall
          ) {
            const { data: roomMembers } = await supabase
              .from("participants")
              .select("user_id")
              .eq("conversation_id", notification.entity_id);
            const memberIds = (roomMembers ?? []).map((member: { user_id: string }) => member.user_id);
            const { data: profileData } = memberIds.length
              ? await supabase.from("users").select("id, username, display_name, avatar_url").in("id", memberIds)
              : { data: [] };
            const profiles = (profileData ?? []) as CallParticipant[];
            const caller = profiles?.find((profile) => profile.id === notification.actor_id);
            if (caller && current) {
              useCallStore.getState().setIncomingCall({
                roomName: conversationRoomName(notification.entity_id),
                conversationId: notification.entity_id,
                callType,
                callerName: caller.display_name,
                callerAvatar: caller.avatar_url,
                participants: profiles.map((profile) => ({
                  id: profile.id,
                  username: profile.username,
                  display_name: profile.display_name,
                  avatar_url: profile.avatar_url,
                })),
              });
            }
          }
          void load().catch(() => {});
        },
      )
      .subscribe();
    return () => {
      current = false;
      void supabase.removeChannel(channel);
    };
  }, [supabase, userId, setNotifications, setUnreadCount, setLoading]);
  return { notifications, unreadCount, isLoading };
}
