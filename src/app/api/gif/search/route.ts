import { NextRequest, NextResponse } from "next/server";

type TenorResult = {
  id: string;
  title?: string;
  media_formats?: { gif?: { url?: string }; tinygif?: { url?: string } };
};

export async function GET(request: NextRequest) {
  const apiKey = process.env.TENOR_API_KEY;
  if (!apiKey || apiKey === "your_tenor_api_key") {
    return NextResponse.json(
      { error: "GIF search is currently unavailable." },
      { status: 503 },
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const requestedLimit = Number(searchParams.get("limit") || 20);
  const params = new URLSearchParams({
    q: searchParams.get("q")?.trim().slice(0, 200) || "reaction",
    key: apiKey,
    limit: String(
      Number.isFinite(requestedLimit)
        ? Math.min(50, Math.max(1, Math.floor(requestedLimit)))
        : 20,
    ),
    client_key: "bakaiti",
  });

  try {
    const response = await fetch(
      `https://tenor.googleapis.com/v2/search?${params}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!response.ok) throw new Error("GIF provider unavailable");
    const data: { results?: TenorResult[] } = await response.json();
    const results = (data.results || [])
      .map((item) => ({
        id: item.id,
        title: item.title || "GIF reaction",
        url: item.media_formats?.gif?.url || item.media_formats?.tinygif?.url || "",
        preview:
          item.media_formats?.tinygif?.url || item.media_formats?.gif?.url || "",
      }))
      .filter((gif) => gif.url && gif.preview);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: "GIF search could not load. Try again later." },
      { status: 502 },
    );
  }
}
