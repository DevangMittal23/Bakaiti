"use client";

import Link from "next/link";
import { Heart, MessageCircle } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { UserAvatar } from "@/components/shared/user-avatar";

interface PostResultCardProps {
  post: {
    id: string;
    content: string | null;
    created_at: string;
    likes_count: number;
    comments_count: number;
    author?: {
      id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
    } | null;
  };
  searchQuery: string;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedQuery})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="rounded bg-accent/20 px-0.5 text-accent">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

export function PostResultCard({ post, searchQuery }: PostResultCardProps) {
  const author = post.author;

  return (
    <Link
      href={`/post/${post.id}`}
      className="glass-card group block p-4 transition-all duration-200 hover:bg-surface-hover"
    >
      {/* Author */}
      {author && (
        <div className="mb-2 flex items-center gap-2">
          <UserAvatar
            src={author.avatar_url}
            name={author.display_name}
            size="xs"
          />
          <span className="text-xs font-semibold text-text-primary group-hover:text-accent transition-colors">
            {author.display_name}
          </span>
          <span className="text-xs text-text-muted">
            · {formatRelativeTime(post.created_at)}
          </span>
        </div>
      )}

      {/* Content */}
      {post.content && (
        <p className="line-clamp-3 text-sm text-text-primary leading-relaxed">
          {highlightMatch(post.content, searchQuery)}
        </p>
      )}

      {/* Stats */}
      <div className="mt-3 flex items-center gap-4">
        <span className="flex items-center gap-1 text-xs text-text-muted">
          <Heart className="h-3.5 w-3.5" />
          {post.likes_count}
        </span>
        <span className="flex items-center gap-1 text-xs text-text-muted">
          <MessageCircle className="h-3.5 w-3.5" />
          {post.comments_count}
        </span>
      </div>
    </Link>
  );
}
