"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Loader2,
  MessageCircle,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";
import { useConversations } from "@/hooks/use-conversations";
import { useAuth } from "@/hooks/use-auth";
import { useUIStore } from "@/stores/ui-store";
import { createDM } from "@/actions/conversations";
import { useRouter } from "next/navigation";
import { UserAvatar } from "@/components/shared/user-avatar";
import { ConversationItem } from "./conversation-item";
import type { Conversation, User } from "@/types";
import { cn } from "@/lib/utils";

export function ConversationList({
  initialRooms = [],
  friends = [],
}: {
  initialRooms?: Conversation[];
  friends?: User[];
}) {
  const { user } = useAuth();
  const { conversations, isLoading, error: loadError } = useConversations();
  const { openModal } = useUIStore();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | "unread" | "groups">("all");
  const [newChat, setNewChat] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const search = useRef<HTMLInputElement>(null);
  const rooms =
    isLoading && !conversations.length ? initialRooms : conversations;
  const term = query.trim().toLowerCase();
  const filtered = rooms.filter((room) => {
    const other = room.participants?.find((p) => p.user_id !== user?.id)?.user;
    return (
      `${room.name || ""} ${other?.display_name || ""} ${other?.username || ""}`
        .toLowerCase()
        .includes(term) &&
      (tab !== "groups" || room.type === "group") &&
      (tab !== "unread" || (room.unread_count || 0) > 0)
    );
  });
  const filteredFriends = friends.filter((friend) =>
    `${friend.display_name} ${friend.username}`.toLowerCase().includes(term),
  );
  const startChat = async (id: string) => {
    if (pending) return;
    setPending(id);
    setError(null);
    try {
      const result = await createDM(id);
      if (result.error) setError(result.error);
      else if (result.conversation)
        router.push(`/chat/${result.conversation.id}`);
    } catch {
      setError("Could not open the conversation. Try again.");
    } finally {
      setPending(null);
    }
  };
  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex gap-2 px-2">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-text-secondary"
          />
          <input
            ref={search}
            aria-label={newChat ? "Search friends" : "Search conversations"}
            placeholder={
              newChat ? "Find someone in your circle" : "Search your messages"
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-10 text-sm outline-none focus:border-accent"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear conversation search"
              onClick={() => {
                setQuery("");
                search.current?.focus();
              }}
              className="absolute right-0 top-0 flex h-11 w-10 items-center justify-center text-text-secondary hover:text-text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          type="button"
          aria-label={newChat ? "Back to inbox" : "New conversation"}
          aria-pressed={newChat}
          onClick={() => {
            setNewChat(!newChat);
            setQuery("");
            setError(null);
          }}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-on-primary transition-transform hover:brightness-110 active:scale-95"
        >
          {newChat ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
        </button>
      </div>
      {!newChat && (
        <div
          className="flex gap-1 border-b border-border px-2 pb-3"
          aria-label="Filter conversations"
        >
          {(["all", "unread", "groups"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={tab === value}
              onClick={() => setTab(value)}
              className={cn(
                "min-h-10 flex-1 rounded-lg px-3 text-xs font-semibold capitalize transition-colors",
                tab === value
                  ? "bg-accent/15 text-accent"
                  : "text-text-secondary hover:bg-surface-container",
              )}
            >
              {value}
              {value === "unread" &&
                rooms.some((r) => (r.unread_count || 0) > 0) && (
                  <span className="ml-1.5">
                    {rooms.filter((r) => (r.unread_count || 0) > 0).length}
                  </span>
                )}
            </button>
          ))}
        </div>
      )}
      {(error || loadError) && (
        <p role="alert" className="px-3 text-xs text-error">
          {error || loadError}
        </p>
      )}
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
        {newChat ? (
          <>
            <button
              type="button"
              onClick={() => openModal("create-group")}
              className="mb-3 flex min-h-12 w-full items-center gap-3 rounded-xl border border-border p-3 text-left text-sm font-semibold transition-colors hover:bg-surface-container"
            >
              <Users className="h-5 w-5 text-accent" />
              Make a group chat
              <ArrowUpRight className="ml-auto h-4 w-4 text-text-secondary" />
            </button>
            <p className="px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-text-secondary">
              Your people
            </p>
            {filteredFriends.map((friend) => (
              <button
                key={friend.id}
                type="button"
                disabled={pending !== null}
                onClick={() => void startChat(friend.id)}
                className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-surface-container disabled:opacity-50"
              >
                <UserAvatar
                  src={friend.avatar_url}
                  name={friend.display_name}
                  size="sm"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {friend.display_name}
                  </span>
                  <span className="block truncate text-xs text-text-secondary">
                    @{friend.username}
                  </span>
                </span>
                {pending === friend.id && (
                  <Loader2 className="h-4 w-4 animate-spin text-accent" />
                )}
              </button>
            ))}
            {!filteredFriends.length && (
              <div className="px-4 py-10 text-center">
                <p className="text-sm font-semibold">
                  {query
                    ? "No matching friends"
                    : "Every good chat starts somewhere."}
                </p>
                <p className="mt-2 text-xs leading-5 text-text-secondary">
                  {query
                    ? "Try another name or username."
                    : "Find your people, then start the conversation."}
                </p>
                <Link
                  href="/friends"
                  className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-accent"
                >
                  Find your circle
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </>
        ) : filtered.length ? (
          filtered.map((room) => (
            <ConversationItem key={room.id} conversation={room} />
          ))
        ) : (
          <div className="px-5 py-12 text-center">
            <MessageCircle className="mx-auto mb-4 h-8 w-8 text-accent" />
            <h2 className="font-display text-lg font-semibold">
              {query
                ? "No chats found"
                : tab === "unread"
                  ? "All caught up."
                  : tab === "groups"
                    ? "Your next group starts here."
                    : "A little quiet in here."}
            </h2>
            <p className="mt-2 text-xs leading-5 text-text-secondary">
              {query
                ? "Try a different name or clear your search."
                : "One hello can turn into a whole conversation."}
            </p>
            {!query && (
              <button
                type="button"
                onClick={() => setNewChat(true)}
                className="mt-5 min-h-11 rounded-xl border border-border px-4 text-xs font-semibold text-accent hover:bg-accent/10"
              >
                Start a conversation
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
