import type { Metadata } from "next";
import {
  getConversations,
  createDM as getOrCreateDM,
} from "@/actions/conversations";
import { getUserByUsername } from "@/actions/users";
import { getFriends } from "@/actions/friendships";
import { ChatLayout } from "@/components/chat/chat-layout";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Chat",
  description: "Your conversations on Bakaiti.",
};

interface ChatPageProps {
  searchParams: Promise<{ user?: string }>;
}

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const { user: username } = await searchParams;

  if (username) {
    const profile = await getUserByUsername(username);
    if (profile) {
      const res = await getOrCreateDM(profile.id);
      if (res && res.conversation) {
        redirect(`/chat/${res.conversation.id}`);
      }
    }
  }

  const [conversations, friends] = await Promise.all([
    getConversations(),
    getFriends(),
  ]);

  return (
    <ChatLayout rooms={conversations} friends={friends}>
      <div className="flex flex-1 flex-col items-center justify-center text-center p-6 bg-surface/5">
        <div className="max-w-xs space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-2xl text-accent shadow-sm shadow-accent/5 ring-8 ring-accent/5">
            💬
          </div>
          <h3 className="text-base font-semibold text-text-primary">
            Your Messages
          </h3>
          <p className="text-xs text-text-muted">
            {friends.length > 0
              ? "Tap the + button to start chatting with a friend."
              : "Add friends first, then come back to start a conversation."}
          </p>
        </div>
      </div>
    </ChatLayout>
  );
}
