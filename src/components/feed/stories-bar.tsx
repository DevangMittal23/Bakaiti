"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { getActiveStories } from "@/actions/stories";
import { useAuth } from "@/hooks/use-auth";
import { UserAvatar } from "@/components/shared/user-avatar";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { StoryCircle } from "./story-circle";
import { StoryCreate } from "./story-create";
export function StoriesBar() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<
    Awaited<ReturnType<typeof getActiveStories>>
  >([]);
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    try {
      setGroups(await getActiveStories());
      setError(false);
    } catch {
      setError(true);
    }
  }, []);
  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    void getActiveStories()
      .then((data) => {
        if (active) setGroups(data);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [user?.id]);
  return (
    <section
      aria-label="Stories"
      className="rounded-2xl border border-border bg-surface px-4 py-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-secondary">
          Little moments. Big energy.
        </h2>
        <span className="text-[10px] text-text-secondary">24 hours only</span>
      </div>
      <div className="mt-4 flex gap-4 overflow-x-auto pb-1">
        <button
          ref={trigger}
          type="button"
          onClick={() => setOpen(true)}
          className="group flex min-w-16 shrink-0 flex-col items-center gap-2"
        >
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-accent/60 bg-accent/5 transition-colors group-hover:bg-accent/15">
            <UserAvatar
              src={user?.avatar_url}
              name={user?.display_name || "You"}
              size="md"
            />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-accent text-on-primary">
              <Plus className="h-3.5 w-3.5" />
            </span>
          </span>
          <span className="text-[10px] font-semibold text-text-secondary">
            Your story
          </span>
        </button>
        {groups.map((group) => (
          <StoryCircle
            key={group.author.id}
            author={group.author}
            stories={group.stories}
            onStoriesUpdated={() => void load()}
          />
        ))}
        {!groups.length && !error && (
          <p className="my-auto max-w-40 text-xs leading-5 text-text-secondary">
            Give your circle a glimpse of your day.
          </p>
        )}
      </div>
      {error && (
        <button
          type="button"
          onClick={() => void load()}
          className="mt-3 min-h-10 text-xs text-error"
        >
          Stories could not load. Try again.
        </button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            trigger.current?.focus();
          }}
        >
          <DialogTitle>Share a little moment</DialogTitle>
          <DialogDescription>
            A photo or video for your circle. Stories disappear after 24 hours.
          </DialogDescription>
          <StoryCreate
            onCancel={() => setOpen(false)}
            onCreated={() => {
              setOpen(false);
              void load();
            }}
          />
        </DialogContent>
      </Dialog>
    </section>
  );
}
