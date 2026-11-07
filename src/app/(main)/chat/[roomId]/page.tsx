import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getConversation, getConversations } from "@/actions/conversations";
import { getFriends } from "@/actions/friendships";
import { getMessages } from "@/actions/messages";
import { ChatRoom } from "@/components/chat/chat-room";
import { ChatLayout } from "@/components/chat/chat-layout";

interface ChatRoomPageProps {
  params: Promise<{ roomId: string }>;
}

export async function generateMetadata({
  params,
}: ChatRoomPageProps): Promise<Metadata> {
  const { roomId } = await params;
  const conversation = await getConversation(roomId);

  if (!conversation) {
    return { title: "Chat not found" };
  }

  return {
    title: conversation.name ? `${conversation.name} - Chat` : "Chat",
    description: `Conversation on Bakaiti.`,
  };
}

export default async function ChatRoomPage({ params }: ChatRoomPageProps) {
  const { roomId } = await params;
  const conversation = await getConversation(roomId);

  if (!conversation) {
    notFound();
  }

  const [conversations, friends] = await Promise.all([
    getConversations(),
    getFriends(),
  ]);

  return (
    <ChatLayout rooms={conversations} friends={friends} activeRoomId={roomId}>
      <ChatRoom conversationId={roomId} initialConversation={conversation} />
    </ChatLayout>
  );
}
