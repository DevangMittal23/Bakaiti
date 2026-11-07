import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import { EditProfileForm } from "@/components/profile/edit-profile-form";
import { EditProfileProvider } from "@/components/profile/edit-profile-context";
import { ProfilePreviewCard } from "@/components/profile/profile-preview-card";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Edit Profile",
  description:
    "Edit your Bakaiti profile — update your avatar, username, display name, and bio.",
};

export default async function EditProfilePage() {
  const profile = await getCurrentUser();

  if (!profile) {
    redirect("/login");
  }

  // Pre-load initial values
  const initial = {
    displayName: profile.display_name,
    username: profile.username,
    bio: profile.bio || "",
    avatarUrl: profile.avatar_url,
    pulseType: profile.pulse_type,
  };

  return (
    <EditProfileProvider initial={initial}>
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            href={`/profile/${profile.username}`}
            className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface hover:text-text-secondary cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-display text-text-primary">
              Edit Profile
            </h1>
            <p className="text-sm text-text-muted">
              Customize your Bakaiti identity
            </p>
          </div>
        </div>

        {/* Responsive Grid Panel Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
          {/* Left panel: Form */}
          <div className="order-2 lg:order-1">
            <EditProfileForm profile={profile} />
          </div>

          {/* Right panel: Preview (sticks on desktop, on top in mobile) */}
          <div className="order-1 lg:order-2 lg:sticky lg:top-6 lg:self-start">
            <ProfilePreviewCard
              userId={profile.id}
              avatarBaseUrl={profile.avatar_url}
            />
          </div>
        </div>
      </div>
    </EditProfileProvider>
  );
}
