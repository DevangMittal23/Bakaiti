import { z } from "zod";

// ============================================================
// AUTH VALIDATIONS
// ============================================================

export const emailSchema = z.string().trim().email("Please enter a valid email address").max(254);
export const usernameSchema = z.string().trim().min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores");

export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, "Password is required").max(1024),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  username: usernameSchema,
  display_name: z.string().trim().min(1, "Display name is required").max(50, "Display name must be at most 50 characters"),
  email: emailSchema,
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password is too long"),
});

export const registerSchema = signupSchema.extend({ confirm_password: z.string() })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords don't match",
    path: ["confirm_password"],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

export const signupCodeSchema = z.object({
  email: emailSchema,
  token: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from your email"),
});
export const resendSignupSchema = z.object({ email: emailSchema });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

// ============================================================
// POST VALIDATIONS
// ============================================================

export const createPostSchema = z.object({
  content: z
    .string()
    .max(2000, "Post content must be at most 2000 characters")
    .optional(),
  visibility: z.enum(["public", "friends", "private"]).default("public"),
  media_urls: z.array(z.string().url()).default([]),
  media_types: z.array(z.enum(["image", "video"])).default([]),
  link_url: z.string().url().optional().nullable(),
});

export type CreatePostFormData = z.infer<typeof createPostSchema>;

export const createCommentSchema = z.object({
  content: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(500, "Comment must be at most 500 characters"),
  parent_comment_id: z.string().uuid().optional().nullable(),
});

export type CreateCommentFormData = z.infer<typeof createCommentSchema>;

// ============================================================
// PROFILE VALIDATIONS
// ============================================================

export const editProfileSchema = z.object({
  display_name: z
    .string()
    .min(1, "Display name is required")
    .max(50, "Display name must be at most 50 characters"),
  bio: z
    .string()
    .max(160, "Bio must be at most 160 characters")
    .optional()
    .nullable(),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores"
    ),
});

export type EditProfileFormData = z.infer<typeof editProfileSchema>;

// ============================================================
// MESSAGE VALIDATIONS
// ============================================================

export const sendMessageSchema = z.object({
  content: z.string().optional(),
  type: z
    .enum(["text", "image", "video", "audio", "gif", "file", "system"])
    .default("text"),
  media_url: z.string().url().optional().nullable(),
  media_metadata: z
    .object({
      width: z.number().optional(),
      height: z.number().optional(),
      duration: z.number().optional(),
      size: z.number().optional(),
      filename: z.string().optional(),
    })
    .optional()
    .nullable(),
  gif_url: z.string().url().optional().nullable(),
  reply_to_id: z.string().uuid().optional().nullable(),
});

export type SendMessageFormData = z.infer<typeof sendMessageSchema>;

// ============================================================
// GROUP CHAT VALIDATIONS
// ============================================================

export const createGroupSchema = z.object({
  name: z
    .string()
    .min(1, "Group name is required")
    .max(100, "Group name must be at most 100 characters"),
  member_ids: z
    .array(z.string().uuid())
    .min(1, "At least one member is required"),
});

export type CreateGroupFormData = z.infer<typeof createGroupSchema>;

// ============================================================
// STORY VALIDATIONS
// ============================================================

export const createStorySchema = z.object({
  media_url: z.string().url("Media URL is required"),
  media_type: z.enum(["image", "video"]),
  caption: z
    .string()
    .max(200, "Caption must be at most 200 characters")
    .optional()
    .nullable(),
});

export type CreateStoryFormData = z.infer<typeof createStorySchema>;
