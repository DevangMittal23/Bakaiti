"use server";

import { createClient } from "@/lib/supabase/server";
import type { Friendship, FriendshipStatus, User } from "@/types";

export async function sendFriendRequest(addresseeId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };
  if (user.id === addresseeId) return { error: "Cannot friend yourself" };

  // Check if friendship already exists in either direction
  const { data: existing } = await supabase
    .from("friendships")
    .select("id, status")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${user.id})`
    )
    .single();

  if (existing) {
    if (existing.status === "blocked") return { error: "User is blocked" };
    if (existing.status === "accepted")
      return { error: "Already friends" };
    if (existing.status === "pending")
      return { error: "Request already pending" };
  }

  const { error } = await supabase.from("friendships").insert({
    requester_id: user.id,
    addressee_id: addresseeId,
    status: "pending",
  });

  if (error) return { error: error.message };

  // Create notification for addressee
  await supabase.from("notifications").insert({
    recipient_id: addresseeId,
    actor_id: user.id,
    type: "friend_request",
    entity_type: "user",
    entity_id: user.id,
    body: "sent you a friend request",
  });

  return { success: true };
}

export async function acceptFriendRequest(friendshipId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { data: friendship, error: fetchError } = await supabase
    .from("friendships")
    .select("*")
    .eq("id", friendshipId)
    .eq("addressee_id", user.id)
    .eq("status", "pending")
    .single();

  if (fetchError || !friendship) return { error: "Request not found" };

  const { error } = await supabase
    .from("friendships")
    .update({ status: "accepted" })
    .eq("id", friendshipId);

  if (error) return { error: error.message };

  // Notify requester
  await supabase.from("notifications").insert({
    recipient_id: friendship.requester_id,
    actor_id: user.id,
    type: "friend_accept",
    entity_type: "user",
    entity_id: user.id,
    body: "accepted your friend request",
  });

  return { success: true };
}

export async function respondToFriendRequest(actorId: string, accept: boolean) {
  const relationship = await getFriendshipStatus(actorId);
  if (!relationship.friendshipId || relationship.status !== "pending" || relationship.isRequester) {
    return { error: "This request is no longer available." };
  }
  return accept ? acceptFriendRequest(relationship.friendshipId) : rejectFriendRequest(relationship.friendshipId);
}

export async function rejectFriendRequest(friendshipId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("id", friendshipId)
    .eq("addressee_id", user.id)
    .eq("status", "pending");

  if (error) return { error: error.message };
  return { success: true };
}

export async function removeFriend(friendshipId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("id", friendshipId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function blockUser(targetUserId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  // Delete any existing friendship and create a blocked one
  await supabase
    .from("friendships")
    .delete()
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${user.id})`
    );

  const { error } = await supabase.from("friendships").insert({
    requester_id: user.id,
    addressee_id: targetUserId,
    status: "blocked",
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function getFriendshipStatus(
  otherUserId: string
): Promise<{
  status: FriendshipStatus | null;
  friendshipId: string | null;
  isRequester: boolean;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user)
    return { status: null, friendshipId: null, isRequester: false };

  const { data } = await supabase
    .from("friendships")
    .select("id, status, requester_id")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},addressee_id.eq.${user.id})`
    )
    .single();

  if (!data) return { status: null, friendshipId: null, isRequester: false };

  return {
    status: data.status as FriendshipStatus,
    friendshipId: data.id,
    isRequester: data.requester_id === user.id,
  };
}

export async function getFriends(): Promise<User[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: friendships } = await supabase
    .from("friendships")
    .select(
      `
      id,
      requester_id,
      addressee_id,
      requester:users!friendships_requester_id_fkey(*),
      addressee:users!friendships_addressee_id_fkey(*)
    `
    )
    .eq("status", "accepted")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

  if (!friendships) return [];

  return friendships
    .map((f) => {
      const friend = f.requester_id === user.id ? f.addressee : f.requester;
      return friend as unknown as User;
    })
    .sort((a, b) => (b.signal_score ?? 0) - (a.signal_score ?? 0));
}

export async function getPendingRequests(): Promise<
  (Friendship & { requester: User })[]
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from("friendships")
    .select(
      `
      *,
      requester:users!friendships_requester_id_fkey(*)
    `
    )
    .eq("addressee_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return (data || []) as unknown as (Friendship & { requester: User })[];
}

export async function getSuggestedUsers(
  limit: number = 10
): Promise<User[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Get IDs of users we already have a friendship with
  const { data: existingFriendships } = await supabase
    .from("friendships")
    .select("requester_id, addressee_id")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

  const excludeIds = new Set<string>([user.id]);
  existingFriendships?.forEach((f) => {
    excludeIds.add(f.requester_id);
    excludeIds.add(f.addressee_id);
  });

  const { data } = await supabase
    .from("users")
    .select("*")
    .not("id", "in", `(${Array.from(excludeIds).join(",")})`)
    .limit(limit);

  return data || [];
}
