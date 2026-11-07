"use client";
import { useState } from "react";
import { StoryViewer } from "./story-viewer";
import { UserAvatar } from "@/components/shared/user-avatar";
import { cn } from "@/lib/utils";
import type { Story } from "@/types";
export function StoryCircle({
  author,
  stories,
  onStoriesUpdated,
}: {
  author: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  stories: Story[];
  onStoriesUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const unread = stories.some((story) => !story.is_viewed);
  return (
    <>
      <button
        type="button"
        aria-label={`View ${author.display_name}'s stories${unread ? ", new stories" : ""}`}
        onClick={() => setOpen(true)}
        className="group flex w-16 shrink-0 flex-col items-center gap-2"
      >
        <span
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-full border-2 transition-transform group-hover:scale-105",
            unread ? "border-secondary" : "border-border",
          )}
        >
          <UserAvatar
            src={author.avatar_url}
            name={author.display_name}
            size="md"
          />
        </span>
        <span className="w-full truncate text-center text-[10px] font-semibold text-text-secondary">
          {author.display_name.split(" ")[0]}
        </span>
      </button>
      {open && (
        <StoryViewer
          author={author}
          stories={stories}
          onClose={() => {
            setOpen(false);
            onStoriesUpdated();
          }}
        />
      )}
    </>
  );
}
