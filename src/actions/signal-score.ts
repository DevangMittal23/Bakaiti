"use server";

import { createClient } from "@/lib/supabase/server";
import type { SignalScoreHistory, User } from "@/types";

export async function getSignalScore(userId: string): Promise<number> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .select("signal_score")
    .eq("id", userId)
    .single();

  if (error) throw new Error(error.message);
  return data.signal_score ?? 0;
}

export async function getSignalScoreHistory(
  userId: string,
  days = 7
): Promise<SignalScoreHistory[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("signal_score_history")
    .select("*")
    .eq("user_id", userId)
    .order("calculated_at", { ascending: false })
    .limit(days);

  if (error) throw new Error(error.message);
  return data as SignalScoreHistory[];
}

// Get top users by signal score for Explore page "Blazing Right Now" section
export async function getTopSignalUsers(limit = 10): Promise<User[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("signal_score", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data || []) as User[];
}
