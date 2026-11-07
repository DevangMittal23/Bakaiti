"use client";

import { useState, useCallback, useRef } from "react";
import { getFeedPosts } from "@/actions/posts";
import type { Post } from "@/types";

export function useFeed(initialPosts: Post[] = [], initialHasMore = false) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);
  const pending = useRef(false);

  const loadPosts = useCallback(async (cursor?: string) => {
    if (cursor && pending.current) return;
    const id = ++request.current;
    pending.current = true;
    setIsLoading(true);
    setError(null);
    try {
      const result = await getFeedPosts(cursor);
      if (id !== request.current) return;
      if (result.error) throw new Error(result.error);
      setPosts((previous) => {
        const all = cursor ? [...previous, ...result.posts] : result.posts;
        return Array.from(new Map(all.map((post) => [post.id, post])).values());
      });
      setHasMore(result.hasMore);
    } catch {
      if (id === request.current)
        setError(
          "Could not load the feed. Your posts are still here. Try again.",
        );
    } finally {
      if (id === request.current) {
        pending.current = false;
        setIsLoading(false);
      }
    }
  }, []);

  const loadMore = useCallback(() => {
    const last = posts.at(-1);
    if (hasMore && !pending.current && last) void loadPosts(last.created_at);
  }, [hasMore, posts, loadPosts]);
  const addPost = useCallback(
    (post: Post) =>
      setPosts((previous) => [
        post,
        ...previous.filter((item) => item.id !== post.id),
      ]),
    [],
  );
  const removePost = useCallback(
    (id: string) =>
      setPosts((previous) => previous.filter((post) => post.id !== id)),
    [],
  );
  const updatePost = useCallback(
    (id: string, changes: Partial<Post>) =>
      setPosts((previous) =>
        previous.map((post) =>
          post.id === id ? { ...post, ...changes } : post,
        ),
      ),
    [],
  );
  return {
    posts,
    isLoading,
    isInitialLoad: false,
    hasMore,
    error,
    loadPosts,
    loadMore,
    addPost,
    removePost,
    updatePost,
  };
}
