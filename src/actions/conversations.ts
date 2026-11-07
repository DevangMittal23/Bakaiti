"use server";

import { createClient } from "@/lib/supabase/server";
import type { Conversation } from "@/types";
import { CONVERSATIONS_PER_PAGE } from "@/lib/constants";

export async function createDM(otherUserId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  // Check if DM already exists between these two users
  const { data: existingConvos } = await supabase
    .from("participants")
    .select("conversation_id")
    .eq("user_id", user.id);

  if (existingConvos) {
    for (const p of existingConvos) {
      const { data: otherParticipant } = await supabase
        .from("participants")
        .select("conversation_id")
        .eq("conversation_id", p.conversation_id)
        .eq("user_id", otherUserId)
        .single();

      if (otherParticipant) {
        const { data: convo } = await supabase
          .from("conversations")
          .select("*")
          .eq("id", p.conversation_id)
          .eq("type", "dm")
          .single();

        if (convo) return { conversation: convo as Conversation };
      }
    }
  }

  // Create new DM conversation
  const { data: conversation, error } = await supabase
    .from("conversations")
    .insert({
      type: "dm",
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error) return { error: error.message };

  // Add both participants
  const { error: participantError } = await supabase
    .from("participants")
    .insert([
      {
        conversation_id: conversation.id,
        user_id: user.id,
        role: "member",
      },
      {
        conversation_id: conversation.id,
        user_id: otherUserId,
        role: "member",
      },
    ]);

  if (participantError) {
    await supabase.from("conversations").delete().eq("id", conversation.id);
    return { error: "Could not create this conversation. Please try again." };
  }

  return { conversation: conversation as Conversation };
}

export async function createGroup(name: string, memberIds: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { data: conversation, error } = await supabase
    .from("conversations")
    .insert({
      type: "group",
      name,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error) return { error: error.message };

  // Add creator as admin and members
  const participantInserts = [
    {
      conversation_id: conversation.id,
      user_id: user.id,
      role: "admin" as const,
    },
    ...memberIds.map((id) => ({
      conversation_id: conversation.id,
      user_id: id,
      role: "member" as const,
    })),
  ];

  const { error: participantError } = await supabase
    .from("participants")
    .insert(participantInserts);
  if (participantError) {
    await supabase.from("conversations").delete().eq("id", conversation.id);
    return { error: "Could not add the group members. Please try again." };
  }

  // Notify members
  const notificationInserts = memberIds.map((id) => ({
    recipient_id: id,
    actor_id: user.id,
    type: "group_invite" as const,
    entity_type: "conversation" as const,
    entity_id: conversation.id,
    body: `added you to "${name}"`,
  }));

  await supabase.from("notifications").insert(notificationInserts);

  return { conversation: conversation as Conversation };
}

export async function getConversations(): Promise<Conversation[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Get conversations where user is a participant
  const { data: participantRows } = await supabase
    .from("participants")
    .select("conversation_id")
    .eq("user_id", user.id);

  if (!participantRows || participantRows.length === 0) return [];

  const conversationIds = participantRows.map((p) => p.conversation_id);

  const { data: conversations } = await supabase
    .from("conversations")
    .select(
      `
      *,
      participants (
        id, user_id, role, last_read_message_id, joined_at,
        user:users(*)
      )
    `,
    )
    .in("id", conversationIds)
    .order("last_message_at", { ascending: false })
    .limit(CONVERSATIONS_PER_PAGE);

  if (!conversations) return [];

  // Get last message for each conversation + unread counts
  const enriched = await Promise.all(
    conversations.map(async (convo) => {
      // Last message
      const { data: lastMessages } = await supabase
        .from("messages")
        .select("*, sender:users(*)")
        .eq("conversation_id", convo.id)
        .order("created_at", { ascending: false })
        .limit(1);

      const lastMessage = lastMessages?.[0] || null;

      // Unread count
      const participant = convo.participants?.find(
        (p: { user_id: string }) => p.user_id === user.id,
      );
      let unreadCount = 0;

      let unreadQuery = supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", convo.id)
        .neq("sender_id", user.id)
        .eq("is_deleted", false);
      if (participant?.last_read_message_id) {
        const { data: marker, error: markerError } = await supabase
          .from("messages")
          .select("created_at")
          .eq("id", participant.last_read_message_id)
          .eq("conversation_id", convo.id)
          .maybeSingle();
        if (markerError) throw new Error("Could not load the read position");
        if (marker)
          unreadQuery = unreadQuery.gt("created_at", marker.created_at);
      }
      const { count, error: unreadError } = await unreadQuery;
      if (unreadError) throw new Error("Could not load unread messages");
      unreadCount = count || 0;

      return {
        ...convo,
        last_message: lastMessage,
        unread_count: unreadCount,
      } as Conversation;
    }),
  );

  return enriched;
}

export async function getConversation(
  conversationId: string,
): Promise<Conversation | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("conversations")
    .select(
      `
      *,
      participants (
        id, user_id, role, last_read_message_id, joined_at,
        user:users(*)
      )
    `,
    )
    .eq("id", conversationId)
    .single();

  return data as Conversation | null;
}

export async function updateGroupConversation(
  conversationId: string,
  updates: { name?: string; avatar_url?: string | null },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("conversations")
    .update(updates)
    .eq("id", conversationId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function addGroupMember(conversationId: string, userId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("participants").insert({
    conversation_id: conversationId,
    user_id: userId,
    role: "member",
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function removeGroupMember(
  conversationId: string,
  userId: string,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("participants")
    .delete()
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);

  if (error) return { error: error.message };
  return { success: true };
}
