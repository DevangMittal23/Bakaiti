import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validObjectPath } from "@/lib/media";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, context: { params: Promise<{ bucket: string; path: string[] }> }) {
  const { bucket, path: segments } = await context.params;
  const path = segments.join("/");
  if (!["message-media", "post-media"].includes(bucket) || !validObjectPath(path)) {
    return NextResponse.json({ error: "Invalid media path" }, { status: 400 });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Uses the user's JWT, so Storage RLS checks membership/post visibility on every read.
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
  if (error || !data?.signedUrl) return NextResponse.json({ error: "Media not found" }, { status: 404 });
  const response = NextResponse.redirect(data.signedUrl, 307);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Vary", "Cookie");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
