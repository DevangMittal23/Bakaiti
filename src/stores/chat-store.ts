import { create } from "zustand";
import { useAuthStore } from "@/stores/auth-store";
import type { Conversation, Message } from "@/types";

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Message[];
  isLoading: boolean;
  hasMore: boolean;
  totalUnread: number;
  drafts: Record<string, string>; // conversationId -> draft text
  setConversations: (conversations: Conversation[]) => void;
  setActiveConversation: (id: string | null) => void;
  setMessages: (messages: Message[]) => void;
  prependMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  removeMessage: (messageId: string) => void;
  setLoading: (loading: boolean) => void;
  setHasMore: (hasMore: boolean) => void;
  setTotalUnread: (count: number) => void;
  setDraft: (conversationId: string, text: string) => void;
  updateConversationPreview: (conversationId: string, message: Message) => void;
  markConversationRead: (conversationId: string) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  isLoading: false,
  hasMore: true,
  totalUnread: 0,
  drafts: {},

  setConversations: (conversations) => {
    const totalUnread = conversations.reduce(
      (acc, c) => acc + (c.unread_count || 0),
      0
    );
    set({ conversations, totalUnread });
  },

  setActiveConversation: (id) => set({ activeConversationId: id }),

  setMessages: (messages) =>
    set(() => {
      const seen = new Set<string>();
      const unique = messages.filter((m) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });
      return { messages: unique };
    }),

  prependMessages: (older) =>
    set((state) => {
      const combined = [...older, ...state.messages];
      const seen = new Set<string>();
      const unique = combined.filter((m) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });
      return { messages: unique };
    }),

  addMessage: (message) =>
    set((state) => {
      if (state.messages.some((m) => m.id === message.id)) return state;
      return { messages: [...state.messages, message] };
    }),

  updateMessage: (messageId, updates) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, ...updates } : m
      ),
    })),

  removeMessage: (messageId) =>
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== messageId),
    })),

  setLoading: (isLoading) => set({ isLoading }),
  setHasMore: (hasMore) => set({ hasMore }),
  setTotalUnread: (totalUnread) => set({ totalUnread }),

  setDraft: (conversationId, text) =>
    set((state) => ({
      drafts: { ...state.drafts, [conversationId]: text },
    })),

  updateConversationPreview: (conversationId, message) =>
    set((state) => {
      const updated = state.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              last_message: message,
              last_message_at: message.created_at,
              unread_count:
                state.activeConversationId === conversationId
                  ? 0
                  : (c.unread_count || 0) + (message.sender_id !== useAuthStore.getState().user?.id && c.last_message?.id !== message.id ? 1 : 0),
            }
          : c
      );
      // Sort by last_message_at descending
      updated.sort(
        (a, b) =>
          new Date(b.last_message_at).getTime() -
          new Date(a.last_message_at).getTime()
      );
      const totalUnread = updated.reduce(
        (acc, c) => acc + (c.unread_count || 0),
        0
      );
      return { conversations: updated, totalUnread };
    }),

  markConversationRead: (conversationId) =>
    set((state) => {
      const updated = state.conversations.map((c) =>
        c.id === conversationId ? { ...c, unread_count: 0 } : c
      );
      const totalUnread = updated.reduce(
        (acc, c) => acc + (c.unread_count || 0),
        0
      );
      return { conversations: updated, totalUnread };
    }),

  reset: () =>
    set({
      conversations: [],
      activeConversationId: null,
      messages: [],
      isLoading: false,
      hasMore: true,
      totalUnread: 0,
      drafts: {},
    }),
}));
