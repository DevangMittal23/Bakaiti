// App-wide constants

export const APP_NAME = "Bakaiti";
export const APP_TAGLINE = "Where the chaos happens.";

// Pagination
export const POSTS_PER_PAGE = 10;
export const MESSAGES_PER_PAGE = 30;
export const CONVERSATIONS_PER_PAGE = 20;
export const NOTIFICATIONS_PER_PAGE = 20;
export const COMMENTS_PER_PAGE = 20;
export const SEARCH_RESULTS_PER_PAGE = 20;

// Media limits
export const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_POST_MEDIA_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_MESSAGE_MEDIA_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_POST_MEDIA_COUNT = 4;
export const MAX_POST_CONTENT_LENGTH = 2000;
export const MAX_COMMENT_LENGTH = 500;
export const MAX_BIO_LENGTH = 160;
export const MAX_STORY_CAPTION_LENGTH = 200;

// Content types
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"];
export const ALLOWED_AUDIO_TYPES = ["audio/webm", "audio/mp4"];

// Real-time channels
export const CHANNEL_PREFIX = {
  MESSAGES: "messages",
  TYPING: "typing",
  PRESENCE: "online-users",
  NOTIFICATIONS: "notifications",
  CALLS: "calls",
} as const;

// Storage buckets
export const STORAGE_BUCKETS = {
  AVATARS: "avatars",
  POST_MEDIA: "post-media",
  MESSAGE_MEDIA: "message-media",
} as const;

// Typing indicator debounce (ms)
export const TYPING_DEBOUNCE_MS = 1000;
export const TYPING_TIMEOUT_MS = 3000;

// Online presence threshold (minutes)
export const ONLINE_THRESHOLD_MINUTES = 5;

// Story duration (hours)
export const STORY_DURATION_HOURS = 24;

// Tenor GIF search
export const GIF_SEARCH_LIMIT = 20;
