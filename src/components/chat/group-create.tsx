"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { X, Search, Check, Loader2 } from "lucide-react";
import { getFriends } from "@/actions/friendships";
import { createGroup } from "@/actions/conversations";
import { useUIStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/shared/user-avatar";
import { toast } from "sonner";
import type { User } from "@/types";
import { useRouter } from "next/navigation";

export function GroupCreate() {
  const { closeModal } = useUIStore();
  const router = useRouter();
  const [groupName, setGroupName] = useState("");
  const [friends, setFriends] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function loadFriends() {
      try {
        const list = await getFriends();
        setFriends(list);
      } catch {
        setError(
          "Could not load your circle. Close this dialog and try again.",
        );
      } finally {
        setLoading(false);
      }
    }
    loadFriends();
  }, []);

  const handleToggleFriend = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = () => {
    if (submitting.current) return;
    if (!groupName.trim()) {
      setError("Please enter a group name");
      return;
    }
    if (selectedIds.size === 0) {
      setError("Please select at least one member");
      return;
    }

    submitting.current = true;
    setError(null);
    startTransition(async () => {
      try {
        const res = await createGroup(
          groupName.trim(),
          Array.from(selectedIds),
        );
        if (res.error) {
          setError(res.error);
        } else if (res.conversation) {
          toast.success(`Group "${groupName}" created!`);
          closeModal();
          router.push(`/chat/${res.conversation.id}`);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to create group");
      } finally {
        submitting.current = false;
      }
    });
  };

  const filteredFriends = friends.filter(
    (friend) =>
      friend.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.username.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-text-primary">
          Create Group Chat
        </h3>
        <button
          type="button"
          aria-label="Close group creation"
          onClick={closeModal}
          className="rounded-full hover:bg-surface-hover p-1 text-text-secondary cursor-pointer"
        >
          <X className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* Group name input */}
      <div>
        <label
          htmlFor="group-name"
          className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2"
        >
          Group Name
        </label>
        <input
          id="group-name"
          disabled={isPending}
          type="text"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value.slice(0, 100))}
          placeholder="Enter group name..."
          className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-text-primary focus:border-accent focus:outline-none transition-colors"
        />
      </div>

      {/* Friends search */}
      <div>
        <label
          htmlFor="group-friends-search"
          className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2"
        >
          Add Members ({selectedIds.size} selected)
        </label>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            ref={searchInput}
            id="group-friends-search"
            disabled={isPending}
            type="text"
            placeholder="Search friends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 w-full bg-surface border border-border rounded-lg py-2 pl-9 pr-11 text-xs outline-none focus:border-accent"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear friend search"
              onClick={() => {
                setSearchQuery("");
                searchInput.current?.focus();
              }}
              className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-text-secondary"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Friends list */}
        <div className="h-48 overflow-y-auto scrollbar-thin space-y-1">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-accent" />
            </div>
          ) : filteredFriends.length > 0 ? (
            filteredFriends.map((friend) => {
              const isSelected = selectedIds.has(friend.id);
              return (
                <button
                  type="button"
                  disabled={isPending}
                  aria-pressed={isSelected}
                  key={friend.id}
                  onClick={() => handleToggleFriend(friend.id)}
                  className="flex min-h-12 w-full items-center justify-between p-2 rounded-xl text-left hover:bg-surface/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      src={friend.avatar_url}
                      name={friend.display_name}
                      size="sm"
                    />
                    <div>
                      <p className="text-xs font-semibold text-text-primary">
                        {friend.display_name}
                      </p>
                      <p className="text-[10px] text-text-muted">
                        @{friend.username}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`h-4.5 w-4.5 rounded-md border flex items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-accent border-accent text-white"
                        : "border-border"
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="flex h-full items-center justify-center text-text-muted text-xs">
              No friends found.
            </div>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-3 mt-4">
        <Button variant="secondary" onClick={closeModal} disabled={isPending}>
          Cancel
        </Button>
        <Button
          variant="glow"
          onClick={handleCreate}
          disabled={!groupName.trim() || selectedIds.size === 0 || isPending}
        >
          {isPending ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="h-4.5 w-4.5 animate-spin" />
              Creating...
            </span>
          ) : (
            "Create Group"
          )}
        </Button>
      </div>
    </div>
  );
}
