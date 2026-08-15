"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useConversations } from "@/hooks/use-conversations";
import { ConversationItem } from "./conversation-item";
import {
  MessageCircle,
  Search,
  MessageSquareCode,
  Users2,
  Plus,
  X,
  Loader2,
  UsersRound,
} from "lucide-react";
import type { Conversation, User } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { UserAvatar } from "@/components/shared/user-avatar";
import { createDM } from "@/actions/conversations";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useUIStore } from "@/stores/ui-store";

interface ConversationListProps {
  initialRooms?: Conversation[];
  friends?: User[];
}

type TabType = "all" | "unread" | "groups";

export function ConversationList({
  initialRooms = [],
  friends = [],
}: ConversationListProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { conversations } = useConversations();
  const { openModal } = useUIStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [showNewChat, setShowNewChat] = useState(false);
  const [startingDmFor, setStartingDmFor] = useState<string | null>(null);

  const displayConversations =
    conversations.length > 0 ? conversations : initialRooms;

  const filteredConversations = useMemo(() => {
    return displayConversations.filter((convo) => {
      const otherParticipant = convo.participants?.find(
        (p) => p.user_id !== user?.id
      );
      const displayName =
        convo.type === "group"
          ? convo.name || "Group Chat"
          : otherParticipant?.user?.display_name || "HUDdang User";
      const username =
        convo.type === "dm" ? otherParticipant?.user?.username || "" : "";

      const matchesSearch =
        displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        username.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (activeTab === "unread") return (convo.unread_count || 0) > 0;
      if (activeTab === "groups") return convo.type === "group";
      return true;
    });
  }, [displayConversations, searchQuery, activeTab, user]);

  // Filter friends by search query when in new-chat mode
  const filteredFriends = useMemo(() => {
    if (!searchQuery) return friends;
    return friends.filter(
      (f) =>
        f.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [friends, searchQuery]);

  const groupCount = useMemo(
    () => displayConversations.filter((c) => c.type === "group").length,
    [displayConversations]
  );

  const unreadCount = useMemo(
    () =>
      displayConversations.filter((c) => (c.unread_count || 0) > 0).length,
    [displayConversations]
  );

  const handleStartDM = async (friendId: string) => {
    setStartingDmFor(friendId);
    try {
      const res = await createDM(friendId);
      if (res?.conversation) {
        toast.success("Opening chat...");
        router.push(`/chat/${res.conversation.id}`);
      } else if (res?.error) {
        toast.error(res.error);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to start chat");
      console.error("Error starting DM:", err);
    } finally {
      setStartingDmFor(null);
      setShowNewChat(false);
    }
  };

  const isEmpty = displayConversations.length === 0;

  return (
    <div className="flex flex-col h-full space-y-4 overflow-hidden">
      {/* Header row with search + new chat button */}
      <div className="space-y-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-text-muted">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              placeholder={
                showNewChat ? "Search friends..." : "Search conversations..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-border bg-surface/50 py-3 pl-11 pr-4 text-sm text-text-primary placeholder-text-muted outline-none transition-all duration-300 focus:border-accent focus:bg-surface focus:shadow-glow"
            />
          </div>
          {/* New Chat Toggle */}
          <button
            onClick={() => {
              setShowNewChat((v) => !v);
              setSearchQuery("");
            }}
            title={showNewChat ? "Back to conversations" : "New chat"}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition-all duration-200 cursor-pointer active:scale-95 ${
              showNewChat
                ? "border-accent bg-accent text-white"
                : "border-border bg-surface/50 text-text-muted hover:border-accent hover:text-accent"
            }`}
          >
            {showNewChat ? (
              <X className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Tab Pills — only show when not in new-chat mode */}
        {!showNewChat && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {(["all", "unread", "groups"] as const).map((tab) => {
              const isActive = activeTab === tab;
              let badge = null;
              if (tab === "unread" && unreadCount > 0) badge = unreadCount;
              else if (tab === "groups" && groupCount > 0) badge = groupCount;

              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide uppercase transition-all duration-200 active:scale-95 cursor-pointer ${
                    isActive
                      ? "bg-accent/15 text-accent shadow-sm"
                      : "text-text-secondary hover:bg-surface hover:text-text-primary"
                  }`}
                >
                  {tab === "all" && "All"}
                  {tab === "unread" && "Unread"}
                  {tab === "groups" && "Groups"}
                  {badge !== null && (
                    <span
                      className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold ${
                        isActive
                          ? "bg-accent text-white"
                          : "bg-surface-hover text-text-secondary"
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                  {isActive && (
                    <motion.div
                      layoutId="chat-active-tab-indicator"
                      className="absolute inset-0 -z-10 rounded-xl border border-accent/30"
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2 scrollbar-thin">
        <AnimatePresence mode="popLayout" initial={false}>
          {/* NEW CHAT: Action options + Friends list */}
          {showNewChat ? (
            <>
              {/* Action row: New Group */}
              <motion.div
                key="new-chat-actions"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex gap-2 mb-1"
              >
                <button
                  onClick={() => {
                    setShowNewChat(false);
                    openModal("create-group");
                  }}
                  className="flex flex-1 items-center gap-2 rounded-xl border border-border/50 bg-surface/40 px-3 py-2.5 text-xs font-semibold text-text-secondary hover:border-accent/40 hover:bg-surface/70 hover:text-accent transition-all duration-200 cursor-pointer"
                >
                  <UsersRound className="h-4 w-4 shrink-0" />
                  New Group Chat
                </button>
              </motion.div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted px-1 mb-1">Direct Messages</p>

              {filteredFriends.length > 0 ? (
                filteredFriends.map((friend, idx) => (
                  <motion.button
                    key={friend.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.18, delay: idx * 0.04 }}
                    onClick={() => handleStartDM(friend.id)}
                    disabled={startingDmFor === friend.id}
                    className="w-full flex items-center gap-3 rounded-2xl border border-border/40 bg-surface/30 p-3.5 text-left transition-all duration-200 hover:border-accent/30 hover:bg-surface/60 hover:shadow-lg active:scale-[0.98] cursor-pointer disabled:opacity-60"
                  >
                    <UserAvatar
                      src={friend.avatar_url}
                      name={friend.display_name}
                      size="sm"
                      isOnline={true}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-primary truncate">
                        {friend.display_name}
                      </p>
                      <p className="text-xs text-text-muted truncate">
                        @{friend.username}
                      </p>
                    </div>
                    {startingDmFor === friend.id ? (
                      <Loader2 className="h-4 w-4 text-accent animate-spin shrink-0" />
                    ) : (
                      <MessageCircle className="h-4 w-4 text-text-muted group-hover:text-accent shrink-0" />
                    )}
                  </motion.button>
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-12 text-center"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface mb-4 border border-border/50">
                    <Users2 className="h-6 w-6 text-text-secondary" />
                  </div>
                  <h3 className="text-sm font-semibold text-text-primary">
                    {searchQuery ? "No friends found" : "No friends yet"}
                  </h3>
                  <p className="mt-1 max-w-xs text-xs text-text-muted leading-relaxed">
                    {searchQuery
                      ? "Try a different name."
                      : "Add friends on the Friends page to start chatting!"}
                  </p>
                </motion.div>
              )}
            </>
          ) : // CONVERSATIONS LIST
          filteredConversations.length > 0 ? (
            filteredConversations.map((convo) => (
              <motion.div
                key={convo.id}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <ConversationItem conversation={convo} />
              </motion.div>
            ))
          ) : (
            // EMPTY STATE — prompt user to start a chat
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface mb-4 border border-border/50">
                {activeTab === "groups" ? (
                  <Users2 className="h-7 w-7 text-text-secondary" />
                ) : activeTab === "unread" ? (
                  <MessageSquareCode className="h-7 w-7 text-text-secondary" />
                ) : (
                  <MessageCircle className="h-7 w-7 text-text-secondary" />
                )}
              </div>
              <h3 className="text-sm font-semibold text-text-primary">
                {activeTab === "groups"
                  ? "No group chats yet"
                  : activeTab === "unread"
                  ? "No unread messages"
                  : "No conversations yet"}
              </h3>
              <p className="mt-1 max-w-xs text-xs text-text-muted leading-relaxed">
                {searchQuery
                  ? "Try checking your spelling."
                  : activeTab === "groups"
                  ? "Create a group with the + button!"
                  : "Tap the + button to start a new chat with a friend."}
              </p>
              {!searchQuery && activeTab === "all" && friends.length > 0 && (
                <button
                  onClick={() => setShowNewChat(true)}
                  className="mt-4 flex items-center gap-2 rounded-xl bg-accent/10 px-4 py-2 text-xs font-semibold text-accent hover:bg-accent/20 transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Start a conversation
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
