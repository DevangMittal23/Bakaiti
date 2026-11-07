"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { User as UserIcon, AtSign, FileText, Loader2, Check, X } from "lucide-react";
import { updateProfile } from "@/actions/users";
import { useUpload } from "@/hooks/use-upload";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { User as UserType } from "@/types";
import { useEditProfile } from "./edit-profile-context";
import { useUsernameCheck } from "@/hooks/use-username-check";
import { AvatarUpload } from "./avatar-upload";
import { PulseSelectorInline } from "./pulse-selector-inline";
import { setPulse, clearPulse } from "@/actions/pulse";
import { motion } from "framer-motion";

interface EditProfileFormProps {
  profile: UserType;
}

export function EditProfileForm({ profile }: EditProfileFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    displayName,
    username,
    bio,
    avatarFile,
    selectedPulse,
    setDisplayName,
    setUsername,
    setBio,
  } = useEditProfile();

  const usernameStatus = useUsernameCheck(username, profile.id, profile.username);
  const { uploadFile, isUploading, progress } = useUpload();

  const statusConfig = {
    idle: null,
    checking: <Loader2 size={16} className="animate-spin text-text-muted" />,
    available: <Check size={16} className="text-green-400" />,
    taken: <X size={16} className="text-red-400" />,
    invalid: <X size={16} className="text-red-400" />,
  };

  const statusMessage = {
    idle: "Letters, numbers, and underscores only",
    checking: "Checking availability...",
    available: "Username is available",
    taken: "This username is already taken",
    invalid: "Must be 3-30 characters, letters/numbers/underscores only",
  };

  const bioLength = bio.length;
  const bioLimit = 160;

  const counterColor =
    bioLength >= 155
      ? "text-red-400"
      : bioLength >= 140
      ? "text-amber-400"
      : "text-text-muted";

  const isSaveDisabled =
    isPending ||
    isUploading ||
    usernameStatus === "taken" ||
    usernameStatus === "invalid" ||
    !displayName.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!displayName.trim()) {
      toast.error("Display name is required");
      return;
    }

    if (usernameStatus === "taken" || usernameStatus === "invalid") {
      toast.error("Please fix the username before saving");
      return;
    }

    startTransition(async () => {
      try {
        let finalAvatarUrl = profile.avatar_url;

        // Upload avatar file if a new one was selected
        if (avatarFile) {
          const ext = avatarFile.name.split(".").pop();
          const fileName = `${profile.id}/avatar_${Date.now()}.${ext}`;
          const uploadedUrl = await uploadFile("avatars", fileName, avatarFile);
          if (uploadedUrl) {
            finalAvatarUrl = uploadedUrl;
          } else {
            throw new Error("Failed to upload avatar");
          }
        }

        // Update core profile fields
        const profileResult = await updateProfile({
          display_name: displayName.trim(),
          username: username.trim(),
          bio: bio.trim() || null,
          avatar_url: finalAvatarUrl,
        });

        if (profileResult.error) {
          toast.error(profileResult.error);
          return;
        }

        // Sync inline pulse selection
        if (selectedPulse) {
          await setPulse(selectedPulse);
        } else {
          await clearPulse();
        }

        toast.success("Profile updated successfully!");
        router.push(`/profile/${username.trim()}`);
        router.refresh();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to save profile changes");
      }
    });
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-6">
      {/* Avatar Upload Container */}
      <div className="py-4 border-b border-white/[0.06]">
        <AvatarUpload displayName={displayName} />
        {isUploading && (
          <div className="mt-4 flex flex-col items-center gap-1.5 w-full">
            <div className="w-40 bg-border h-1 rounded-full overflow-hidden">
              <div
                className="bg-accent h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] text-text-muted font-medium">
              Uploading: {progress}%
            </span>
          </div>
        )}
      </div>

      {/* Display Name */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
          Display Name
        </label>
        <div className="relative">
          <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-text-muted" />
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value.slice(0, 50))}
            placeholder="Display Name"
            className="w-full rounded-lg border border-border bg-surface py-2.5 pl-10 pr-4 text-sm text-text-primary focus:border-accent focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Username */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
          Username
        </label>
        <div className="relative">
          <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-text-muted" />
          <input
            type="text"
            value={username}
            onChange={(e) =>
              setUsername(e.target.value.toLowerCase().slice(0, 30).replace(/[^a-zA-Z0-9_]/g, ""))
            }
            placeholder="username"
            className={`w-full rounded-lg border bg-surface py-2.5 pl-10 pr-10 text-sm text-text-primary focus:outline-none transition-colors ${
              usernameStatus === "taken" || usernameStatus === "invalid"
                ? "border-red-500/40 focus:border-red-500"
                : usernameStatus === "available"
                ? "border-green-500/40 focus:border-green-500"
                : "border-border focus:border-accent"
            }`}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {statusConfig[usernameStatus]}
          </div>
        </div>
        <p
          className={`text-xs mt-1.5 ${
            usernameStatus === "available"
              ? "text-green-400"
              : usernameStatus === "taken" || usernameStatus === "invalid"
              ? "text-red-400"
              : "text-text-muted"
          }`}
        >
          {statusMessage[usernameStatus]}
        </p>
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Bio
          </label>
          <motion.span
            key={bioLength}
            initial={{ scale: 1.15 }}
            animate={{ scale: 1 }}
            className={`text-xs tabular-nums font-medium ${counterColor}`}
          >
            {bioLength}/{bioLimit}
          </motion.span>
        </div>
        <div className="relative">
          <FileText className="absolute left-3 top-3.5 h-4.5 w-4.5 text-text-muted" />
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, bioLimit))}
            placeholder="Tell your circle what's happening..."
            rows={4}
            className="w-full rounded-lg border border-border bg-surface py-2.5 pl-10 pr-4 text-sm text-text-primary focus:border-accent focus:outline-none transition-colors resize-none"
          />
        </div>
      </div>

      {/* Embedded Pulse selector */}
      <PulseSelectorInline />

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full font-semibold cursor-pointer py-3 rounded-xl transition-colors disabled:opacity-50"
        variant="glow"
        disabled={isSaveDisabled}
      >
        {isPending ? (
          <span className="flex items-center gap-1.5">
            <Loader2 className="h-4.5 w-4.5 animate-spin" /> Saving Changes...
          </span>
        ) : (
          "Save Changes"
        )}
      </Button>
    </form>
  );
}
