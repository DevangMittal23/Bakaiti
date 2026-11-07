"use server";

import { createClient } from "@/lib/supabase/server";
import type { Message } from "@/types";
import { MESSAGES_PER_PAGE } from "@/lib/constants";

export async function getMessages(
  conversationId: string,
  cursor?: string,
  limit: number = MESSAGES_PER_PAGE
): Promise<{ messages: Message[]; hasMore: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { messages: [], hasMore: false };

  let query = supabase
    .from("messages")
    .select(
      `
      *,
      sender:users!messages_sender_id_fkey(*),
      reactions:message_reactions(
        id, emoji, user_id,
        user:users(id, username, display_name, avatar_url)
      )
    `
    )
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data: messages, error } = await query;

  if (error || !messages) return { messages: [], hasMore: false, error: "Could not load messages" };

  // Fetch reply_to messages if any
  const replyIds = messages
    .filter((m) => m.reply_to_id)
    .map((m) => m.reply_to_id!);

  let replyMap: Record<string, Message> = {};
  if (replyIds.length > 0) {
    const { data: replies } = await supabase
      .from("messages")
      .select("*, sender:users!messages_sender_id_fkey(*)")
      .in("id", replyIds);

    if (replies) {
      replyMap = Object.fromEntries(replies.map((r) => [r.id, r as Message]));
    }
  }

  const enriched = messages
    .map((m) => ({
      ...m,
      reply_to: m.reply_to_id ? replyMap[m.reply_to_id] || null : null,
    }))
    .reverse() as Message[];

  return {
    messages: enriched,
    hasMore: messages.length === limit,
  };
}

export async function sendMessage(
  conversationId: string,
  messageData: {
    content?: string;
    type?: string;
    media_url?: string | null;
    media_metadata?: Record<string, unknown> | null;
    gif_url?: string | null;
    reply_to_id?: string | null;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { data: message, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: messageData.content || null,
      type: messageData.type || "text",
      media_url: messageData.media_url || null,
      media_metadata: messageData.media_metadata || null,
      gif_url: messageData.gif_url || null,
      reply_to_id: messageData.reply_to_id || null,
    })
    .select("*, sender:users!messages_sender_id_fkey(*)")
    .single();

  if (error) return { error: error.message };

  // Update last_read_message_id for sender
  await supabase
    .from("participants")
    .update({ last_read_message_id: message.id })
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id);

  return { message: message as Message };
}

export async function editMessage(messageId: string, content: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("messages")
    .update({ content, is_edited: true })
    .eq("id", messageId)
    .eq("sender_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteMessage(
  messageId: string,
  deleteFor: "me" | "everyone" = "everyone"
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  if (deleteFor === "everyone") {
    const { error } = await supabase
      .from("messages")
      .update({
        is_deleted: true,
        deleted_for: "everyone",
        content: null,
        media_url: null,
        gif_url: null,
      })
      .eq("id", messageId)
      .eq("sender_id", user.id);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("messages")
      .update({ deleted_for: "me" })
      .eq("id", messageId)
      .eq("sender_id", user.id);

    if (error) return { error: error.message };
  }

  return { success: true };
}

export async function reactToMessage(messageId: string, emoji: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  // Check if user already reacted with this emoji
  const { data: existing } = await supabase
    .from("message_reactions")
    .select("id")
    .eq("message_id", messageId)
    .eq("user_id", user.id)
    .eq("emoji", emoji)
    .single();

  if (existing) {
    // Remove reaction
    const { error } = await supabase
      .from("message_reactions")
      .delete()
      .eq("id", existing.id);
    if (error) return { error: error.message };
    return { action: "removed" };
  }

  // Add reaction
  const { error } = await supabase.from("message_reactions").insert({
    message_id: messageId,
    user_id: user.id,
    emoji,
  });

  if (error) return { error: error.message };
  return { action: "added" };
}

export async function markConversationRead(conversationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  // Get the latest message in the conversation
  const { data: latestMessage } = await supabase
    .from("messages")
    .select("id")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (latestMessage) {
    await supabase
      .from("participants")
      .update({ last_read_message_id: latestMessage.id })
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id);
  }
}
