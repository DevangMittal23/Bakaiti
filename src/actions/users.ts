"use server";

import { createClient } from "@/lib/supabase/server";
import type { User } from "@/types";
import { SEARCH_RESULTS_PER_PAGE } from "@/lib/constants";

export async function getUser(userId: string): Promise<User | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();
  return data;
}

export async function getUserByUsername(
  username: string
): Promise<User | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("username", username)
    .single();
  return data;
}

export async function updateProfile(updates: {
  display_name?: string;
  bio?: string | null;
  avatar_url?: string | null;
  username?: string;
  pulse_type?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", user.id);

  if (error) return { error: error.message };

  return { success: true };
}

export async function searchUsers(
  query: string,
  limit: number = SEARCH_RESULTS_PER_PAGE
): Promise<User[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("users")
    .select("*")
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .neq("id", user?.id || "")
    .limit(limit);

  return data || [];
}

export async function updateOnlineStatus() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase
    .from("users")
    .update({ online_at: new Date().toISOString() })
    .eq("id", user.id);
}

export async function checkUsernameAvailable(
  username: string,
  currentUserId: string
): Promise<boolean> {
  const supabase = await createClient();

  // Basic format validation first (matches the DB constraint)
  const isValidFormat = /^[a-zA-Z0-9_]{3,30}$/.test(username);
  if (!isValidFormat) return false;

  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("username", username)
    .neq("id", currentUserId) // Exclude the current user's own username from the "taken" check
    .maybeSingle();

  if (error) throw new Error(error.message);

  return data === null; // null means no one else has this username = available
}

