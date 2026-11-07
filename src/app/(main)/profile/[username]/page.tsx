import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getUserByUsername } from "@/actions/users";
import { getUserPosts } from "@/actions/posts";
import { createClient } from "@/lib/supabase/server";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileTabs } from "@/components/profile/profile-tabs";
import type { Post } from "@/types";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await getUserByUsername(username);

  if (!profile) {
    return { title: "User not found" };
  }

  return {
    title: `${profile.display_name} (@${profile.username})`,
    description:
      profile.bio || `Check out ${profile.display_name}'s profile on Bakaiti.`,
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const profile = await getUserByUsername(username);

  if (!profile) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOwnProfile = user?.id === profile.id;
  const { posts } = await getUserPosts(profile.id);

  return (
    <div className="space-y-6">
      <ProfileHeader profile={profile} isOwnProfile={isOwnProfile} />
      <ProfileTabs
        posts={posts as Post[]}
        userId={profile.id}
        isOwnProfile={isOwnProfile}
      />
    </div>
  );
}
