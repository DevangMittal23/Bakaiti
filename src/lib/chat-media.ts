export type MediaDimensions = { width: number; height: number };

export function formatAttachmentSize(bytes?: number) {
  if (bytes === undefined || !Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function attachmentKind(filename: string, mimeType = "") {
  if (mimeType.startsWith("image/")) return "Image";
  if (mimeType.startsWith("video/")) return "Video";
  if (mimeType.startsWith("audio/")) return "Audio";
  const extension = filename.split(".").pop();
  return extension && extension !== filename && /^[a-z0-9]{1,8}$/i.test(extension)
    ? extension.toUpperCase()
    : "File";
}

export function fitChatMedia(width?: number, height?: number, maxWidth = 320, maxHeight = 360): MediaDimensions | null {
  if (!width || !height || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  return { width: Math.max(1, Math.floor(width * scale)), height: Math.max(1, Math.floor(height * scale)) };
}
