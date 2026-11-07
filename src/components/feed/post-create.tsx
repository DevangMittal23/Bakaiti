"use client";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Send, X } from "lucide-react";
import { createPost } from "@/actions/posts";
import { useAuth } from "@/hooks/use-auth";
import { useUpload } from "@/hooks/use-upload";
import { UserAvatar } from "@/components/shared/user-avatar";
import type { Post, PostVisibility } from "@/types";

export function PostCreate({
  onPostCreated,
}: {
  onPostCreated?: (post: Post) => void;
}) {
  const { user } = useAuth();
  const { uploadFile } = useUpload();
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<PostVisibility>("public");
  const [media, setMedia] = useState<{ file: File; url: string }[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const files = useRef<HTMLInputElement>(null);
  const urls = useRef<string[]>([]);
  const busy = useRef(false);
  useEffect(
    () => () => urls.current.forEach((url) => URL.revokeObjectURL(url)),
    [],
  );
  const remove = (index: number) => {
    URL.revokeObjectURL(media[index].url);
    urls.current = urls.current.filter((url) => url !== media[index].url);
    setMedia((items) => items.filter((_, i) => i !== index));
  };
  const submit = async () => {
    if (busy.current || !user || (!content.trim() && !media.length)) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      const mediaUrls: string[] = [];
      const mediaTypes: string[] = [];
      for (const item of media) {
        const ext = item.file.name.split(".").pop() || "bin";
        const url = await uploadFile(
          "post-media",
          `${user.id}/${crypto.randomUUID()}.${ext}`,
          item.file,
        );
        if (!url)
          throw new Error(
            "One of your attachments could not upload. Your post is still here; try again.",
          );
        mediaUrls.push(url);
        mediaTypes.push(
          item.file.type.startsWith("video/") ? "video" : "image",
        );
      }
      const result = await createPost({
        content: content.trim(),
        visibility,
        media_urls: mediaUrls,
        media_types: mediaTypes,
      });
      if (result.error) throw new Error(result.error);
      if (result.post) {
        onPostCreated?.(result.post);
        setContent("");
        urls.current.forEach((url) => URL.revokeObjectURL(url));
        urls.current = [];
        setMedia([]);
        if (files.current) files.current.value = "";
      }
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Your post could not be shared. Try again.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  return (
    <form
      noValidate
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      className="rounded-2xl border border-border bg-surface p-4 sm:p-5"
    >
      <div className="flex gap-3">
        <UserAvatar
          src={user?.avatar_url}
          name={user?.display_name || "You"}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <label htmlFor="new-post" className="sr-only">
            What is on your mind?
          </label>
          <textarea
            id="new-post"
            rows={2}
            maxLength={2000}
            disabled={pending}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`What’s the plot today${user?.display_name ? `, ${user.display_name.split(" ")[0]}` : ""}?`}
            className="min-h-14 w-full resize-none bg-transparent py-2 text-sm leading-6 outline-none placeholder:text-text-secondary sm:min-h-24"
          />
        </div>
      </div>
      {media.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-2">
          {media.map((item, index) => (
            <div
              key={item.url}
              className="relative overflow-hidden rounded-xl border border-border"
            >
              {item.file.type.startsWith("video/") ? (
                <video
                  src={item.url}
                  controls
                  className="h-32 w-full object-cover"
                />
              ) : (
                <img
                  src={item.url}
                  alt={`Attachment preview ${index + 1}`}
                  className="h-32 w-full object-cover"
                />
              )}
              <button
                type="button"
                aria-label={`Remove attachment ${index + 1}`}
                disabled={pending}
                onClick={() => remove(index)}
                className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-text-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      {error && (
        <p role="alert" className="mb-4 text-xs leading-5 text-error">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <input
          ref={files}
          type="file"
          multiple
          accept="image/*,video/*"
          aria-label="Post attachments"
          className="hidden"
          onChange={(event) => {
            const selected = Array.from(event.target.files || []);
            if (media.length + selected.length > 4) {
              setError("Choose up to four photos or videos.");
              return;
            }
            if (
              selected.some(
                (file) =>
                  !file.type.startsWith("image/") &&
                  !file.type.startsWith("video/"),
              )
            ) {
              setError("Choose image or video files.");
              return;
            }
            const next = selected.map((file) => ({
              file,
              url: URL.createObjectURL(file),
            }));
            urls.current.push(...next.map((item) => item.url));
            setMedia((current) => [...current, ...next]);
            setError(null);
          }}
        />
        <button
          type="button"
          aria-label="Add photos or videos"
          disabled={pending || media.length >= 4}
          onClick={() => files.current?.click()}
          className="flex h-11 w-10 items-center justify-center rounded-xl text-accent hover:bg-accent/10 disabled:opacity-40"
        >
          <ImagePlus className="h-5 w-5" />
        </button>
        <label htmlFor="post-visibility" className="sr-only">
          Who can see this post?
        </label>
        <select
          id="post-visibility"
          disabled={pending}
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as PostVisibility)}
          className="min-h-11 max-w-32 rounded-lg border border-border bg-background px-2 text-xs text-text-secondary"
        >
          <option value="public">Everyone</option>
          <option value="friends">Friends</option>
          <option value="private">Only me</option>
        </select>
        <span className="flex-1" />
        <span className="text-[10px] text-text-secondary">
          {content.length}/2000
        </span>
        <button
          type="submit"
          aria-label="Share a thought"
          disabled={pending || (!content.trim() && !media.length)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-xs font-bold text-on-primary transition-transform hover:brightness-110 active:scale-95 disabled:opacity-40"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          <span className="sm:hidden">{pending ? "Sharing…" : "Post"}</span>
          <span className="hidden sm:inline">
            {pending ? "Sharing…" : "Share a thought"}
          </span>
        </button>
      </div>
    </form>
  );
}
