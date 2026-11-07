const PRIVATE_BUCKETS = ["message-media", "post-media"];
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function validObjectPath(path: string) {
  return path.length <= 512 && /^[a-zA-Z0-9_./-]+$/.test(path) &&
    path.split("/").every((part) => part !== "" && part !== "." && part !== "..");
}

export function mediaReference(bucket: string, path: string) {
  return `/api/media/${bucket}/${path}`;
}

// Both legacy public URLs and new references use the same authenticated read endpoint.
export function mediaUrl(value: string) {
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!projectUrl || !value.startsWith("https://")) return value;
  try {
    const url = new URL(value);
    if (url.origin !== new URL(projectUrl).origin) return value;
    for (const bucket of PRIVATE_BUCKETS) {
      const prefix = `/storage/v1/object/public/${bucket}/`;
      if (url.pathname.startsWith(prefix)) return mediaReference(bucket, url.pathname.slice(prefix.length));
    }
  } catch { /* Keep unrelated external URLs intact. */ }
  return value;
}

export function validateUpload(bucket: string, path: string, file: { size: number; type: string }, userId: string) {
  if (!["avatars", ...PRIVATE_BUCKETS].includes(bucket) || !validObjectPath(path) || path.split("/")[0] !== userId) {
    throw new Error("Invalid upload destination");
  }
  const contentType = file.type.split(";")[0].trim().toLowerCase();
  const allowed = bucket === "avatars" ? IMAGE_TYPES : bucket === "post-media"
    ? [...IMAGE_TYPES, "video/mp4", "video/webm"]
    : [...IMAGE_TYPES, "video/mp4", "video/webm", "audio/webm", "audio/mp4", "application/pdf"];
  if (!allowed.includes(contentType)) throw new Error("Unsupported file type");
  const limit = (bucket === "avatars" ? 5 : 50) * 1024 * 1024;
  if (file.size <= 0 || file.size > limit) throw new Error(`File must be between 1 byte and ${limit / 1024 / 1024} MB`);
  return contentType;
}
