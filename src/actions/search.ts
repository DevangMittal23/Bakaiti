"use server";

import { createClient } from "@/lib/supabase/server";
import type { User, Post, Hashtag } from "@/types";

export async function getTrendingHashtags(limit: number = 5): Promise<Hashtag[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("search_post_hashtags", { search_query: "", result_limit: limit });

  if (error) return [];
  return (data || []) as Hashtag[];
}

export async function searchUsers(query: string) {
  // These characters have meaning in a PostgREST OR expression, not in a username.
  query = query.trim().slice(0, 100).replace(/[,().%_*\\\"]/g, " ").trim();
  if (!query) return { results: [] as User[] };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .limit(20);

  if (error) return { results: [], error: error.message };
  return { results: (data || []) as User[] };
}

export async function searchPosts(query: string) {
  query = query.trim().slice(0, 100).replace(/[%_\\]/g, " ").trim();
  if (!query) return { results: [] as Post[] };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(`
      *,
      author:users!posts_author_id_fkey(*)
    `)
    .ilike("content", `%${query}%`)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return { results: [], error: error.message };

  return { results: (data || []) as Post[] };
}

export async function searchHashtags(query: string): Promise<Hashtag[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("search_post_hashtags", { search_query: query, result_limit: 20 });

  if (error) return [];
  return (data || []) as Hashtag[];
}
