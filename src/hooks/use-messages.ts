"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import type {
  RealtimePostgresInsertPayload,
  RealtimePostgresUpdatePayload,
} from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useChatStore } from "@/stores/chat-store";
import {
  getMessages,
  sendMessage as sendMessageAction,
} from "@/actions/messages";
import type { Message } from "@/types";
import { CHANNEL_PREFIX } from "@/lib/constants";

export function useMessages(conversationId: string) {
  const supabase = createClient();
  const state = useChatStore();
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);
  const paginationPending = useRef(false);
  const isCurrent = useCallback(
    () => useChatStore.getState().activeConversationId === conversationId,
    [conversationId],
  );

  const reload = useCallback(async () => {
    const id = ++request.current;
    useChatStore.getState().setLoading(true);
    try {
      const result = await getMessages(conversationId);
      if (!isCurrent() || id !== request.current) return;
      if (result.error) throw new Error(result.error);
      setError(null);
      const store = useChatStore.getState();
      // Preserve inserts that arrived while the initial history request was in flight.
      const messages = [
        ...result.messages,
        ...store.messages.filter(
          (message) => !result.messages.some((item) => item.id === message.id),
        ),
      ];
      store.setMessages(
        messages.sort((a, b) => a.created_at.localeCompare(b.created_at)),
      );
      store.setHasMore(result.hasMore);
    } catch {
      if (isCurrent() && id === request.current)
        setError("Could not load this conversation. Try again.");
    } finally {
      if (isCurrent() && id === request.current)
        useChatStore.getState().setLoading(false);
    }
  }, [conversationId, isCurrent]);

  useEffect(() => {
    const store = useChatStore.getState();
    store.setActiveConversation(conversationId);
    store.setMessages([]);
    let current = true;
    // Defer initial work so a Strict Mode cleanup can cancel it before requests start.
    queueMicrotask(() => {
      if (current) void reload();
    });
    const pendingRequests = request;
    return () => {
      current = false;
      pendingRequests.current++;
      if (useChatStore.getState().activeConversationId === conversationId)
        useChatStore.getState().setActiveConversation(null);
    };
  }, [conversationId, reload]);

  useEffect(() => {
    let subscribed = true;
    const channel = supabase
      .channel(`${CHANNEL_PREFIX.MESSAGES}:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload: RealtimePostgresInsertPayload<Message>) => {
          const { data } = await supabase
            .from("messages")
            .select("*, sender:users!messages_sender_id_fkey(*)")
            .eq("id", payload.new.id)
            .single();
          if (subscribed && isCurrent() && data) {
            useChatStore.getState().addMessage(data as Message);
            useChatStore
              .getState()
              .updateConversationPreview(conversationId, data as Message);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: RealtimePostgresUpdatePayload<Message>) => {
          if (subscribed && isCurrent())
            useChatStore
              .getState()
              .updateMessage(payload.new.id, payload.new as Message);
        },
      )
      .subscribe();
    return () => {
      subscribed = false;
      void supabase.removeChannel(channel);
    };
  }, [conversationId, supabase, isCurrent]);

  const loadMore = useCallback(async () => {
    const store = useChatStore.getState();
    const oldest = store.messages[0];
    if (
      !isCurrent() ||
      !store.hasMore ||
      store.isLoading ||
      paginationPending.current ||
      !oldest
    )
      return;
    paginationPending.current = true;
    store.setLoading(true);
    try {
      const result = await getMessages(conversationId, oldest.created_at);
      if (!isCurrent()) return;
      if (result.error) throw new Error(result.error);
      useChatStore.getState().prependMessages(result.messages);
      useChatStore.getState().setHasMore(result.hasMore);
    } catch {
      if (isCurrent()) setError("Could not load older messages. Try again.");
    } finally {
      paginationPending.current = false;
      if (isCurrent()) useChatStore.getState().setLoading(false);
    }
  }, [conversationId, isCurrent]);

  const sendMessage = useCallback(
    async (data: Parameters<typeof sendMessageAction>[1]) => {
      try {
        const result = await sendMessageAction(conversationId, data);
        if (result.message) {
          const store = useChatStore.getState();
          if (isCurrent()) store.addMessage(result.message);
          store.updateConversationPreview(conversationId, result.message);
        }
        return result;
      } catch {
        return {
          error: "Message could not be sent. Your draft is still here.",
        };
      }
    },
    [conversationId, isCurrent],
  );

  return {
    messages:
      state.activeConversationId === conversationId ? state.messages : [],
    isLoading: state.isLoading,
    hasMore: state.hasMore,
    error,
    reload,
    loadMore,
    sendMessage,
  };
}
