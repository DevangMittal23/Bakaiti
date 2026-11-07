"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Phone, Video, ArrowUpRight, RefreshCw } from "lucide-react";
import { useMessages } from "@/hooks/use-messages";
import { usePresence } from "@/hooks/use-presence";
import { useTyping } from "@/hooks/use-typing";
import { useAuth } from "@/hooks/use-auth";
import { useCall } from "@/hooks/use-call";
import { markConversationRead } from "@/actions/messages";
import { UserAvatar } from "@/components/shared/user-avatar";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import type { Conversation } from "@/types";

export function ChatRoom({
  conversationId,
  initialConversation,
}: {
  conversationId: string;
  initialConversation: Conversation;
}) {
  const { user } = useAuth();
  const { startCall, activeCall } = useCall();
  const [startingCall, setStartingCall] = useState(false);
  const { isOnline } = usePresence();
  const { typingUsers, broadcastTyping } = useTyping(conversationId);
  const { messages, isLoading, hasMore, loadMore, sendMessage, error, reload } =
    useMessages(conversationId);
  useEffect(() => {
    void markConversationRead(conversationId).catch(() => {});
  }, [conversationId, messages.length]);
  const group = initialConversation.type === "group";
  const other = initialConversation.participants?.find(
    (p) => p.user_id !== user?.id,
  )?.user;
  const name = group
    ? initialConversation.name || "Group chat"
    : other?.display_name || "Bakaiti user";
  const online = !group && other && isOnline(other.id);
  const callParticipants = [
    ...(initialConversation.participants?.flatMap((participant) => participant.user ? [participant.user] : []) ?? []),
    ...(user ? [user] : []),
  ].filter((participant, index, all) => all.findIndex((candidate) => candidate.id === participant.id) === index);
  const beginCall = async (callType: "voice" | "video") => {
    setStartingCall(true);
    try {
      await startCall(conversationId, callType, callParticipants);
    } finally {
      setStartingCall(false);
    }
  };
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex min-h-20 shrink-0 items-center gap-3 border-b border-border bg-surface px-3 sm:px-5">
        <Link
          href="/chat"
          aria-label="Back to messages"
          className="flex h-11 w-10 shrink-0 items-center justify-center rounded-xl text-text-secondary hover:bg-surface-container lg:hidden"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <UserAvatar
          src={group ? initialConversation.avatar_url : other?.avatar_url}
          name={name}
          size="md"
          isOnline={Boolean(online)}
        />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-lg font-semibold">
            {name}
          </h1>
          <p className="mt-0.5 text-xs text-text-secondary">
            {group
              ? `${initialConversation.participants?.length || 0} people in this conversation`
              : online
                ? "Online now"
                : "Your conversation, at your pace"}
          </p>
        </div>
        {other && !group && (
          <Link
            aria-label={`View ${name}'s profile`}
            href={`/profile/${other.username}`}
            className="hidden h-11 w-11 items-center justify-center rounded-xl text-text-secondary hover:bg-surface-container sm:flex"
          >
            <ArrowUpRight className="h-5 w-5" />
          </Link>
        )}
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            disabled={startingCall || Boolean(activeCall)}
            aria-label="Start voice call"
            title="Start voice call"
            onClick={() => void beginCall("voice")}
            className="flex h-11 w-9 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-surface-container hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Phone className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={startingCall || Boolean(activeCall)}
            aria-label="Start video call"
            title="Start video call"
            onClick={() => void beginCall("video")}
            className="flex h-11 w-9 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-surface-container hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Video className="h-4 w-4" />
          </button>
        </div>
      </header>
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 border-b border-error/20 bg-error/5 px-5 py-3 text-xs text-error"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void reload()}
            className="flex min-h-10 shrink-0 items-center gap-2 font-semibold"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      )}
      {!messages.length && !isLoading && !error && (
        <div className="px-5 pt-8 text-center">
          <p className="font-display text-xl font-semibold">
            This is where it starts.
          </p>
          <p className="mt-2 text-xs text-text-secondary">
            A thought, a meme, or just a hello. Make it yours.
          </p>
        </div>
      )}
      <div className="relative min-h-0 flex-1">
        <MessageList
          messages={messages}
          isLoading={isLoading}
          hasMore={hasMore}
          loadMore={loadMore}
          typingUsers={typingUsers}
          currentUserId={user?.id}
        />
      </div>
      <MessageInput
        key={conversationId}
        onSendMessage={sendMessage}
        onTyping={broadcastTyping}
        conversationId={conversationId}
      />
    </div>
  );
}
