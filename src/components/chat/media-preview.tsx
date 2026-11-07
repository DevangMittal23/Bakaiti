"use client";

import { useEffect, useRef, useState } from "react";
import { X, FileText, Film, ImageIcon, Music2 } from "lucide-react";
import { attachmentKind, formatAttachmentSize, type MediaDimensions } from "@/lib/chat-media";

interface MediaPreviewProps {
  file: File;
  onClear: () => void;
  onDimensions?: (dimensions: MediaDimensions) => void;
  disabled?: boolean;
}

export function MediaPreview({ file, onClear, onDimensions, disabled = false }: MediaPreviewProps) {
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  const media = useRef<HTMLImageElement | HTMLVideoElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [dimensions, setDimensions] = useState<MediaDimensions | null>(null);
  const Icon = isImage ? ImageIcon : isVideo ? Film : file.type.startsWith("audio/") ? Music2 : FileText;

  useEffect(() => {
    if (!isImage && !isVideo) return;
    const element = media.current;
    const url = URL.createObjectURL(file);
    if (element) element.src = url;
    return () => {
      element?.removeAttribute("src");
      URL.revokeObjectURL(url);
    };
  }, [file, isImage, isVideo]);

  const reportDimensions = (width: number, height: number) => {
    if (width > 0 && height > 0) {
      const value = { width, height };
      setDimensions(value);
      onDimensions?.(value);
    }
  };

  return (
    <div aria-label={`Selected attachment: ${file.name}`} className="mb-2 flex min-w-0 items-center gap-3 rounded-xl border border-border bg-surface p-2">
      <div className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-background">
        {!failed && isImage ? (
          <img ref={(element) => { media.current = element; }} alt={`Preview of ${file.name}`} onLoad={(event) => reportDimensions(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)} onError={() => setFailed(true)} className="h-full w-full object-contain" />
        ) : !failed && isVideo ? (
          <video ref={(element) => { media.current = element; }} muted playsInline preload="metadata" aria-label={`Preview of ${file.name}`} onLoadedMetadata={(event) => reportDimensions(event.currentTarget.videoWidth, event.currentTarget.videoHeight)} onError={() => setFailed(true)} className="h-full w-full object-contain" />
        ) : <Icon aria-hidden="true" className="h-6 w-6 text-accent" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">Attachment selected</p>
        <p title={file.name} className="mt-1 line-clamp-2 break-words text-xs font-semibold leading-5 text-text-primary [overflow-wrap:anywhere]">{file.name}</p>
        <p className="text-[10px] leading-5 text-text-secondary">{attachmentKind(file.name, file.type)} · {formatAttachmentSize(file.size)}{dimensions ? ` · ${dimensions.width} × ${dimensions.height} px` : ""}</p>
        {failed && <p role="status" className="text-[10px] text-text-secondary">Preview unavailable. The file is still selected.</p>}
      </div>
      <button type="button" aria-label="Remove attachment" disabled={disabled} onClick={onClear} className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-surface-container hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-95 disabled:cursor-not-allowed disabled:opacity-40">
        <X aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}
