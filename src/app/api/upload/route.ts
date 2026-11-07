import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { mediaReference, validateUpload } from "@/lib/media";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Bound the request before parsing multipart data, including requests without Content-Length.
    const reader = request.body?.getReader();
    if (!reader) return NextResponse.json({ error: "Missing upload body" }, { status: 400 });
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 51 * 1024 * 1024) {
        await reader.cancel();
        return NextResponse.json({ error: "Upload is too large" }, { status: 413 });
      }
      chunks.push(value);
    }
    const formData = await new Request(request.url, {
      method: "POST", headers: { "Content-Type": request.headers.get("Content-Type") || "" }, body: Buffer.concat(chunks),
    }).formData();
    const file = formData.get("file");
    const bucket = formData.get("bucket");
    const path = formData.get("path");

    if (!(file instanceof File) || typeof bucket !== "string" || typeof path !== "string") {
      return NextResponse.json(
        { error: "Missing file, bucket, or path" },
        { status: 400 }
      );
    }

    let contentType: string;
    try { contentType = validateUpload(bucket, path, file, user.id); }
    catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid upload" }, { status: 400 }); }

    const fileBuffer = await file.arrayBuffer();

    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, fileBuffer, {
        contentType,
        upsert: false,
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(path);

    return NextResponse.json({ url: bucket === "avatars" ? publicUrl : mediaReference(bucket, path) });
  } catch (err: unknown) {
    console.error("Upload failed", err instanceof Error ? err.name : "UnknownError");
    return NextResponse.json({ error: "Unable to upload file" }, { status: 400 });
  }
}
