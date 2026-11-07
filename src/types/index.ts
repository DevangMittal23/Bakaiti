// src/types/index.ts — Bakaiti unified type definitions
// Every type maps 1:1 to the database schema

// ============================================================
// PULSE + SIGNAL SCORE TYPES
// ============================================================

export type PulseType = 'chill' | 'active' | 'busy' | 'hyped'

export type SignalTier = 'blazing' | 'warm' | 'steady' | 'quiet'

export type SignalScoreBreakdown = {
  posts: number
  likes_received: number
  comments_received: number
  comments_made: number
  messages_sent: number
  messages_received: number
  voice_notes: number
  friend_accepts: number
}

export type SignalScoreHistory = {
  id: string
  user_id: string
  score: number
  calculated_at: string
  breakdown: SignalScoreBreakdown
}

export const getSignalTier = (score: number): SignalTier => {
  if (score >= 800) return 'blazing'
  if (score >= 500) return 'warm'
  if (score >= 200) return 'steady'
  return 'quiet'
}

export const PULSE_CONFIG: Record<PulseType, {
  label: string
  color: string
  glowColor: string
  animationSpeed: string
  emoji: string
}> = {
  chill:  { label: 'Chill',  color: '#F59E0B', glowColor: 'rgba(245, 158, 11, 0.4)', animationSpeed: '3s',   emoji: '🌙' },
  active: { label: 'Active', color: '#A855F7', glowColor: 'rgba(168, 85, 247, 0.5)', animationSpeed: '2s',   emoji: '⚡' },
  busy:   { label: 'Busy',   color: '#3B82F6', glowColor: 'rgba(59, 130, 246, 0.4)', animationSpeed: '4s',   emoji: '🌊' },
  hyped:  { label: 'Hyped',  color: '#10B981', glowColor: 'rgba(16, 185, 129, 0.6)', animationSpeed: '1.2s', emoji: '🔥' },
}

export const SIGNAL_TIER_CONFIG: Record<SignalTier, {
  label: string
  ringColor: string
  textColor: string
}> = {
  blazing: { label: 'Blazing', ringColor: '#10B981', textColor: '#10B981' },
  warm:    { label: 'Warm',    ringColor: '#A855F7', textColor: '#A855F7' },
  steady:  { label: 'Steady',  ringColor: '#3B82F6', textColor: '#3B82F6' },
  quiet:   { label: 'Quiet',   ringColor: 'transparent', textColor: '#8B8B96' },
}

// ============================================================
// CORE TYPES
// ============================================================

export type User = {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  online_at: string
  created_at: string
  updated_at: string
  // Pulse fields
  pulse_type: PulseType | null
  pulse_expires_at: string | null
  pulse_set_at: string | null
  // Signal Score fields
  signal_score: number
  signal_score_updated_at: string
}

export type FriendshipStatus = 'pending' | 'accepted' | 'blocked'

export type Friendship = {
  id: string
  requester_id: string
  addressee_id: string
  status: FriendshipStatus
  created_at: string
  updated_at: string
  requester?: User
  addressee?: User
}

export type ConversationType = 'dm' | 'group'

export type Conversation = {
  id: string
  type: ConversationType
  name: string | null
  avatar_url: string | null
  created_by: string | null
  last_message_at: string
  created_at: string
  participants?: Participant[]
  last_message?: Message | null
  unread_count?: number
}

export type ParticipantRole = 'member' | 'admin'

export type Participant = {
  id: string
  conversation_id: string
  user_id: string
  role: ParticipantRole
  last_read_message_id: string | null
  joined_at: string
  user?: User
}

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'gif' | 'file' | 'system'

export type MediaMetadata = {
  width?: number
  height?: number
  duration?: number
  size?: number
  filename?: string
}

export type Message = {
  id: string
  conversation_id: string
  sender_id: string
  content: string | null
  type: MessageType
  media_url: string | null
  media_metadata: MediaMetadata | null
  gif_url: string | null
  reply_to_id: string | null
  is_edited: boolean
  is_deleted: boolean
  deleted_for: 'none' | 'me' | 'everyone'
  created_at: string
  updated_at: string
  sender?: User
  reply_to?: Message | null
  reactions?: MessageReaction[]
}

export type MessageReaction = {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
  user?: User
}

export type PostVisibility = 'public' | 'friends' | 'private'

export type Hashtag = {
  id: string
  name: string
  usage_count: number
}

export type LinkPreview = {
  title?: string
  description?: string
  image?: string
  domain?: string
}

export type Post = {
  id: string
  author_id: string
  content: string | null
  media_urls: string[]
  media_types: string[]
  link_url: string | null
  link_preview: LinkPreview | null
  visibility: PostVisibility
  likes_count: number
  comments_count: number
  reposts_count: number
  is_repost: boolean
  original_post_id: string | null
  created_at: string
  updated_at: string
  author?: User
  is_liked?: boolean
  is_bookmarked?: boolean
  original_post?: Post | null
}

export type Comment = {
  id: string
  post_id: string
  author_id: string
  content: string
  parent_comment_id: string | null
  likes_count: number
  created_at: string
  updated_at: string
  author?: User
  replies?: Comment[]
  is_liked?: boolean
}

export type NotificationType =
  | 'friend_request'
  | 'friend_accept'
  | 'post_like'
  | 'post_comment'
  | 'comment_like'
  | 'comment_reply'
  | 'mention'
  | 'message'
  | 'group_invite'
  | 'call_missed'

export type Notification = {
  id: string
  recipient_id: string
  actor_id: string | null
  type: NotificationType
  entity_id: string | null
  entity_type: 'post' | 'message' | 'comment' | 'conversation' | 'user' | null
  body: string | null
  is_read: boolean
  created_at: string
  actor?: User
}

export type Story = {
  id: string
  author_id: string
  media_url: string
  media_type: 'image' | 'video'
  caption: string | null
  views_count: number
  expires_at: string
  created_at: string
  author?: User
  is_viewed?: boolean
}

export type CallType = 'voice' | 'video'
export type CallStatus = 'ringing' | 'active' | 'ended' | 'missed' | 'rejected'

export type CallLog = {
  id: string
  room_name: string
  conversation_id: string | null
  initiated_by: string
  call_type: CallType
  status: CallStatus
  started_at: string | null
  ended_at: string | null
  duration_seconds: number | null
  created_at: string
  initiator?: User
}

// UI State types
export type ModalType =
  | 'create-post'
  | 'create-group'
  | 'group-info'
  | 'media-viewer'
  | 'gif-picker'
  | 'confirm-delete'
  | null

export type CallParticipant = Pick<User, "id" | "username" | "display_name" | "avatar_url">

export type ActiveCall = {
  roomName: string
  conversationId: string
  callType: CallType
  participants: CallParticipant[]
  token: string
}

export type IncomingCall = {
  roomName: string
  conversationId: string
  callType: CallType
  callerName: string
  callerAvatar: string | null
  participants: CallParticipant[]
}
