"use client";
import { cn } from "@/lib/utils";
import { ConversationList } from "./conversation-list";
import type { Conversation, User } from "@/types";

export function ChatLayout({
  rooms,
  friends = [],
  activeRoomId,
  children,
}: {
  rooms: Conversation[];
  friends?: User[];
  activeRoomId?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 overflow-hidden border-border bg-surface lg:rounded-2xl lg:border">
      <aside
        aria-label="Conversation inbox"
        className={cn(
          "flex w-full shrink-0 flex-col border-r border-border lg:w-[320px] xl:w-[350px]",
          activeRoomId && "hidden lg:flex",
        )}
      >
        <div className="px-5 pb-4 pt-6">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-secondary">
            <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
            Your corner of the internet
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Messages<span className="text-accent">.</span>
          </h1>
        </div>
        <div className="min-h-0 flex-1 px-3 pb-3">
          <ConversationList initialRooms={rooms} friends={friends} />
        </div>
      </aside>
      <section
        aria-label="Conversation"
        className={cn(
          "relative min-w-0 flex-1 flex-col bg-background",
          activeRoomId ? "flex" : "hidden lg:flex",
        )}
      >
        {children}
      </section>
    </div>
  );
}
