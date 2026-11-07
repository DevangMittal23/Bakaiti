import type { Metadata } from "next";
import { getCurrentUser } from "@/actions/auth";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { User, Shield, Bell, Palette, ChevronRight, Edit3 } from "lucide-react";
import Link from "next/link";
import { UserAvatar } from "@/components/shared/user-avatar";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your Bakaiti account settings.",
};

export default async function SettingsPage() {
  const profile = await getCurrentUser();

  const settingSections = [
    {
      icon: User,
      title: "Edit Profile",
      description: "Update your avatar, username, and bio",
      href: "/settings/profile",
      accent: true,
    },
    {
      icon: Shield,
      title: "Privacy & Security",
      description: "See available privacy controls",
      href: "/settings/privacy",
    },
    {
      icon: Bell,
      title: "Notifications",
      description: "See available notification controls",
      href: "/settings/notifications",
    },
    {
      icon: Palette,
      title: "Appearance",
      description: "Customize your experience",
      href: "/settings/appearance",
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-sm text-text-secondary">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile summary card */}
      {profile && (
        <Link
          href="/settings/profile"
          className="group glass-card mb-6 flex items-center gap-4 p-5 transition-all duration-200 hover:shadow-xl hover:border-accent/20"
        >
          <div className="relative">
            <UserAvatar
              src={profile.avatar_url}
              name={profile.display_name}
              size="md"
              className="ring-2 ring-border group-hover:ring-accent/50 transition-all duration-200"
            />
            {/* Edit badge */}
            <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white shadow-md transition-transform group-hover:scale-110">
              <Edit3 className="h-3 w-3" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-text-primary truncate">
              {profile.display_name}
            </p>
            <p className="text-sm text-text-muted truncate">
              @{profile.username}
            </p>
            <p className="text-xs text-text-muted truncate mt-0.5">
              {profile.bio || "Tap to add a bio ✨"}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
        </Link>
      )}

      {/* Settings sections */}
      <div className="space-y-2">
        {settingSections.map((section) => {
          const content = (
            <>
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  section.accent
                    ? "bg-accent-subtle group-hover:bg-accent-muted"
                    : "bg-surface"
                }`}
              >
                <section.icon
                  className={`h-5 w-5 transition-colors ${
                    section.accent
                      ? "text-accent"
                      : "text-text-secondary group-hover:text-text-primary"
                  }`}
                />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">
                  {section.title}
                </p>
                <p className="text-xs text-text-muted">{section.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted transition-transform group-hover:translate-x-0.5" />
            </>
          );

          const sharedClassName = `glass-card flex w-full items-center gap-4 p-4 text-left transition-all duration-200 hover:bg-surface-hover group ${
            section.accent ? "hover:border-accent/20" : ""
          }`;

          return (
            <Link
              key={section.title}
              href={section.href}
              className={sharedClassName}
            >
              {content}
            </Link>
          );
        })}
      </div>

      {/* Sign out */}
      <SignOutButton />
    </div>
  );
}
