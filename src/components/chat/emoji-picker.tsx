"use client";
import { Smile } from "lucide-react";
import { Theme } from "emoji-picker-react";
import dynamic from "next/dynamic";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
const Picker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
  loading: () => (
    <p className="p-8 text-sm text-text-secondary">Loading emojis…</p>
  ),
});
export function EmojiPicker({
  onSelect,
}: {
  onSelect: (emoji: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Add an emoji"
          className="flex h-11 w-9 items-center justify-center rounded-xl text-text-secondary hover:bg-surface-container hover:text-accent"
        >
          <Smile className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="start"
        className="max-w-[calc(100vw-24px)] overflow-hidden border-border bg-surface p-0"
      >
        <Picker
          width={300}
          height={350}
          theme={Theme.DARK}
          onEmojiClick={(data) => onSelect(data.emoji)}
          lazyLoadEmojis
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
