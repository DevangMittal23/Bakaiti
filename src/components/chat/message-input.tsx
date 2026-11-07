"use client";
import { useEffect, useRef, useState } from "react";
import { Paperclip, Send, Loader2 } from "lucide-react";
import { EmojiPicker } from "./emoji-picker";
import { GifPicker } from "./gif-picker";
import { VoiceRecorder } from "./voice-recorder";
import { MediaPreview } from "./media-preview";
import { useUpload } from "@/hooks/use-upload";
import { useAuth } from "@/hooks/use-auth";
import { useChatStore } from "@/stores/chat-store";
import { TYPING_DEBOUNCE_MS } from "@/lib/constants";
import { validateUpload } from "@/lib/media";
import type { MediaDimensions } from "@/lib/chat-media";
import type { Message } from "@/types";

type Payload = {
  content?: string;
  type?: string;
  media_url?: string | null;
  media_metadata?: Record<string, unknown> | null;
  gif_url?: string | null;
};
type Props = {
  onSendMessage: (
    data: Payload,
  ) => Promise<{ error?: string; message?: Message }>;
  onTyping: (typing: boolean) => void;
  conversationId: string;
};

export function MessageInput({
  onSendMessage,
  onTyping,
  conversationId,
}: Props) {
  const { user } = useAuth();
  const [text, setText] = useState(
    () => useChatStore.getState().drafts[conversationId] || "",
  );
  const [attachment, setAttachment] = useState<{ file: File; id: string } | null>(null);
  const file = attachment?.file || null;
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { uploadFile, isUploading, progress } = useUpload();
  const selectedFile = useRef<File | null>(null);
  const dimensions = useRef<(MediaDimensions & { file: File }) | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busy = useRef(false);
  const clearAttachment = () => {
    if (busy.current) return;
    selectedFile.current = null;
    dimensions.current = null;
    setAttachment(null);
    if (input.current) input.current.value = "";
    textarea.current?.focus();
  };
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const changeText = (value: string) => {
    setText(value);
    useChatStore.getState().setDraft(conversationId, value);
    onTyping(Boolean(value.trim()));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onTyping(false), TYPING_DEBOUNCE_MS);
  };
  const submit = async (
    extra?: Payload,
    voice?: { blob: Blob; duration: number },
  ) => {
    if (busy.current || !user || (!extra && !voice && !text.trim() && !file))
      return;
    busy.current = true;
    setSending(true);
    setError(null);
    onTyping(false);
    try {
      let payload: Payload = extra || {
        content: voice ? undefined : text.trim() || undefined,
        type: "text",
      };
      if ((!extra && file) || voice) {
        const attachment = voice
          ? new File([voice.blob], "voice.webm", {
              type: voice.blob.type || "audio/webm",
            })
          : file!;
        const ext = attachment.name.split(".").pop() || "bin";
        const url = await uploadFile(
          "message-media",
          `${user.id}/${crypto.randomUUID()}.${ext}`,
          attachment,
        );
        if (!url)
          throw new Error("Your attachment could not be uploaded. Try again.");
        const mediaDimensions = !voice && dimensions.current?.file === attachment
          ? dimensions.current
          : null;
        payload = {
          ...payload,
          type: voice
            ? "audio"
            : attachment.type.startsWith("image/")
              ? "image"
              : attachment.type.startsWith("video/")
                ? "video"
                : attachment.type.startsWith("audio/")
                  ? "audio"
                : "file",
          media_url: url,
          media_metadata: {
            filename: attachment.name,
            size: attachment.size,
            ...(mediaDimensions ? { width: mediaDimensions.width, height: mediaDimensions.height } : {}),
            ...(voice ? { duration: voice.duration } : {}),
          },
        };
      }
      const result = await onSendMessage(payload);
      if (result.error) throw new Error(result.error);
      if (!extra && !voice) {
        changeText("");
        selectedFile.current = null;
        dimensions.current = null;
        setAttachment(null);
        if (input.current) input.current.value = "";
      }
      textarea.current?.focus();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Message not sent. Your draft is still here; try again.",
      );
    } finally {
      busy.current = false;
      setSending(false);
    }
  };
  return (
    <div className="shrink-0 border-t border-border bg-surface p-3 pb-safe sm:p-4">
      {error && (
        <p role="alert" className="mb-3 px-2 text-xs leading-5 text-error">
          {error}
        </p>
      )}
      <form
        noValidate
        aria-busy={sending}
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className="rounded-2xl border border-border bg-background p-2 transition-colors focus-within:border-accent/60"
      >
        {attachment && (
          <MediaPreview key={attachment.id} file={attachment.file} disabled={sending} onClear={clearAttachment} onDimensions={(value) => {
            if (selectedFile.current === attachment.file) dimensions.current = { ...value, file: attachment.file };
          }} />
        )}
        <label htmlFor={`message-${conversationId}`} className="sr-only">
          Message
        </label>
        <textarea
          ref={textarea}
          id={`message-${conversationId}`}
          value={text}
          maxLength={5000}
          rows={2}
          disabled={sending}
          placeholder="Say something worth sending…"
          onChange={(event) => {
            changeText(event.target.value);
            event.target.style.height = "auto";
            event.target.style.height = `${Math.min(event.target.scrollHeight, 180)}px`;
          }}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              void submit();
            }
          }}
          className="max-h-44 min-h-14 w-full resize-none bg-transparent px-3 py-2 text-sm leading-6 outline-none placeholder:text-text-secondary disabled:opacity-60"
        />
        <div className="flex items-center gap-1">
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,audio/webm,audio/mp4,application/pdf"
            aria-label="Message attachment"
            disabled={sending}
            className="hidden"
            onChange={(event) => {
              const selected = event.target.files?.[0];
              event.target.value = "";
              if (!selected || busy.current) return;
              try {
                validateUpload("message-media", `${user?.id || "selection"}/preview`, selected, user?.id || "selection");
                selectedFile.current = selected;
                dimensions.current = null;
                setAttachment({ file: selected, id: crypto.randomUUID() });
                setError(null);
              } catch (failure) {
                setError(failure instanceof Error ? failure.message : "This file cannot be attached.");
              }
            }}
          />
          <button
            type="button"
            aria-label="Attach a file"
            disabled={sending}
            onClick={() => input.current?.click()}
            className="flex h-11 w-10 items-center justify-center rounded-xl text-text-secondary hover:bg-surface-container hover:text-accent disabled:opacity-40"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <fieldset
            disabled={sending}
            className="flex items-center gap-0.5 disabled:opacity-40"
          >
            <legend className="sr-only">Message extras</legend>
            <EmojiPicker
              onSelect={(emoji) => {
                changeText(text + emoji);
                textarea.current?.focus();
              }}
            />
            <GifPicker
              onSelect={(url) => void submit({ type: "gif", gif_url: url })}
            />
            <VoiceRecorder
              onSend={(blob, duration) =>
                void submit(undefined, { blob, duration })
              }
            />
          </fieldset>
          <span className="min-w-0 flex-1" />
          <button
            type="submit"
            aria-label="Send message"
            disabled={sending || (!text.trim() && !file)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-on-primary transition-transform hover:brightness-110 active:scale-95 disabled:opacity-35"
          >
            {sending || isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        {sending && (
          <div className="px-3 pb-2 text-xs text-text-secondary" role="status">
            {isUploading ? <>
              <span>Uploading attachment · {progress}%</span>
              <progress aria-label="Attachment upload progress" value={progress} max={100} className="mt-2 block h-1 w-full accent-accent" />
            </> : <span>Sending message…</span>}
          </div>
        )}
      </form>
      <p className="mt-2 hidden px-2 text-[10px] text-text-secondary sm:block">
        Enter to send · Shift + Enter for a new line
      </p>
    </div>
  );
}
