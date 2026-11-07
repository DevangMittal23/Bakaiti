import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { appOrigin, safeRedirectPath } from "@/lib/security/routes";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let origin: string;
  try { origin = appOrigin(request.url); }
  catch { return NextResponse.json({ error: "App URL is not configured" }, { status: 503 }); }
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // URL to redirect to after a failed sign-in
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
