import { NextRequest, NextResponse } from "next/server";
import { signUp, signIn, verifySignupCode, resendSignupCode } from "@/actions/auth";
import { isAllowedAuthOrigin } from "@/lib/security/routes";
import type { AuthActionResult } from "@/lib/auth-errors";

export async function POST(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  if (!["signup", "login", "verify-signup", "resend-signup"].includes(action)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const respond = (result: AuthActionResult) => {
    const { status, ...body } = result;
    return NextResponse.json(body, {
      status: status ?? (result.error ? 400 : 200),
      headers: {
        "Cache-Control": "private, no-store",
        ...(result.retryAfter && result.error ? { "Retry-After": String(result.retryAfter) } : {}),
      },
    });
  };
  const origin = request.headers.get("origin");
  try {
    if (origin && !isAllowedAuthOrigin(origin, request.url)) {
      return respond({ error: "This app address is not allowed. Open Bakaiti using its configured URL and try again.", status: 403 });
    }
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return respond({ error: "Send a JSON request", status: 415 });
    }
    const reader = request.body?.getReader();
    if (!reader) return respond({ error: "Missing request body", status: 400 });
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 8192) {
        await reader.cancel();
        return respond({ error: "Request is too large", status: 413 });
      }
      chunks.push(value);
    }
    let input;
    try { input = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
    catch { return respond({ error: "Invalid request body", status: 400 }); }
    switch (action) {
      case "signup": return respond(await signUp(input));
      case "login": return respond(await signIn(input));
      case "verify-signup": return respond(await verifySignupCode(input));
      case "resend-signup": return respond(await resendSignupCode(input));
      default: return respond({ error: "Not found", status: 404 });
    }
  } catch {
    return respond({ error: "Authentication is temporarily unavailable. Please try again later.", status: 503 });
  }
}
