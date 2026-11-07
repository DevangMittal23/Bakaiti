import { NextRequest, NextResponse } from "next/server";
import ogs from "open-graph-scraper";
import { createClient } from "@/lib/supabase/server";
import { fetchPreviewHtml, previewUrl, resolvePublicAddress } from "@/lib/security/preview";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
    }

    const page = await fetchPreviewHtml(url);
    // Parse the bounded HTML only; the scraper must not make its own requests.
    const { error, result } = await ogs({ html: page.html });

    if (error) {
      return NextResponse.json({ error: "Failed to scrape URL metadata" }, { status: 500 });
    }

    const preview = {
      title: result.ogTitle || result.twitterTitle || "",
      description: result.ogDescription || result.twitterDescription || "",
      image: "",
      domain: page.url.hostname,
    };

    const image = result.ogImage?.[0]?.url || result.twitterImage?.[0]?.url;
    if (image) {
      try {
        const imageUrl = previewUrl(new URL(image, page.url).href);
        await resolvePublicAddress(imageUrl.hostname);
        preview.image = imageUrl.href;
      } catch { /* Ignore unsafe metadata URLs. */ }
    }

    return NextResponse.json(preview);
  } catch (err: unknown) {
    console.error("Link preview failed", err instanceof Error ? err.name : "UnknownError");
    return NextResponse.json({ error: "Unable to preview this public URL" }, { status: 422 });
  }
}
