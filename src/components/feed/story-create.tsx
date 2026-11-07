"use client";

import { useState, useRef, useTransition, useEffect } from "react";
import { ImagePlus, X, Send, Loader2 } from "lucide-react";
import { createStory } from "@/actions/stories";
import { useUpload } from "@/hooks/use-upload";
import { useUIStore } from "@/stores/ui-store";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function StoryCreate({
  onCreated,
  onCancel,
}: { onCreated?: () => void; onCancel?: () => void } = {}) {
  const { user } = useAuth();
  const { closeModal } = useUIStore();
  const [caption, setCaption] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  const close = onCancel || closeModal;
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const { uploadFile, isUploading, progress } = useUpload();
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      setError("Choose a file smaller than 50 MB.");
      return;
    }

    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      setError("Please select an image or video file.");
      return;
    }

    setMediaFile(file);
    setError(null);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveMedia = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setMediaFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = () => {
    if (!mediaFile || !user || submitting.current) return;
    submitting.current = true;
    setError(null);

    startTransition(async () => {
      try {
        const ext = mediaFile.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}_story.${ext}`;
        const isVideo = mediaFile.type.startsWith("video/");

        // Upload media file using storage bucket "post-media" for stories too
        const url = await uploadFile("post-media", fileName, mediaFile);

        if (!url) {
          throw new Error("Failed to upload media");
        }

        const res = await createStory({
          media_url: url,
          media_type: isVideo ? "video" : "image",
          caption: caption.trim() || null,
        });

        if (res.error) {
          setError(res.error);
        } else {
          toast.success(
            "Story posted successfully! It will expire in 24 hours.",
          );
          handleRemoveMedia();
          setCaption("");
          if (onCreated) onCreated();
          else close();
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to post story.");
      } finally {
        submitting.current = false;
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-text-primary">Create Story</h3>
        <button
          type="button"
          aria-label="Close story creation"
          onClick={close}
          className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-hover text-text-secondary cursor-pointer"
        >
          <X className="h-4.5 w-4.5" />
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        aria-label="Story attachment"
        className="hidden"
        onChange={handleMediaSelect}
      />
      {!previewUrl ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center border-2 border-dashed border-border hover:border-accent hover:bg-surface/20 rounded-xl h-48 sm:h-64 cursor-pointer transition-colors"
        >
          <ImagePlus className="h-10 w-10 text-text-muted mb-2" />
          <span className="text-sm font-semibold text-text-secondary">
            Select Photo or Video
          </span>
          <span className="text-xs text-text-muted mt-1">
            Max file size: 50MB
          </span>
        </button>
      ) : (
        <div className="relative rounded-xl overflow-hidden bg-black h-64 flex items-center justify-center">
          {mediaFile?.type.startsWith("video/") ? (
            <video
              src={previewUrl}
              className="max-h-full max-w-full object-contain"
              controls
              muted
            />
          ) : (
            <img
              src={previewUrl}
              alt="Story Preview"
              className="max-h-full max-w-full object-contain"
            />
          )}
          <button
            type="button"
            aria-label="Remove story attachment"
            onClick={handleRemoveMedia}
            className="absolute right-3 top-3 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {isUploading && (
        <div className="bg-surface border border-border p-2.5 rounded-xl">
          <div className="flex justify-between items-center text-xs text-text-muted mb-1">
            <span>Uploading...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-border h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-accent h-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div>
        <label
          htmlFor="story-caption"
          className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2"
        >
          Caption (Optional)
        </label>
        <input
          id="story-caption"
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value.slice(0, 200))}
          placeholder="Add a caption..."
          className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-text-primary focus:border-accent focus:outline-none transition-colors"
        />
        <div className="text-[10px] text-text-muted text-right mt-1.5">
          {caption.length}/200
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-3 mt-4">
        <Button
          variant="secondary"
          onClick={close}
          disabled={isPending || isUploading}
        >
          Cancel
        </Button>
        <Button
          variant="glow"
          onClick={handleSubmit}
          disabled={!mediaFile || isPending || isUploading}
        >
          {isPending || isUploading ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="h-4.5 w-4.5 animate-spin" />
              Posting...
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Send className="h-4 w-4" />
              Post Story
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
